import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Promotion from '@/models/Promotion'
import { z } from 'zod'

const schema = z.object({
  code: z.string().min(1),
  subtotal: z.number().positive(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    await connectDB()
    const now = new Date()
    const promo = await Promotion.findOne({
      code: parsed.data.code.toUpperCase(),
      isActive: true,
      startsAt: { $lte: now },
      endsAt: { $gte: now },
      type: { $in: ['percentage', 'fixed'] },
    }).lean()

    if (!promo) {
      return NextResponse.json(
        { error: 'Invalid or expired coupon code' },
        { status: 400 }
      )
    }

    let discount = 0
    if (promo.type === 'percentage') {
      discount = (parsed.data.subtotal * promo.value) / 100
    } else if (promo.type === 'fixed') {
      discount = promo.value
    }

    discount = Math.min(discount, parsed.data.subtotal)

    return NextResponse.json({
      valid: true,
      discount: Math.round(discount * 100) / 100,
      type: promo.type,
      value: promo.value,
      title: promo.title,
    })
  } catch (error) {
    console.error('Coupon validation error:', error)
    return NextResponse.json({ error: 'Failed to validate coupon' }, { status: 500 })
  }
}
