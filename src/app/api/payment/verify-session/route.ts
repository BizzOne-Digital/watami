import { NextRequest, NextResponse } from 'next/server'
import stripe from '@/lib/stripe'
import { connectDB } from '@/lib/db'
import Order from '@/models/Order'
import MenuItem from '@/models/MenuItem'
import { sendPaidOrderEmails } from '@/lib/email/send-order-emails'

export const dynamic = 'force-dynamic'

/**
 * POST /api/payment/verify-session
 *
 * Secondary fallback — called when the server-side order-confirmation page
 * cannot run (e.g. static export, edge runtime). Verifies payment with Stripe
 * and marks the order paid. Idempotent.
 */
export async function POST(req: NextRequest) {
  try {
    const { sessionId, orderNumber } = await req.json()

    if (!sessionId || !orderNumber) {
      return NextResponse.json({ error: 'Missing sessionId or orderNumber' }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ paid: false, paymentStatus: session.payment_status })
    }

    await connectDB()

    const order = await Order.findOne({ orderNumber })
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Already paid — attempt emails idempotently and return
    if (order.paymentStatus === 'paid') {
      try {
        await sendPaidOrderEmails(order, {
          stripeSessionId: sessionId,
          stripePaymentIntentId: session.payment_intent as string | undefined,
        })
      } catch (mailErr) {
        console.error('[verify-session] sendPaidOrderEmails error (already paid):', mailErr)
      }
      return NextResponse.json({ paid: true, alreadyProcessed: true })
    }

    if (!order.paymentIntentId && session.payment_intent) {
      order.paymentIntentId = session.payment_intent as string
    }

    order.paymentStatus = 'paid'
    order.status = 'pending'
    await order.save()

    for (const item of order.items) {
      await MenuItem.findByIdAndUpdate(item.menuItemId, {
        $inc: { orderCount: item.quantity },
      })
    }

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

    try {
      await sendPaidOrderEmails(order, {
        stripeSessionId: sessionId,
        stripePaymentIntentId: session.payment_intent as string | undefined,
      })
    } catch (mailErr) {
      console.error('[verify-session] sendPaidOrderEmails error:', mailErr)
    }

    return NextResponse.json({ paid: true })
  } catch (error) {
    console.error('[verify-session] Error:', error)
    return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 })
  }
}
