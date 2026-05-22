'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  ShoppingBag, Tag, X, Loader2, MapPin, Heart,
  Zap, Clock,
} from 'lucide-react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCartStore } from '@/store/cartStore'
import { formatCurrency } from '@/lib/utils'

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
  time: string
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
  const [selectedTime, setSelectedTime] = useState('') // "HH:MM" string
  const [timeError, setTimeError] = useState('')
  const [availableTimes, setAvailableTimes] = useState<string[]>([]) // ["11:00","11:15",...]

  // Derived totals
  const subtotal = getSubtotal()
  const afterDiscount = Math.max(0, subtotal - discountAmount)
  const tipAmount = Math.round(afterDiscount * (tipPercentage / 100) * 100) / 100
  const grandTotal = Math.round((afterDiscount + tipAmount) * 100) / 100

  const { register, handleSubmit, formState: { errors } } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
  })

  // Load pickup settings on mount
  useEffect(() => {
    fetch('/api/pickup-slots')
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setPickupSettings({
            pickupEnabled: true,
            asapPickupEnabled: true,
            scheduledPickupEnabled: true,
            defaultPreparationMinutes: 25,
            availableDates: [],
            asapEstimate: null,
            timezone: 'Australia/Melbourne',
          })
          return
        }
        setPickupSettings(data)
        if (!data.asapPickupEnabled && data.scheduledPickupEnabled) {
          setPickupType('scheduled')
        }
        // Load today's available times
        if (data.availableDates?.length > 0) {
          const today = data.availableDates[0]
          fetch(`/api/pickup-slots?date=${today}`)
            .then(r => r.json())
            .then(slotData => {
              const times = (slotData.slots ?? []).map((s: PickupSlot) => s.time)
              setAvailableTimes(times)
              if (times.length > 0) setSelectedTime(times[0])
            })
            .catch(() => {})
        }
      })
      .catch(() => {
        setPickupSettings({
          pickupEnabled: true,
          asapPickupEnabled: true,
          scheduledPickupEnabled: true,
          defaultPreparationMinutes: 25,
          availableDates: [],
          asapEstimate: null,
          timezone: 'Australia/Melbourne',
        })
      })
      .finally(() => setPickupLoading(false))
  }, [])

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
    if (pickupType === 'scheduled') {
      if (!selectedTime) {
        toast.error('Please select a pickup time.')
        return
      }
      if (timeError) {
        toast.error(timeError)
        return
      }
    }

    setRedirecting(true)
    try {
      // Build a full ISO datetime for today + selected time in Melbourne
      let requestedPickupTime: string | null = null
      if (pickupType === 'scheduled' && selectedTime) {
        const today = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Australia/Melbourne',
          year: 'numeric', month: '2-digit', day: '2-digit',
        }).format(new Date())
        // Build as a local Melbourne datetime string and let the server validate
        requestedPickupTime = new Date(`${today}T${selectedTime}:00`).toISOString()
      }
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
          requestedPickupTime: pickupType === 'scheduled' ? requestedPickupTime : null,
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
                                Choose a pickup time for later today.
                              </p>
                            </div>
                          </div>
                        </button>
                      )}

                      {/* Time picker (shown when scheduled selected) */}
                      {pickupType === 'scheduled' && (
                        <div className="mt-2 pl-1 space-y-2">
                          <Label className="text-sm font-medium text-charcoal">Pickup Time</Label>
                          <input
                            type="time"
                            value={selectedTime}
                            onChange={e => {
                              const t = e.target.value
                              setSelectedTime(t)
                              // Validate against available times
                              if (availableTimes.length > 0 && !availableTimes.includes(t)) {
                                setTimeError(`Please choose an available time. Next available: ${availableTimes[0]}`)
                              } else {
                                setTimeError('')
                              }
                            }}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-burgundy"
                          />
                          {timeError && (
                            <p className="text-red-500 text-xs">{timeError}</p>
                          )}
                          {availableTimes.length > 0 && (
                            <p className="text-gray-400 text-xs">
                              Available from {availableTimes[0]} to {availableTimes[availableTimes.length - 1]}
                            </p>
                          )}
                          {selectedTime && !timeError && (
                            <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-700 font-medium">
                              ✓ Pickup today at {selectedTime}
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
                  disabled={redirecting || (pickupType === 'scheduled' && (!selectedTime || !!timeError))}
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
                    {pickupType === 'scheduled' && selectedTime && !timeError && (
                      <p className="text-gray-500 text-xs mt-0.5">Today at {selectedTime}</p>
                    )}
                    {pickupType === 'scheduled' && !selectedTime && (
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
