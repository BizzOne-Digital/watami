import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Order from '@/models/Order'

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== 'admin') return null
  return session
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const status = searchParams.get('status')
  const search = searchParams.get('search') ?? ''
  const since = searchParams.get('since')

  await connectDB()

  const query: Record<string, unknown> = {}
  if (status) query.status = status
  if (since) query.createdAt = { $gt: new Date(since) }
  const pickupType = searchParams.get('pickupType')
  if (pickupType) query.pickupType = pickupType
  if (search) {
    query.$or = [
      { orderNumber: { $regex: search, $options: 'i' } },
      { customerName: { $regex: search, $options: 'i' } },
      { customerEmail: { $regex: search, $options: 'i' } },
    ]
  }

  const total = await Order.countDocuments(query)
  const orders = await Order.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean()

  return NextResponse.json({ orders, total, page, limit })
}
