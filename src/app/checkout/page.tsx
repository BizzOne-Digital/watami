'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ShoppingBag, Tag, X, Loader2, MapPin } from 'lucide-react'
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

export default function CheckoutPage() {
  const router = useRouter()
  const { items, getSubtotal, getTotal, discountAmount, couponCode, setCoupon, clearCoupon } =
    useCartStore()
  const [couponInput, setCouponInput] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [redirecting, setRedirecting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutForm>({ resolver: zodResolver(checkoutSchema) })

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
      if (!res.ok) {
        toast.error(data.error ?? 'Invalid coupon')
        return
      }
      setCoupon(data.code ?? couponInput.toUpperCase(), data.discount, data.type, data.value)
      toast.success(
        `Coupon applied! ${data.type === 'percentage' ? `${data.value}%` : formatCurrency(data.value)} off`
      )
    } catch {
      toast.error('Failed to validate coupon')
    } finally {
      setCouponLoading(false)
    }
  }

  const onSubmit = async (data: CheckoutForm) => {
    setRedirecting(true)
    try {
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
        }),
      })

      const result = await res.json()

      if (!res.ok || !result.url) {
        toast.error(result.error ?? 'Failed to start checkout. Please try again.')
        setRedirecting(false)
        return
      }

      // Clear cart and redirect to Stripe's hosted checkout page
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
            <Button
              onClick={() => router.push('/#menu')}
              className="bg-burgundy hover:bg-burgundy-dark text-white"
            >
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
              {/* Left: details + coupon */}
              <div className="lg:col-span-3 space-y-6">
                {/* Customer details */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-cream-dark">
                  <h2 className="text-lg font-bold text-charcoal mb-4">Your Details</h2>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="customerName">Full Name *</Label>
                      <Input
                        id="customerName"
                        {...register('customerName')}
                        placeholder="John Smith"
                        className="mt-1"
                      />
                      {errors.customerName && (
                        <p className="text-red-500 text-xs mt-1">{errors.customerName.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="customerPhone">Phone Number *</Label>
                      <Input
                        id="customerPhone"
                        {...register('customerPhone')}
                        placeholder="04XX XXX XXX"
                        type="tel"
                        className="mt-1"
                      />
                      {errors.customerPhone && (
                        <p className="text-red-500 text-xs mt-1">{errors.customerPhone.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="customerEmail">Email Address *</Label>
                      <Input
                        id="customerEmail"
                        {...register('customerEmail')}
                        placeholder="john@example.com"
                        type="email"
                        className="mt-1"
                      />
                      {errors.customerEmail && (
                        <p className="text-red-500 text-xs mt-1">{errors.customerEmail.message}</p>
                      )}
                    </div>
                  </div>
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
                        <p className="text-green-600 text-sm">
                          -{formatCurrency(discountAmount)} discount
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={clearCoupon}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
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
                        onKeyDown={(e) =>
                          e.key === 'Enter' && (e.preventDefault(), handleApplyCoupon())
                        }
                      />
                      <Button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={couponLoading || !couponInput.trim()}
                        variant="outline"
                        className="border-burgundy text-burgundy hover:bg-burgundy hover:text-white"
                      >
                        {couponLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Apply'
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Pay button */}
                <Button
                  type="submit"
                  disabled={redirecting}
                  className="w-full bg-burgundy hover:bg-burgundy-dark text-white h-14 text-base font-semibold shadow-lg"
                >
                  {redirecting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Redirecting to payment...
                    </>
                  ) : (
                    `Pay ${formatCurrency(getTotal())} — Secure Checkout`
                  )}
                </Button>
              </div>

              {/* Right: order summary */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-cream-dark sticky top-24">
                  <h2 className="text-lg font-bold text-charcoal mb-4">Order Summary</h2>
                  <div className="space-y-3 max-h-80 overflow-y-auto mb-4">
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
                    <div className="flex justify-between font-bold text-charcoal text-base pt-1 border-t border-cream-dark">
                      <span>Total</span>
                      <span className="text-burgundy">{formatCurrency(getTotal())}</span>
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
