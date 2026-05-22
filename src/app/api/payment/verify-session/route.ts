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
 * Fallback verification endpoint — called by the server-side order-confirmation
 * page and optionally by client-side retries.
 * Looks up the order using orderId from session metadata (most reliable),
 * then falls back to orderNumber param.
 * Idempotent — safe to call multiple times.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    // Accept both { session_id } (reference spec) and { sessionId, orderNumber } (legacy)
    const sessionId: string = body.session_id ?? body.sessionId
    const orderNumberHint: string | undefined = body.orderNumber

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ success: false, paid: false, paymentStatus: session.payment_status })
    }

    await connectDB()

    // Find order — orderId in metadata is the most reliable key
    let order =
      session.metadata?.orderId
        ? await Order.findById(session.metadata.orderId)
        : null

    // Fallbacks
    if (!order && session.payment_intent) {
      order = await Order.findOne({ paymentIntentId: session.payment_intent as string })
    }
    if (!order && session.metadata?.orderNumber) {
      order = await Order.findOne({ orderNumber: session.metadata.orderNumber })
    }
    if (!order && orderNumberHint) {
      order = await Order.findOne({ orderNumber: orderNumberHint })
    }
    if (!order) {
      order = await Order.findOne({ stripeCheckoutSessionId: sessionId })
    }

    if (!order) {
      console.error(`[verify-session] Order not found for session ${sessionId}`)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Already paid — attempt emails idempotently
    if (order.paymentStatus === 'paid') {
      try {
        await sendPaidOrderEmails(order, {
          stripeSessionId: sessionId,
          stripePaymentIntentId: session.payment_intent as string | undefined,
        })
      } catch (mailErr) {
        console.error('[verify-session] sendPaidOrderEmails error (already paid):', mailErr)
      }
      return NextResponse.json({
        success: true,
        paid: true,
        alreadyProcessed: true,
        paymentStatus: 'paid',
        orderNumber: order.orderNumber,
        orderStatus: order.status,
      })
    }

    // Patch missing ids
    if (!order.paymentIntentId && session.payment_intent) {
      order.paymentIntentId = session.payment_intent as string
    }
    if (!order.stripeCheckoutSessionId) {
      order.stripeCheckoutSessionId = sessionId
    }

    order.paymentStatus = 'paid'
    order.status = 'pending'
    await order.save()

    for (const item of order.items) {
      await MenuItem.findByIdAndUpdate(item.menuItemId, { $inc: { orderCount: item.quantity } })
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

    return NextResponse.json({
      success: true,
      paid: true,
      paymentStatus: 'paid',
      orderNumber: order.orderNumber,
      orderStatus: order.status,
    })
  } catch (error) {
    console.error('[verify-session] Error:', error)
    return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 })
  }
}
