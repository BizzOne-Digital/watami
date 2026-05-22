import { NextRequest, NextResponse } from 'next/server'
import stripe from '@/lib/stripe'
import { connectDB } from '@/lib/db'
import Order from '@/models/Order'
import MenuItem from '@/models/MenuItem'
import { sendMerchantOrderEmail, sendCustomerConfirmationEmail } from '@/lib/mailgun'

export const dynamic = 'force-dynamic'

/**
 * POST /api/payment/verify-session
 *
 * Called from the order-confirmation page as a reliable fallback to webhooks.
 * Retrieves the Stripe Checkout Session by ID, confirms payment_status === 'paid',
 * then marks the order paid in the DB (idempotent — safe to call multiple times).
 *
 * Body: { sessionId: string, orderNumber: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { sessionId, orderNumber } = await req.json()

    if (!sessionId || !orderNumber) {
      return NextResponse.json({ error: 'Missing sessionId or orderNumber' }, { status: 400 })
    }

    // Retrieve session directly from Stripe — source of truth
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid') {
      // Not paid yet — return current status without modifying DB
      return NextResponse.json({ paid: false, paymentStatus: session.payment_status })
    }

    await connectDB()

    const order = await Order.findOne({ orderNumber })
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Idempotency guard — already paid, nothing to do
    if (order.paymentStatus === 'paid') {
      return NextResponse.json({ paid: true, alreadyProcessed: true })
    }

    // Patch paymentIntentId if it was null at order creation time
    if (!order.paymentIntentId && session.payment_intent) {
      order.paymentIntentId = session.payment_intent as string
    }

    order.paymentStatus = 'paid'
    order.status = 'pending'
    await order.save()

    // Increment orderCount for each item
    for (const item of order.items) {
      await MenuItem.findByIdAndUpdate(item.menuItemId, {
        $inc: { orderCount: item.quantity },
      })
    }

    // Auto-update popular items (threshold: 10 orders)
    const POPULAR_THRESHOLD = 10
    const allItems = await MenuItem.find({ popularOverride: 'auto' }).lean()
    const maxOrderCount = Math.max(...allItems.map((i) => i.orderCount), 0)
    for (const item of allItems) {
      const shouldBePopular =
        item.orderCount >= POPULAR_THRESHOLD || item.orderCount >= maxOrderCount
      if (item.isPopular !== shouldBePopular) {
        await MenuItem.findByIdAndUpdate(item._id, { isPopular: shouldBePopular })
      }
    }

    // Send confirmation emails — fire-and-forget
    await Promise.allSettled([
      sendMerchantOrderEmail(order),
      sendCustomerConfirmationEmail(order),
    ])

    return NextResponse.json({ paid: true })
  } catch (error) {
    console.error('[verify-session] Error:', error)
    return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 })
  }
}
