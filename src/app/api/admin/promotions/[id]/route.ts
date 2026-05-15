import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Promotion from '@/models/Promotion'
import { z } from 'zod'

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  type: z.enum(['percentage', 'fixed', 'banner']).optional(),
  value: z.number().min(0).optional(),
  code: z.string().optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  isActive: z.boolean().optional(),
  appliesTo: z.enum(['all', 'category', 'item']).optional(),
})

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== 'admin') return null
  return session
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  }

  await connectDB()
  const update: Record<string, unknown> = { ...parsed.data }
  if (parsed.data.startsAt) update.startsAt = new Date(parsed.data.startsAt)
  if (parsed.data.endsAt) update.endsAt = new Date(parsed.data.endsAt)
  if (parsed.data.code) update.code = parsed.data.code.toUpperCase()

  const promo = await Promotion.findByIdAndUpdate(id, update, { new: true })
  if (!promo) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ promo })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await connectDB()
  await Promotion.findByIdAndDelete(id)
  return NextResponse.json({ success: true })
}
