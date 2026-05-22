import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import stripe from '@/lib/stripe'
import Order from '@/models/Order'
import Promotion from '@/models/Promotion'
import RestaurantSettings from '@/models/RestaurantSettings'
import { generateOrderNumber } from '@/lib/utils'
import {
  calculateAsapPickupTime,
  validateScheduledPickup,
  formatPickupTime,
} from '@/lib/pickup'
import { z } from 'zod'

const orderItemSchema = z.object({
  menuItemId: z.string(),
  name: z.string(),
  price: z.number().positive(),
  quantity: z.number().int().positive(),
  specialInstructions: z.string().optional(),
})

const schema = z.object({
  customerName: z.string().min(2).max(100),
  customerPhone: z.string().min(8).max(20),
  customerEmail: z.string().email(),
  items: z.array(orderItemSchema).min(1),
  couponCode: z.string().optional(),
  tipPercentage: z.number().min(0).max(100).default(0),
  pickupType: z.enum(['asap', 'scheduled']),
  requestedPickupTime: z.string().datetime().optional().nullable(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const {
      customerName, customerPhone, customerEmail,
      items, couponCode, tipPercentage,
      pickupType, requestedPickupTime,
    } = parsed.data

    await connectDB()

    const settings = await RestaurantSettings.findOne().lean()
    if (!settings) {
      return NextResponse.json({ error: 'Restaurant not configured' }, { status: 500 })
    }
    if (!settings.pickupEnabled) {
      return NextResponse.json({ error: 'Pickup ordering is currently disabled.' }, { status: 400 })
    }

    const now = new Date()

    let estimatedPickupTime: Date | null = null
    let resolvedRequestedTime: Date | null = null
    let pickupWindowLabel = 'ASAP'

    if (pickupType === 'asap') {
      if (!settings.asapPickupEnabled) {
        return NextResponse.json({ error: 'ASAP pickup is currently unavailable.' }, { status: 400 })
      }
      const asap = calculateAsapPickupTime(settings, now)
      if (!asap) {
        return NextResponse.json({
          error: 'We are currently closed. Please select a scheduled pickup time.',
        }, { status: 400 })
      }
      estimatedPickupTime = asap.time
      pickupWindowLabel = `ASAP (${asap.label})`
    } else {
      if (!settings.scheduledPickupEnabled) {
        return NextResponse.json({ error: 'Scheduled pickup is currently unavailable.' }, { status: 400 })
      }
      if (!requestedPickupTime) {
        return NextResponse.json({ error: 'Please select a pickup time.' }, { status: 400 })
      }
      resolvedRequestedTime = new Date(requestedPickupTime)
      const validationError = validateScheduledPickup(resolvedRequestedTime, settings, now)
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 })
      }
      pickupWindowLabel = formatPickupTime(resolvedRequestedTime)
    }

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

    let discountAmount = 0
    if (couponCode) {
      const promo = await Promotion.findOne({
        code: couponCode.toUpperCase(),
        isActive: true,
        startsAt: { $lte: now },
        endsAt: { $gte: now },
        type: { $in: ['percentage', 'fixed'] },
      }).lean()

      if (promo) {
        discountAmount = promo.type === 'percentage'
          ? (subtotal * promo.value) / 100
          : promo.value
        discountAmount = Math.min(discountAmount, subtotal)
        discountAmount = Math.round(discountAmount * 100) / 100
      }
    }

    const afterDiscount = Math.max(0, subtotal - discountAmount)
    const tipAmount = Math.round(afterDiscount * (tipPercentage / 100) * 100) / 100
    const total = Math.round((afterDiscount + tipAmount) * 100) / 100
    const orderNumber = generateOrderNumber()

    const origin = req.headers.get('origin') ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

    // ── Step 1: Create Order in DB FIRST so we have _id for Stripe metadata ──
    // This guarantees the lookup key exists before Stripe session is created.
    const order = await Order.create({
      orderNumber,
      customerName,
      customerPhone,
      customerEmail,
      items: items.map((item) => ({
        menuItemId: item.menuItemId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        specialInstructions: item.specialInstructions,
      })),
      subtotal: Math.round(subtotal * 100) / 100,
      discountAmount,
      tipPercentage,
      tipAmount,
      total,
      couponCode: couponCode?.toUpperCase(),
      pickupOnly: true,
      pickupType,
      requestedPickupTime: resolvedRequestedTime,
      estimatedPickupTime,
      pickupWindowLabel,
      status: 'pending_payment',
      paymentStatus: 'unpaid',
      // paymentIntentId and stripeCheckoutSessionId filled in below
    })

    // ── Step 2: Build Stripe line items ──────────────────────────────────────
    const stripeLineItems = items.map((item) => ({
      price_data: {
        currency: 'aud',
        product_data: { name: item.name },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    })) as {
      price_data: { currency: string; product_data: { name: string }; unit_amount: number }
      quantity: number
    }[]

    if (discountAmount > 0) {
      stripeLineItems.push({
        price_data: {
          currency: 'aud',
          product_data: { name: `Discount (${couponCode?.toUpperCase() ?? 'coupon'})` },
          unit_amount: -Math.round(discountAmount * 100),
        },
        quantity: 1,
      })
    }

    if (tipAmount > 0) {
      stripeLineItems.push({
        price_data: {
          currency: 'aud',
          product_data: { name: `Tip (${tipPercentage}%)` },
          unit_amount: Math.round(tipAmount * 100),
        },
        quantity: 1,
      })
    }

    // ── Step 3: Create Stripe session with orderId + orderNumber in metadata ─
    // Both keys are stored so webhook/verify-session can find the order
    // regardless of whether payment_intent is populated at session creation.
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: customerEmail,
      line_items: stripeLineItems,
      metadata: {
        orderId: order._id.toString(),      // MongoDB _id — primary lookup key
        orderNumber,                         // human-readable fallback
        customerName,
        customerEmail,
        customerPhone,
        pickupType,
        pickupWindowLabel,
      },
      payment_intent_data: {
        metadata: {
          orderId: order._id.toString(),
          orderNumber,
          customerName,
          customerEmail,
          customerPhone,
        },
        receipt_email: customerEmail,
        description: `Watami order ${orderNumber} — ${pickupWindowLabel}`,
      },
      success_url: `${origin}/order-confirmation?order=${orderNumber}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout`,
    })

    // ── Step 4: Patch order with Stripe session id + payment intent id ───────
    // payment_intent may be null here for some Stripe configs — that's OK,
    // we now have orderId in metadata as the guaranteed lookup key.
    order.stripeCheckoutSessionId = session.id
    if (session.payment_intent) {
      order.paymentIntentId = session.payment_intent as string
    }
    await order.save()

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout session error:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
