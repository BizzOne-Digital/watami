import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { connectDB } from '@/lib/db'
import Order from '@/models/Order'
import MenuItem from '@/models/MenuItem'
import User from '@/models/User'
import Promotion from '@/models/Promotion'
import { formatCurrency } from '@/lib/utils'
import { ShoppingBag, DollarSign, Star, Users, Megaphone, TrendingUp } from 'lucide-react'

export const dynamic = 'force-dynamic'

async function getDashboardData() {
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
    MenuItem.find({ isPopular: true }).select('name orderCount price').limit(5).lean(),
    Order.find().sort({ createdAt: -1 }).limit(8).lean(),
    Promotion.countDocuments({ isActive: true, startsAt: { $lte: now }, endsAt: { $gte: now } }),
    User.countDocuments({ status: 'blocked' }),
    User.countDocuments(),
  ])
  return {
    totalOrders,
    revenue: revenueResult[0]?.total ?? 0,
    popularItems,
    recentOrders,
    activePromotions,
    blockedUsers,
    totalUsers,
  }
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  accepted: 'bg-blue-100 text-blue-700',
  preparing: 'bg-orange-100 text-orange-700',
  ready_for_pickup: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
}

export default async function AdminDashboard() {
  const session = await auth()
  if (!session || session.user?.role !== 'admin') redirect('/admin/login')

  const data = await getDashboardData()

  const stats = [
    { label: 'Total Orders', value: data.totalOrders, icon: ShoppingBag, color: 'bg-burgundy' },
    { label: 'Total Revenue', value: formatCurrency(data.revenue), icon: DollarSign, color: 'bg-green-600' },
    { label: 'Active Promotions', value: data.activePromotions, icon: Megaphone, color: 'bg-orange' },
    { label: 'Total Users', value: data.totalUsers, icon: Users, color: 'bg-blue-600' },
  ]

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-charcoal">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back, {session.user?.name}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-2xl font-bold text-charcoal">{stat.value}</p>
              <p className="text-gray-500 text-sm mt-0.5">{stat.label}</p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-bold text-charcoal mb-4 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-burgundy" />
            Recent Orders
          </h2>
          {data.recentOrders.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No orders yet</p>
          ) : (
            <div className="space-y-3">
              {data.recentOrders.map((order) => (
                <div key={order._id.toString()} className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="min-w-0">
                    <p className="font-medium text-charcoal text-sm truncate">{order.customerName}</p>
                    <p className="text-gray-400 text-xs font-mono">{order.orderNumber}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-semibold text-sm text-charcoal">{formatCurrency(order.total)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Popular Items */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-bold text-charcoal mb-4 flex items-center gap-2">
            <Star className="w-4 h-4 text-orange fill-orange" />
            Popular Items
          </h2>
          {data.popularItems.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No popular items yet</p>
          ) : (
            <div className="space-y-3">
              {data.popularItems.map((item) => (
                <div key={item._id.toString()} className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg">🍱</span>
                    <div className="min-w-0">
                      <p className="font-medium text-charcoal text-sm truncate">{item.name}</p>
                      <p className="text-gray-400 text-xs">{item.orderCount} orders</p>
                    </div>
                  </div>
                  <span className="font-semibold text-burgundy text-sm flex-shrink-0">{formatCurrency(item.price)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Alerts */}
      {data.blockedUsers > 0 && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <Users className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm">
            <strong>{data.blockedUsers}</strong> user{data.blockedUsers > 1 ? 's are' : ' is'} currently blocked.
          </p>
        </div>
      )}
    </div>
  )
}
