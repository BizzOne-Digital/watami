'use client'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Search, RefreshCw, ChevronLeft, ChevronRight, Zap, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'

const STATUS_OPTIONS = ['all', 'pending_payment', 'pending', 'accepted', 'preparing', 'ready_for_pickup', 'completed', 'cancelled']
const PICKUP_FILTER_OPTIONS = ['all', 'asap', 'scheduled']

const STATUS_COLORS: Record<string, string> = {
  pending_payment: 'bg-purple-100 text-purple-700',
  pending: 'bg-yellow-100 text-yellow-700',
  accepted: 'bg-blue-100 text-blue-700',
  preparing: 'bg-orange-100 text-orange-700',
  ready_for_pickup: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
}

interface Order {
  _id: string
  orderNumber: string
  customerName: string
  customerPhone: string
  customerEmail: string
  total: number
  subtotal: number
  discountAmount: number
  tipAmount: number
  status: string
  items: { name: string; quantity: number; price: number; specialInstructions?: string }[]
  createdAt: string
  couponCode?: string
  pickupType?: 'asap' | 'scheduled'
  requestedPickupTime?: string | null
  estimatedPickupTime?: string | null
  pickupWindowLabel?: string
}

function PickupBadge({ order }: { order: Order }) {
  if (order.pickupType === 'scheduled' && order.requestedPickupTime) {
    const t = new Date(order.requestedPickupTime)
    const label = t.toLocaleString('en-AU', {
      timeZone: 'Australia/Melbourne',
      month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    })
    return (
      <div className="flex items-center gap-1 text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded-full whitespace-nowrap">
        <Clock className="w-3 h-3" /> {label}
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1 text-xs text-orange-700 bg-orange-50 px-2 py-1 rounded-full whitespace-nowrap">
      <Zap className="w-3 h-3" /> ASAP
    </div>
  )
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [pickupFilter, setPickupFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (search) params.set('search', search)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (pickupFilter !== 'all') params.set('pickupType', pickupFilter)
      const res = await fetch(`/api/admin/orders?${params}`)
      const data = await res.json()
      setOrders(data.orders ?? [])
      setTotal(data.total ?? 0)
    } catch {
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter, pickupFilter])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error()
      toast.success('Order status updated')
      fetchOrders()
    } catch {
      toast.error('Failed to update status')
    }
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Orders</h1>
          <p className="text-gray-500 text-sm">{total} total orders</p>
        </div>
        <Button onClick={fetchOrders} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by order number, name, email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{s === 'all' ? 'All Statuses' : s.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={pickupFilter} onValueChange={(v) => { setPickupFilter(v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="All pickup types" />
          </SelectTrigger>
          <SelectContent>
            {PICKUP_FILTER_OPTIONS.map((p) => (
              <SelectItem key={p} value={p}>
                {p === 'all' ? 'All Pickups' : p === 'asap' ? '⚡ ASAP' : '🕐 Scheduled'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-gray-400">No orders found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Order</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Customer</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Pickup</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Total</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((order) => (
                  <>
                    <tr
                      key={order._id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setExpandedOrder(expandedOrder === order._id ? null : order._id)}
                    >
                      <td className="px-4 py-3">
                        <code className="font-mono text-xs text-burgundy">{order.orderNumber}</code>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-charcoal">{order.customerName}</p>
                        <p className="text-gray-400 text-xs">{order.customerPhone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <PickupBadge order={order} />
                      </td>
                      <td className="px-4 py-3 font-semibold text-charcoal">{formatCurrency(order.total)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {order.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs hidden sm:table-cell">
                        {new Date(order.createdAt).toLocaleDateString('en-AU')}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <Select value={order.status} onValueChange={(v) => updateStatus(order._id, v)}>
                          <SelectTrigger className="h-8 text-xs w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.filter(s => s !== 'all').map((s) => (
                              <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>

                    {/* Expanded detail row */}
                    {expandedOrder === order._id && (
                      <tr key={`${order._id}-exp`} className="bg-cream">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* Items */}
                            <div>
                              <p className="font-semibold text-charcoal text-xs mb-2">Order Items</p>
                              <div className="space-y-1">
                                {order.items.map((item, i) => (
                                  <div key={i} className="text-xs text-gray-600">
                                    <div className="flex justify-between">
                                      <span>{item.name} x{item.quantity}</span>
                                      <span>{formatCurrency(item.price * item.quantity)}</span>
                                    </div>
                                    {item.specialInstructions && (
                                      <p className="text-gray-400 italic ml-2">↳ {item.specialInstructions}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                              {order.couponCode && (
                                <p className="text-xs text-green-600 mt-2">
                                  Coupon: {order.couponCode} (-{formatCurrency(order.discountAmount)})
                                </p>
                              )}
                              <div className="mt-2 pt-2 border-t border-gray-200 text-xs space-y-0.5">
                                <div className="flex justify-between text-gray-500">
                                  <span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span>
                                </div>
                                {order.tipAmount > 0 && (
                                  <div className="flex justify-between text-gray-500">
                                    <span>Tip</span><span>+{formatCurrency(order.tipAmount)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between font-semibold text-charcoal">
                                  <span>Total</span><span>{formatCurrency(order.total)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Customer */}
                            <div>
                              <p className="font-semibold text-charcoal text-xs mb-2">Customer</p>
                              <p className="text-xs text-gray-600">{order.customerName}</p>
                              <p className="text-xs text-gray-600">{order.customerPhone}</p>
                              <p className="text-xs text-gray-600">{order.customerEmail}</p>
                            </div>

                            {/* Pickup detail */}
                            <div>
                              <p className="font-semibold text-charcoal text-xs mb-2">Pickup Details</p>
                              <div className="text-xs text-gray-600 space-y-1">
                                <p>
                                  <span className="font-medium">Type: </span>
                                  {order.pickupType === 'scheduled' ? '🕐 Scheduled' : '⚡ ASAP'}
                                </p>
                                {order.pickupType === 'scheduled' && order.requestedPickupTime && (
                                  <p>
                                    <span className="font-medium">Requested: </span>
                                    {new Date(order.requestedPickupTime).toLocaleString('en-AU', {
                                      timeZone: 'Australia/Melbourne',
                                      weekday: 'short', month: 'short', day: 'numeric',
                                      hour: 'numeric', minute: '2-digit', hour12: true,
                                    })}
                                  </p>
                                )}
                                {order.pickupType === 'asap' && order.estimatedPickupTime && (
                                  <p>
                                    <span className="font-medium">Est. time: </span>
                                    {new Date(order.estimatedPickupTime).toLocaleTimeString('en-AU', {
                                      timeZone: 'Australia/Melbourne',
                                      hour: 'numeric', minute: '2-digit', hour12: true,
                                    })}
                                  </p>
                                )}
                                {order.pickupWindowLabel && (
                                  <p>
                                    <span className="font-medium">Label: </span>
                                    {order.pickupWindowLabel}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
