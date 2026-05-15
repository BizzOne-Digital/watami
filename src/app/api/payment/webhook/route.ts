import { NextRequest, NextResponse } from 'next/server'
import stripe from '@/lib/stripe'
import { connectDB } from '@/lib/db'
import Order from '@/models/Order'
import MenuItem from '@/models/MenuItem'
import { sendMerchantOrderEmail, sendCustomerConfirmationEmail } from '@/lib/mailgun'

export const dynamic = 'force-dynamic'

/**
 * Mark an order as paid by its paymentIntentId, update popular items,
 * then fire confirmation emails. Returns the updated order (or null if not found).
 */
async function markOrderPaid(paymentIntentId: string) {
  const order = await Order.findOne({ paymentIntentId })
  if (!order) {
    console.warn(`[Webhook] No order found for paymentIntentId: ${paymentIntentId}`)
    return
  }

  // Idempotency guard — don't re-process already-paid orders
  if (order.paymentStatus === 'paid') {
    console.log(`[Webhook] Order ${order.orderNumber} already marked paid — skipping.`)
    return
  }

  order.status = 'pending'
  order.paymentStatus = 'paid'
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

  // Send emails after payment confirmed — fire-and-forget, never throws
  await Promise.allSettled([
    sendMerchantOrderEmail(order),
    sendCustomerConfirmationEmail(order),
  ])
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: 'Missing signature or webhook secret' },
      { status: 400 }
    )
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
    if (session.payment_intent && session.payment_status === 'paid') {
      await markOrderPaid(session.payment_intent as string)
    }
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object
    await markOrderPaid(paymentIntent.id)
  }

  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object
    await Order.findOneAndUpdate(
      { paymentIntentId: paymentIntent.id },
      { paymentStatus: 'failed', status: 'cancelled' }
    )
  }

  return NextResponse.json({ received: true })
}
