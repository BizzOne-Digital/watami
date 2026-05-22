import { NextRequest, NextResponse } from 'next/server'
import stripe from '@/lib/stripe'
import { connectDB } from '@/lib/db'
import Order from '@/models/Order'
import MenuItem from '@/models/MenuItem'
import { sendPaidOrderEmails } from '@/lib/email/send-order-emails'

export const dynamic = 'force-dynamic'

async function markOrderPaid(paymentIntentId: string, orderNumberFallback?: string) {
  let order = await Order.findOne({ paymentIntentId })
  if (!order && orderNumberFallback) {
    order = await Order.findOne({ orderNumber: orderNumberFallback })
  }
  if (!order) {
    console.warn(
      `[Webhook] No order found for paymentIntentId: ${paymentIntentId}` +
      (orderNumberFallback ? ` / orderNumber: ${orderNumberFallback}` : '')
    )
    return
  }

  // Idempotency guard
  if (order.paymentStatus === 'paid') {
    console.log(`[Webhook] Order ${order.orderNumber} already paid — skipping mark.`)
    // Still attempt emails in case they weren't sent yet
    try {
      await sendPaidOrderEmails(order, { stripePaymentIntentId: paymentIntentId })
    } catch (mailErr) {
      console.error('[Webhook] sendPaidOrderEmails error (already paid):', mailErr)
    }
    return
  }

  if (!order.paymentIntentId) order.paymentIntentId = paymentIntentId

  order.status = 'pending'
  order.paymentStatus = 'paid'
  await order.save()

  // Increment orderCount
  for (const item of order.items) {
    await MenuItem.findByIdAndUpdate(item.menuItemId, {
      $inc: { orderCount: item.quantity },
    })
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

  // Send emails — idempotent, never throws
  try {
    await sendPaidOrderEmails(order, { stripePaymentIntentId: paymentIntentId })
  } catch (mailErr) {
    console.error('[Webhook] sendPaidOrderEmails error:', mailErr)
  }
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
      await markOrderPaid(
        session.payment_intent as string,
        session.metadata?.orderNumber
      )
    } else if (!session.payment_intent && session.payment_status === 'paid' && session.metadata?.orderNumber) {
      const order = await Order.findOne({ orderNumber: session.metadata.orderNumber })
      if (order && order.paymentStatus !== 'paid') {
        order.status = 'pending'
        order.paymentStatus = 'paid'
        await order.save()
        try {
          await sendPaidOrderEmails(order, { stripeSessionId: session.id })
        } catch (mailErr) {
          console.error('[Webhook] sendPaidOrderEmails error (no PI):', mailErr)
        }
      }
    }
  }

  if (event.type === 'payment_intent.succeeded') {
    await markOrderPaid(event.data.object.id)
  }

  if (event.type === 'payment_intent.payment_failed') {
    await Order.findOneAndUpdate(
      { paymentIntentId: event.data.object.id },
      { paymentStatus: 'failed', status: 'cancelled' }
    )
  }

  return NextResponse.json({ received: true })
}
