import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Promotion from '@/models/Promotion'
import { z } from 'zod'

const promoSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  type: z.enum(['percentage', 'fixed', 'banner']),
  value: z.number().min(0).optional(),
  code: z.string().optional(),
  startsAt: z.string(),
  endsAt: z.string(),
  isActive: z.boolean().optional(),
  appliesTo: z.enum(['all', 'category', 'item']).optional(),
  categoryIds: z.array(z.string()).optional(),
  itemIds: z.array(z.string()).optional(),
})

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== 'admin') return null
  return session
}

export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const promotions = await Promotion.find().sort({ createdAt: -1 }).lean()
  return NextResponse.json({ promotions })
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = promoSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
  }

  await connectDB()
  const promo = await Promotion.create({
    ...parsed.data,
    startsAt: new Date(parsed.data.startsAt),
    endsAt: new Date(parsed.data.endsAt),
    code: parsed.data.code?.toUpperCase(),
  })
  return NextResponse.json({ promo }, { status: 201 })
}
