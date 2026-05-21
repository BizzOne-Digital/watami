import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import stripe from '@/lib/stripe'
import Order from '@/models/Order'
import Promotion from '@/models/Promotion'
import { generateOrderNumber } from '@/lib/utils'
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

    const { customerName, customerPhone, customerEmail, items, couponCode, tipPercentage } = parsed.data

    await connectDB()

    // Calculate subtotal
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

    // Validate coupon
    let discountAmount = 0
    if (couponCode) {
      const now = new Date()
      const promo = await Promotion.findOne({
        code: couponCode.toUpperCase(),
        isActive: true,
        startsAt: { $lte: now },
        endsAt: { $gte: now },
        type: { $in: ['percentage', 'fixed'] },
      }).lean()

      if (promo) {
        discountAmount =
          promo.type === 'percentage'
            ? (subtotal * promo.value) / 100
            : promo.value
        discountAmount = Math.min(discountAmount, subtotal)
        discountAmount = Math.round(discountAmount * 100) / 100
      }
    }

    // Calculate tip on subtotal after discount
    const afterDiscount = Math.max(0, subtotal - discountAmount)
    const tipAmount = Math.round(afterDiscount * (tipPercentage / 100) * 100) / 100
    const total = Math.round((afterDiscount + tipAmount) * 100) / 100
    const orderNumber = generateOrderNumber()

    // Build the origin for redirect URLs
    const origin = req.headers.get('origin') ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

    // Build line items for Stripe Checkout
    const lineItems = items.map((item) => ({
      price_data: {
        currency: 'aud',
        product_data: {
          name: item.name,
        },
        // Stripe requires integer cents
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }))

    // Add discount as a negative line item if applicable
    const stripeLineItems: typeof lineItems = [...lineItems]
    if (discountAmount > 0) {
      stripeLineItems.push({
        price_data: {
          currency: 'aud',
          product_data: {
            name: `Discount (${couponCode?.toUpperCase() ?? 'coupon'})`,
          },
          unit_amount: -Math.round(discountAmount * 100),
        },
        quantity: 1,
      })
    }

    // Add tip as a line item if applicable
    if (tipAmount > 0) {
      stripeLineItems.push({
        price_data: {
          currency: 'aud',
          product_data: {
            name: `Tip (${tipPercentage}%)`,
          },
          unit_amount: Math.round(tipAmount * 100),
        },
        quantity: 1,
      })
    }

    // Create Stripe Checkout Session (hosted payment page)
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: customerEmail,
      line_items: stripeLineItems,
      metadata: {
        orderNumber,
        customerName,
        customerEmail,
        customerPhone,
      },
      payment_intent_data: {
        metadata: {
          orderNumber,
          customerName,
          customerEmail,
          customerPhone,
        },
        receipt_email: customerEmail,
        description: `Watami order ${orderNumber}`,
      },
      success_url: `${origin}/order-confirmation?order=${orderNumber}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout`,
    })

    // Save order as pending_payment before redirecting
    await Order.create({
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
      status: 'pending_payment',
      paymentIntentId: session.payment_intent as string,
      paymentStatus: 'unpaid',
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout session error:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
