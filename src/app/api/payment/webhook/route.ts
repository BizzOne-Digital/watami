import { NextRequest, NextResponse } from 'next/server'
import stripe from '@/lib/stripe'
import { connectDB } from '@/lib/db'
import Order from '@/models/Order'
import MenuItem from '@/models/MenuItem'
import { sendPaidOrderEmails } from '@/lib/email/send-order-emails'

export const dynamic = 'force-dynamic'

/**
 * Find an order using all available keys, most-reliable first:
 *  1. metadata.orderId  (MongoDB _id — set at session creation, always present)
 *  2. paymentIntentId   (may be null at session creation for some configs)
 *  3. metadata.orderNumber (human-readable fallback)
 *  4. stripeCheckoutSessionId (session-level fallback)
 */
async function findOrder(
  paymentIntentId: string | null,
  metadata: Record<string, string> | null,
  stripeSessionId?: string
) {
  // 1. orderId in metadata — most reliable
  if (metadata?.orderId) {
    const o = await Order.findById(metadata.orderId)
    if (o) return o
  }
  // 2. paymentIntentId
  if (paymentIntentId) {
    const o = await Order.findOne({ paymentIntentId })
    if (o) return o
  }
  // 3. orderNumber in metadata
  if (metadata?.orderNumber) {
    const o = await Order.findOne({ orderNumber: metadata.orderNumber })
    if (o) return o
  }
  // 4. stripeCheckoutSessionId
  if (stripeSessionId) {
    const o = await Order.findOne({ stripeCheckoutSessionId: stripeSessionId })
    if (o) return o
  }
  return null
}

async function markOrderPaid(
  paymentIntentId: string | null,
  metadata: Record<string, string> | null,
  stripeSessionId?: string
) {
  const order = await findOrder(paymentIntentId, metadata, stripeSessionId)

  if (!order) {
    console.warn(
      `[Webhook] Order not found — PI: ${paymentIntentId}, ` +
      `orderId: ${metadata?.orderId}, orderNumber: ${metadata?.orderNumber}`
    )
    return
  }

  // Idempotency guard
  if (order.paymentStatus === 'paid') {
    console.log(`[Webhook] Order ${order.orderNumber} already paid — attempting emails only.`)
    try {
      await sendPaidOrderEmails(order, {
        stripeSessionId,
        stripePaymentIntentId: paymentIntentId ?? undefined,
      })
    } catch (mailErr) {
      console.error('[Webhook] sendPaidOrderEmails error (already paid):', mailErr)
    }
    return
  }

  // Patch missing ids
  if (!order.paymentIntentId && paymentIntentId) order.paymentIntentId = paymentIntentId
  if (!order.stripeCheckoutSessionId && stripeSessionId) order.stripeCheckoutSessionId = stripeSessionId

  order.status = 'pending'
  order.paymentStatus = 'paid'
  await order.save()

  // Increment orderCount
  for (const item of order.items) {
    await MenuItem.findByIdAndUpdate(item.menuItemId, { $inc: { orderCount: item.quantity } })
  }

  // Auto-update popular items
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
      stripeSessionId,
      stripePaymentIntentId: paymentIntentId ?? undefined,
    })
  } catch (mailErr) {
    console.error('[Webhook] sendPaidOrderEmails error:', mailErr)
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  await connectDB()

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    if (session.payment_status === 'paid') {
      await markOrderPaid(
        session.payment_intent as string | null,
        session.metadata as Record<string, string> | null,
        session.id
      )
    }
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object
    await markOrderPaid(
      pi.id,
      pi.metadata as Record<string, string> | null,
      undefined
    )
  }

  if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object
    // Try all lookup keys
    const order = await findOrder(pi.id, pi.metadata as Record<string, string> | null)
    if (order && order.paymentStatus !== 'paid') {
      order.paymentStatus = 'failed'
      order.status = 'cancelled'
      await order.save()
    }
  }

  return NextResponse.json({ received: true })
}
