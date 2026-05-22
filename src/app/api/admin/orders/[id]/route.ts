import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Order from '@/models/Order'
import { z } from 'zod'
import { sendOrderStatusEmailIfNeeded } from '@/lib/email/send-status-email'

const updateSchema = z.object({
  status: z.enum(['pending', 'accepted', 'preparing', 'ready_for_pickup', 'completed', 'cancelled']),
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

  // Capture previous status before update
  const existing = await Order.findById(id)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const previousStatus = existing.status

  existing.status = parsed.data.status
  await existing.save()

  // Send status email — fire-and-forget, never throws
  try {
    await sendOrderStatusEmailIfNeeded(existing, previousStatus)
  } catch (mailErr) {
    console.error('[admin/orders] sendOrderStatusEmailIfNeeded error:', mailErr)
  }

  return NextResponse.json({ order: existing })
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await connectDB()
  const order = await Order.findById(id).lean()
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ order })
}
