'use client'
import { useState, useEffect, useCallback, Fragment, useRef } from 'react'
import { toast } from 'sonner'
import { Search, RefreshCw, ChevronLeft, ChevronRight, Zap, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'

// Workflow statuses admin can set (excludes pending_payment — that's pre-payment only)
const WORKFLOW_STATUSES = ['pending', 'accepted', 'preparing', 'ready_for_pickup', 'completed', 'cancelled']
const STATUS_FILTER_OPTIONS = ['all', 'pending_payment', 'pending', 'accepted', 'preparing', 'ready_for_pickup', 'completed', 'cancelled']
const PAYMENT_FILTER_OPTIONS = ['all', 'unpaid', 'paid', 'failed']
const PICKUP_FILTER_OPTIONS = ['all', 'asap', 'scheduled']

// Workflow status badge colours
const STATUS_COLORS: Record<string, string> = {
  pending_payment: 'bg-purple-100 text-purple-700',
  pending:         'bg-yellow-100 text-yellow-700',
  accepted:        'bg-blue-100 text-blue-700',
  preparing:       'bg-orange-100 text-orange-700',
  ready_for_pickup:'bg-teal-100 text-teal-700',
  completed:       'bg-gray-100 text-gray-600',
  cancelled:       'bg-red-100 text-red-700',
}

// Payment status badge colours
const PAYMENT_COLORS: Record<string, string> = {
  unpaid: 'bg-yellow-100 text-yellow-700',
  paid:   'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
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
  paymentStatus: 'unpaid' | 'paid' | 'failed'
  paymentIntentId?: string
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
    const label = new Date(order.requestedPickupTime).toLocaleString('en-AU', {
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

/**
 * Combined status cell — shows payment badge + workflow badge together.
 * When paymentStatus=paid + status=pending, shows "✅ Paid — New Order"
 * so admin immediately knows this is a confirmed, actionable order.
 */
function StatusCell({ order }: { order: Order }) {
  const isPaid = order.paymentStatus === 'paid'
  const isUnpaid = order.paymentStatus === 'unpaid' || !order.paymentStatus
  const isFailed = order.paymentStatus === 'failed'

  // Payment badge
  const paymentBadge = (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${PAYMENT_COLORS[order.paymentStatus] ?? 'bg-gray-100 text-gray-600'}`}>
      {isPaid ? '✅ Paid' : isFailed ? '❌ Failed' : '⏳ Unpaid'}
    </span>
  )

  // Workflow badge — only show if meaningful (not pending_payment when unpaid — redundant)
  const showWorkflow = !(isUnpaid && order.status === 'pending_payment')
  const workflowLabel = order.status === 'pending' && isPaid
    ? 'New Order'           // "pending" after payment = new confirmed order waiting action
    : order.status.replace(/_/g, ' ')

  return (
    <div className="flex flex-col gap-1">
      {paymentBadge}
      {showWorkflow && (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {workflowLabel}
        </span>
      )}
    </div>
  )
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [pickupFilter, setPickupFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

  // Sound notification for new paid orders
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const knownPaidIdsRef = useRef<Set<string>>(new Set())
  const isFirstLoadRef = useRef(true)

  useEffect(() => {
    audioRef.current = new Audio('/order-notification.mp3')
    audioRef.current.volume = 1.0
  }, [])

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (search) params.set('search', search)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (paymentFilter !== 'all') params.set('paymentStatus', paymentFilter)
      if (pickupFilter !== 'all') params.set('pickupType', pickupFilter)
      const res = await fetch(`/api/admin/orders?${params}`)
      const data = await res.json()
      const fetched: Order[] = data.orders ?? []
      setOrders(fetched)
      setTotal(data.total ?? 0)

      // Check for new paid orders and play sound
      const newPaidIds = fetched
        .filter(o => o.paymentStatus === 'paid')
        .map(o => o._id)

      if (isFirstLoadRef.current) {
        // Seed known IDs on first load — don't beep for existing orders
        newPaidIds.forEach(id => knownPaidIdsRef.current.add(id))
        isFirstLoadRef.current = false
      } else {
        const brandNew = newPaidIds.filter(id => !knownPaidIdsRef.current.has(id))
        if (brandNew.length > 0) {
          brandNew.forEach(id => knownPaidIdsRef.current.add(id))
          try {
            await audioRef.current?.play()
          } catch {
            // Browser may block autoplay — silently ignore
          }
          toast.success(`🍱 ${brandNew.length} new paid order${brandNew.length > 1 ? 's' : ''} received!`)
        }
      }
    } catch {
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter, paymentFilter, pickupFilter])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  // Poll every 30 seconds for new paid orders
  useEffect(() => {
    const interval = setInterval(() => {
      fetchOrders()
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchOrders])

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
      <div className="flex flex-col sm:flex-row gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by order number, name, email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-9"
          />
        </div>

        {/* Payment filter */}
        <Select value={paymentFilter} onValueChange={(v) => { setPaymentFilter(v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="All payments" />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_FILTER_OPTIONS.map((p) => (
              <SelectItem key={p} value={p}>
                {p === 'all' ? 'All Payments' : p === 'paid' ? '✅ Paid' : p === 'unpaid' ? '⏳ Unpaid' : '❌ Failed'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status filter */}
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTER_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s === 'all' ? 'All Statuses' : s.replace(/_/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Pickup filter */}
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
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((order) => (
                  <Fragment key={order._id}>
                    <tr
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
                      <td className="px-4 py-3 font-semibold text-charcoal">
                        {formatCurrency(order.total)}
                      </td>

                      {/* Combined payment + workflow status */}
                      <td className="px-4 py-3">
                        <StatusCell order={order} />
                      </td>

                      <td className="px-4 py-3 text-gray-500 text-xs hidden sm:table-cell">
                        {new Date(order.createdAt).toLocaleDateString('en-AU')}
                      </td>

                      {/* Workflow update dropdown — disabled until paid */}
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {order.paymentStatus === 'paid' ? (
                          <Select value={order.status} onValueChange={(v) => updateStatus(order._id, v)}>
                            <SelectTrigger className="h-8 text-xs w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {WORKFLOW_STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs text-gray-400 italic">
                            {order.paymentStatus === 'failed' ? 'Payment failed' : 'Awaiting payment'}
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* Expanded detail row */}
                    {expandedOrder === order._id && (
                      <tr className="bg-cream">
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

                            {/* Customer + Payment */}
                            <div>
                              <p className="font-semibold text-charcoal text-xs mb-2">Customer</p>
                              <p className="text-xs text-gray-600">{order.customerName}</p>
                              <p className="text-xs text-gray-600">{order.customerPhone}</p>
                              <p className="text-xs text-gray-600">{order.customerEmail}</p>

                              <p className="font-semibold text-charcoal text-xs mt-3 mb-1">Payment</p>
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${PAYMENT_COLORS[order.paymentStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                                {order.paymentStatus === 'paid' ? '✅ Paid' : order.paymentStatus === 'failed' ? '❌ Failed' : '⏳ Unpaid'}
                              </span>
                              {order.paymentIntentId && (
                                <p className="text-xs text-gray-400 mt-1 font-mono break-all">{order.paymentIntentId}</p>
                              )}
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
                  </Fragment>
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
