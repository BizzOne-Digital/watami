import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Order from '@/models/Order'
import MenuItem from '@/models/MenuItem'
import User from '@/models/User'
import Promotion from '@/models/Promotion'

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== 'admin') return null
  return session
}

export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const now = new Date()

  const [
    totalOrders,
    revenueResult,
    popularItems,
    recentOrders,
    activePromotions,
    blockedUsers,
    totalUsers,
  ] = await Promise.all([
    Order.countDocuments(),
    Order.aggregate([
      { $match: { status: { $nin: ['cancelled'] } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    MenuItem.find({ isPopular: true }).select('name orderCount price').limit(10).lean(),
    Order.find().sort({ createdAt: -1 }).limit(10).lean(),
    Promotion.countDocuments({ isActive: true, startsAt: { $lte: now }, endsAt: { $gte: now } }),
    User.countDocuments({ status: 'blocked' }),
    User.countDocuments(),
  ])

  const revenue = revenueResult[0]?.total ?? 0

  return NextResponse.json({
    totalOrders,
    revenue,
    popularItems,
    recentOrders,
    activePromotions,
    blockedUsers,
    totalUsers,
  })
}
