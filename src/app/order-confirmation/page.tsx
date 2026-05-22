import { Suspense } from 'react'
import Link from 'next/link'
import { CheckCircle, MapPin, Clock, ShoppingBag, Zap } from 'lucide-react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { Button } from '@/components/ui/button'
import { connectDB } from '@/lib/db'
import Order from '@/models/Order'

async function getOrder(orderNumber: string) {
  try {
    await connectDB()
    const order = await Order.findOne({ orderNumber }).lean()
    return order
  } catch {
    return null
  }
}

function formatPickupDisplay(order: {
  pickupType?: string
  pickupWindowLabel?: string
  estimatedPickupTime?: Date | string | null
  requestedPickupTime?: Date | string | null
}): { icon: React.ReactNode; title: string; detail: string } {
  if (order.pickupType === 'scheduled' && (order.requestedPickupTime)) {
    const t = new Date(order.requestedPickupTime)
    const label = t.toLocaleString('en-AU', {
      timeZone: 'Australia/Melbourne',
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    })
    return {
      icon: <Clock className="w-4 h-4 text-orange" />,
      title: 'Scheduled Pickup',
      detail: label,
    }
  }
  return {
    icon: <Zap className="w-4 h-4 text-orange" />,
    title: 'Pick Up ASAP',
    detail: order.estimatedPickupTime
      ? `Est. ${new Date(order.estimatedPickupTime).toLocaleTimeString('en-AU', {
          timeZone: 'Australia/Melbourne',
          hour: 'numeric', minute: '2-digit', hour12: true,
        })}`
      : 'As soon as possible',
  }
}

async function OrderConfirmationInner({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>
}) {
  const params = await searchParams
  const orderNumber = params.order ?? 'Unknown'
  const order = orderNumber !== 'Unknown' ? await getOrder(orderNumber) : null
  const pickup = order ? formatPickupDisplay(order) : null

  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-12 h-12 text-green-500" />
      </div>
      <h1 className="text-3xl font-bold text-charcoal mb-2">Order Placed!</h1>
      <p className="text-gray-500 mb-6">
        Thank you for your order. We&apos;ll have it ready for pickup soon.
      </p>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-cream-dark mb-6 text-left space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-gray-500 text-sm">Order Number</span>
          <code className="font-mono font-bold text-burgundy text-lg">{orderNumber}</code>
        </div>

        {/* Pickup info */}
        {pickup && (
          <div className="bg-cream rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 font-semibold text-charcoal text-sm mb-1">
              {pickup.icon}
              {pickup.title}
            </div>
            <p className="text-gray-600 text-sm">{pickup.detail}</p>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4 text-orange" />
          <span>Status: <strong className="text-charcoal">Pending</strong></span>
        </div>
        <div className="flex items-start gap-2 text-sm text-gray-600">
          <MapPin className="w-4 h-4 text-orange mt-0.5" />
          <span>Pickup at: Shop 5/672 Glenferrie Rd, Hawthorn VIC 3122</span>
        </div>
      </div>

      <div className="bg-orange/10 border border-orange/20 rounded-xl p-4 mb-8 text-sm text-charcoal">
        <p className="font-semibold mb-1">📱 What happens next?</p>
        <p className="text-gray-600">
          We&apos;ll prepare your order and notify you when it&apos;s ready for pickup. Please bring your order number.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/">
          <Button className="bg-burgundy hover:bg-burgundy-dark text-white">Back to Home</Button>
        </Link>
        <Link href="/#menu">
          <Button variant="outline" className="border-burgundy text-burgundy hover:bg-burgundy hover:text-white">
            <ShoppingBag className="w-4 h-4 mr-2" />Order More
          </Button>
        </Link>
      </div>
    </div>
  )
}

export default function OrderConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>
}) {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream pt-20">
        <Suspense fallback={<div className="text-center py-20">Loading...</div>}>
          <OrderConfirmationInner searchParams={searchParams} />
        </Suspense>
      </main>
      <Footer />
    </>
  )
}
