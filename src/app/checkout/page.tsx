'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  ShoppingBag, Tag, X, Loader2, MapPin, Heart,
  Zap, Clock, ChevronDown,
} from 'lucide-react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils'
import { useCartStore } from '@/store/cartStore'

const checkoutSchema = z.object({
  customerName: z.string().min(2, 'Name must be at least 2 characters'),
  customerPhone: z.string().min(8, 'Enter a valid phone number').max(20),
  customerEmail: z.string().email('Enter a valid email address'),
})
type CheckoutForm = z.infer<typeof checkoutSchema>

const TIP_OPTIONS = [0, 10, 15, 20]
const DEFAULT_TIP = 15

type PickupType = 'asap' | 'scheduled'

interface PickupSettings {
  pickupEnabled: boolean
  asapPickupEnabled: boolean
  scheduledPickupEnabled: boolean
  defaultPreparationMinutes: number
  availableDates: string[]
  asapEstimate: { time: string; label: string } | null
  timezone: string
}

interface PickupSlot {
  value: string   // ISO string
  label: string   // "Today 11:30 AM"
  date: string    // "2025-05-22"
  time: string    // "11:30"
}

function formatDateLabel(dateStr: string): string {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Melbourne',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
  const tomorrow = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Melbourne',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(Date.now() + 86400000))

  if (dateStr === today) return 'Today'
  if (dateStr === tomorrow) return 'Tomorrow'
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-AU', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
}

const FALLBACK_SETTINGS: PickupSettings = {
  pickupEnabled: true,
  asapPickupEnabled: true,
  scheduledPickupEnabled: true,
  defaultPreparationMinutes: 25,
  availableDates: [],
  asapEstimate: null,
  timezone: 'Australia/Melbourne',
}

export default function CheckoutPage() {
  const router = useRouter()
  const { items, getSubtotal, discountAmount, couponCode, setCoupon, clearCoupon } = useCartStore()

  const [couponInput, setCouponInput] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [tipPercentage, setTipPercentage] = useState(DEFAULT_TIP)

  // Pickup state
  const [pickupType, setPickupType] = useState<PickupType>('asap')
  const [pickupSettings, setPickupSettings] = useState<PickupSettings | null>(null)
  const [pickupLoading, setPickupLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState('')
  const [slots, setSlots] = useState<PickupSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)

  // Derived totals
  const subtotal = getSubtotal()
  const afterDiscount = Math.max(0, subtotal - discountAmount)
  const tipAmount = Math.round(afterDiscount * (tipPercentage / 100) * 100) / 100
  const grandTotal = Math.round((afterDiscount + tipAmount) * 100) / 100

  const { register, handleSubmit, formState: { errors } } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
  })

  // Load pickup settings from DB on mount
  useEffect(() => {
    fetch('/api/pickup-slots')
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setPickupSettings(FALLBACK_SETTINGS)
          return
        }
        setPickupSettings(data)
        if (!data.asapPickupEnabled && data.scheduledPickupEnabled) {
          setPickupType('scheduled')
        }
        if (data.availableDates?.length > 0) {
          setSelectedDate(data.availableDates[0])
        }
      })
      .catch(() => setPickupSettings(FALLBACK_SETTINGS))
      .finally(() => setPickupLoading(false))
  }, [])

  // Load time slots from DB when date changes
  useEffect(() => {
    if (!selectedDate || pickupType !== 'scheduled') return
    setSlotsLoading(true)
    setSelectedSlot('')
    fetch(`/api/pickup-slots?date=${selectedDate}`)
      .then(r => r.json())
      .then(data => {
        const fetchedSlots: PickupSlot[] = data.slots ?? []
        setSlots(fetchedSlots)
        // Store the time string "HH:MM" directly — no ISO mismatch issues
        if (fetchedSlots.length > 0) setSelectedSlot(fetchedSlots[0].time)
      })
      .catch(() => toast.error('Failed to load time slots'))
      .finally(() => setSlotsLoading(false))
  }, [selectedDate, pickupType])

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return
    setCouponLoading(true)
    try {
      const res = await fetch('/api/coupon/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponInput.trim(), subtotal: getSubtotal() }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Invalid coupon'); return }
      setCoupon(data.code ?? couponInput.toUpperCase(), data.discount, data.type, data.value)
      toast.success(`Coupon applied! ${data.type === 'percentage' ? `${data.value}%` : formatCurrency(data.value)} off`)
    } catch {
      toast.error('Failed to validate coupon')
    } finally {
      setCouponLoading(false)
    }
  }

  const onSubmit = async (data: CheckoutForm) => {
    if (pickupType === 'scheduled' && !selectedSlot) {
      toast.error('Please select a pickup time.')
      return
    }

    setRedirecting(true)
    try {
      // Build ISO pickup time from selected date + time slot in Melbourne timezone.
      // We construct the wall-clock string and let the server interpret it correctly
      // via the slot's pre-computed ISO value from the API.
      const selectedSlotFull = slots.find(s => s.time === selectedSlot)
      const isoPickupTime = pickupType === 'scheduled'
        ? (selectedSlotFull?.value ?? null)
        : null

      // Safety check — if slot value is missing or looks wrong, fall back to
      // constructing from date + time directly as a Melbourne wall-clock ISO string
      const finalPickupTime = (() => {
        if (pickupType !== 'scheduled') return null
        if (!selectedDate || !selectedSlot) return null
        // Use the slot's pre-computed value if available and looks valid
        if (isoPickupTime) return isoPickupTime
        // Fallback: build as YYYY-MM-DDTHH:MM:00+Melbourne_offset
        // We send it as a plain datetime string; server parses with new Date()
        return `${selectedDate}T${selectedSlot}:00`
      })()
      const res = await fetch('/api/payment/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          items: items.map((item) => ({
            menuItemId: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            specialInstructions: item.specialInstructions,
          })),
          couponCode: couponCode || undefined,
          tipPercentage,
          pickupType,
          requestedPickupTime: finalPickupTime,
        }),
      })

      const result = await res.json()
      if (!res.ok || !result.url) {
        toast.error(result.error ?? 'Failed to start checkout. Please try again.')
        setRedirecting(false)
        return
      }

      useCartStore.getState().clearCart()
      window.location.href = result.url
    } catch (err) {
      console.error('Checkout error:', err)
      toast.error('Something went wrong. Please try again.')
      setRedirecting(false)
    }
  }

  if (items.length === 0) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-cream pt-24 pb-12">
          <div className="max-w-lg mx-auto px-4 text-center py-20">
            <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-charcoal mb-2">Your cart is empty</h1>
            <p className="text-gray-500 mb-6">Add some items from the menu first</p>
            <Button onClick={() => router.push('/#menu')} className="bg-burgundy hover:bg-burgundy-dark text-white">
              Browse Menu
            </Button>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  const selectedSlotObj = slots.find(s => s.time === selectedSlot)

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream pt-24 pb-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-charcoal mb-2">Checkout</h1>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-8">
            <MapPin className="w-4 h-4 text-orange" />
            <span>Pickup only · Shop 5/672 Glenferrie Rd, Hawthorn VIC 3122</span>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              {/* Left column */}
              <div className="lg:col-span-3 space-y-6">

                {/* Customer details */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-cream-dark">
                  <h2 className="text-lg font-bold text-charcoal mb-4">Your Details</h2>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="customerName">Full Name *</Label>
                      <Input id="customerName" {...register('customerName')} placeholder="John Smith" className="mt-1" />
                      {errors.customerName && <p className="text-red-500 text-xs mt-1">{errors.customerName.message}</p>}
                    </div>
                    <div>
                      <Label htmlFor="customerPhone">Phone Number *</Label>
                      <Input id="customerPhone" {...register('customerPhone')} placeholder="04XX XXX XXX" type="tel" className="mt-1" />
                      {errors.customerPhone && <p className="text-red-500 text-xs mt-1">{errors.customerPhone.message}</p>}
                    </div>
                    <div>
                      <Label htmlFor="customerEmail">Email Address *</Label>
                      <Input id="customerEmail" {...register('customerEmail')} placeholder="john@example.com" type="email" className="mt-1" />
                      {errors.customerEmail && <p className="text-red-500 text-xs mt-1">{errors.customerEmail.message}</p>}
                    </div>
                  </div>
                </div>

                {/* Pickup method */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-cream-dark">
                  <h2 className="text-lg font-bold text-charcoal mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-burgundy" />
                    Pickup Method *
                  </h2>

                  {pickupLoading ? (
                    <div className="flex items-center gap-2 text-gray-400 text-sm py-4">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading pickup options...
                    </div>
                  ) : (
                    <div className="space-y-3">

                      {/* ASAP card */}
                      {pickupSettings?.asapPickupEnabled && (
                        <button
                          type="button"
                          onClick={() => setPickupType('asap')}
                          className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                            pickupType === 'asap'
                              ? 'border-burgundy bg-burgundy/5 shadow-sm'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                              pickupType === 'asap' ? 'border-burgundy' : 'border-gray-300'
                            }`}>
                              {pickupType === 'asap' && <div className="w-2.5 h-2.5 rounded-full bg-burgundy" />}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Zap className="w-4 h-4 text-orange" />
                                <span className="font-bold text-charcoal">Pick Up ASAP</span>
                              </div>
                              <p className="text-gray-500 text-sm mt-0.5">
                                We&apos;ll prepare your order as soon as possible.
                              </p>
                              {pickupType === 'asap' && pickupSettings?.asapEstimate && (
                                <p className="text-burgundy text-sm font-medium mt-2">
                                  ⏱ Estimated pickup: {pickupSettings.asapEstimate.label}
                                  {' '}(~{pickupSettings.defaultPreparationMinutes} min)
                                </p>
                              )}
                              {pickupType === 'asap' && !pickupSettings?.asapEstimate && (
                                <p className="text-orange text-sm font-medium mt-2">
                                  ⚠ We may currently be closed. Your order will be prepared at opening.
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      )}

                      {/* Scheduled card */}
                      {pickupSettings?.scheduledPickupEnabled && (
                        <button
                          type="button"
                          onClick={() => setPickupType('scheduled')}
                          className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                            pickupType === 'scheduled'
                              ? 'border-burgundy bg-burgundy/5 shadow-sm'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                              pickupType === 'scheduled' ? 'border-burgundy' : 'border-gray-300'
                            }`}>
                              {pickupType === 'scheduled' && <div className="w-2.5 h-2.5 rounded-full bg-burgundy" />}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-orange" />
                                <span className="font-bold text-charcoal">Select Time (Later)</span>
                              </div>
                              <p className="text-gray-500 text-sm mt-0.5">
                                Choose a pickup time for later today or a future available day.
                              </p>
                            </div>
                          </div>
                        </button>
                      )}

                      {/* Date + time picker — shown when scheduled is selected */}
                      {pickupType === 'scheduled' && (
                        <div className="mt-3 space-y-4 pl-1">

                          {/* Date picker — only allows available dates from DB */}
                          <div>
                            <Label className="text-sm font-medium text-charcoal">Pickup Date</Label>
                            <input
                              type="date"
                              value={selectedDate}
                              min={pickupSettings?.availableDates[0] ?? ''}
                              max={pickupSettings?.availableDates[pickupSettings.availableDates.length - 1] ?? ''}
                              onChange={e => {
                                const val = e.target.value
                                // Only allow dates that are actually available
                                if (pickupSettings?.availableDates.includes(val)) {
                                  setSelectedDate(val)
                                } else if (val) {
                                  toast.error('That date is not available for pickup. Please choose another.')
                                }
                              }}
                              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-burgundy"
                            />
                            {pickupSettings?.availableDates && pickupSettings.availableDates.length > 0 && (
                              <p className="text-xs text-gray-400 mt-1">
                                Available: {formatDateLabel(pickupSettings.availableDates[0])} – {formatDateLabel(pickupSettings.availableDates[pickupSettings.availableDates.length - 1])}
                              </p>
                            )}
                          </div>

                          {/* Pickup Time */}
                          <div>
                            <Label className="text-sm font-medium text-charcoal">Pickup Time</Label>
                            {slotsLoading ? (
                              <div className="flex items-center gap-2 text-gray-400 text-sm mt-2">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading times...
                              </div>
                            ) : slots.length === 0 ? (
                              <p className="text-sm text-orange mt-2">No available times for this date.</p>
                            ) : (
                              <div className="mt-1 space-y-1">
                                <div className="relative flex items-center">
                                  <Clock className="absolute left-3 w-5 h-5 text-burgundy pointer-events-none z-10" />
                                  <input
                                    type="time"
                                    value={selectedSlot}
                                    onChange={e => {
                                      if (e.target.value) setSelectedSlot(e.target.value)
                                    }}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm text-charcoal font-medium bg-white focus:outline-none focus:ring-2 focus:ring-burgundy cursor-pointer"
                                  />
                                </div>
                                <p className="text-xs text-gray-400">
                                  Available: {slots[0]?.time} – {slots[slots.length - 1]?.time}
                                </p>
                              </div>
                            )}
                          </div>

                          {selectedSlotObj && (
                            <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-700 font-medium">
                              ✓ Pickup: {selectedSlotObj.label}
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  )}
                </div>

                {/* Coupon */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-cream-dark">
                  <h2 className="text-lg font-bold text-charcoal mb-4 flex items-center gap-2">
                    <Tag className="w-5 h-5 text-orange" />
                    Coupon Code
                  </h2>
                  {couponCode ? (
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                      <div>
                        <p className="font-semibold text-green-700">{couponCode} applied</p>
                        <p className="text-green-600 text-sm">-{formatCurrency(discountAmount)} discount</p>
                      </div>
                      <button type="button" onClick={clearCoupon} className="text-gray-400 hover:text-red-500 transition-colors">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        placeholder="Enter coupon code"
                        className="flex-1"
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleApplyCoupon())}
                      />
                      <Button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={couponLoading || !couponInput.trim()}
                        variant="outline"
                        className="border-burgundy text-burgundy hover:bg-burgundy hover:text-white"
                      >
                        {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Tip */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-cream-dark">
                  <h2 className="text-lg font-bold text-charcoal mb-1 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-burgundy" />
                    Add a Tip
                  </h2>
                  <p className="text-gray-500 text-sm mb-4">Show your appreciation for our team</p>
                  <div className="grid grid-cols-4 gap-2">
                    {TIP_OPTIONS.map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setTipPercentage(pct)}
                        className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                          tipPercentage === pct
                            ? 'border-burgundy bg-burgundy text-white shadow-sm'
                            : 'border-gray-200 bg-white text-charcoal hover:border-burgundy/50'
                        }`}
                      >
                        {pct === 0 ? 'No tip' : `${pct}%`}
                      </button>
                    ))}
                  </div>
                  {tipPercentage > 0 && (
                    <p className="text-sm text-gray-500 mt-3 text-center">
                      {formatCurrency(tipAmount)} tip added · thank you! 🙏
                    </p>
                  )}
                </div>

                {/* Pay button */}
                <Button
                  type="submit"
                  disabled={redirecting || (pickupType === 'scheduled' && !selectedSlot)}
                  className="w-full bg-burgundy hover:bg-burgundy-dark text-white h-14 text-base font-semibold shadow-lg"
                >
                  {redirecting ? (
                    <><Loader2 className="w-5 h-5 animate-spin mr-2" />Redirecting to payment...</>
                  ) : (
                    `Pay ${formatCurrency(grandTotal)} — Secure Checkout`
                  )}
                </Button>
              </div>

              {/* Right: order summary */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-cream-dark sticky top-24">
                  <h2 className="text-lg font-bold text-charcoal mb-4">Order Summary</h2>
                  <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
                    {items.map((item) => (
                      <div key={item.id} className="flex justify-between gap-2 text-sm">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-charcoal line-clamp-1">{item.name}</p>
                          <p className="text-gray-400 text-xs">x{item.quantity}</p>
                        </div>
                        <span className="font-semibold text-charcoal whitespace-nowrap">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Pickup summary */}
                  <div className="bg-cream rounded-lg px-3 py-2.5 mb-3 text-sm">
                    <div className="flex items-center gap-2 text-charcoal font-medium">
                      {pickupType === 'asap'
                        ? <><Zap className="w-3.5 h-3.5 text-orange" /> Pick Up ASAP</>
                        : <><Clock className="w-3.5 h-3.5 text-orange" /> Scheduled Pickup</>
                      }
                    </div>
                    {pickupType === 'asap' && pickupSettings?.asapEstimate && (
                      <p className="text-gray-500 text-xs mt-0.5">Est. {pickupSettings.asapEstimate.label}</p>
                    )}
                    {pickupType === 'scheduled' && selectedSlotObj && (
                      <p className="text-gray-500 text-xs mt-0.5">{selectedSlotObj.label}</p>
                    )}
                    {pickupType === 'scheduled' && !selectedSlotObj && (
                      <p className="text-orange text-xs mt-0.5">No time selected</p>
                    )}
                  </div>

                  <div className="border-t border-cream-dark pt-3 space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Subtotal</span>
                      <span>{formatCurrency(getSubtotal())}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount</span>
                        <span>-{formatCurrency(discountAmount)}</span>
                      </div>
                    )}
                    {tipAmount > 0 && (
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Tip ({tipPercentage}%)</span>
                        <span>+{formatCurrency(tipAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-charcoal text-base pt-1 border-t border-cream-dark">
                      <span>Total</span>
                      <span className="text-burgundy">{formatCurrency(grandTotal)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </>
  )
}
