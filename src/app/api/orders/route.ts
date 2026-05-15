import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Order from '@/models/Order'
import MenuItem from '@/models/MenuItem'
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

const orderSchema = z.object({
  customerName: z.string().min(2).max(100),
  customerPhone: z.string().min(8).max(20),
  customerEmail: z.string().email(),
  items: z.array(orderItemSchema).min(1),
  couponCode: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = orderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid order data', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    await connectDB()

    const { customerName, customerPhone, customerEmail, items, couponCode } = parsed.data

    // Calculate subtotal
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

    // Validate coupon if provided
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
        if (promo.type === 'percentage') {
          discountAmount = (subtotal * promo.value) / 100
        } else {
          discountAmount = promo.value
        }
        discountAmount = Math.min(discountAmount, subtotal)
        discountAmount = Math.round(discountAmount * 100) / 100
      }
    }

    const total = Math.max(0, subtotal - discountAmount)
    const orderNumber = generateOrderNumber()

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
      total: Math.round(total * 100) / 100,
      couponCode: couponCode?.toUpperCase(),
      pickupOnly: true,
      status: 'pending',
    })

    // Increment orderCount for each item and update popular status
    const itemIds = items.map((i) => i.menuItemId)
    for (const item of items) {
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

    return NextResponse.json({ order: { orderNumber: order.orderNumber, _id: order._id, status: order.status, total: order.total } }, { status: 201 })
  } catch (error) {
    console.error('Order creation error:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}
