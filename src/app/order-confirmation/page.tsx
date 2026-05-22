import { Suspense } from 'react'
import Link from 'next/link'
import { CheckCircle, MapPin, Clock, ShoppingBag, Zap, AlertCircle } from 'lucide-react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { Button } from '@/components/ui/button'
import { connectDB } from '@/lib/db'
import Order from '@/models/Order'
import MenuItem from '@/models/MenuItem'
import stripe from '@/lib/stripe'
import { sendPaidOrderEmails } from '@/lib/email/send-order-emails'

/**
 * Server-side payment verification + order marking.
 * Runs synchronously when Stripe redirects the customer to the success_url.
 * Primary confirmation path — webhooks are a secondary backup.
 */
async function verifyAndMarkPaid(
  sessionId: string,
  orderNumber: string,
  requestOrigin: string
): Promise<boolean> {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    if (session.payment_status !== 'paid') return false

    await connectDB()
    const order = await Order.findOne({ orderNumber })
    if (!order) return false

    // Already processed — still send emails if not yet sent
    if (order.paymentStatus === 'paid') {
      // Fire emails idempotently (flags guard against duplicates)
      try {
        await sendPaidOrderEmails(order, {
          stripeSessionId: sessionId,
          stripePaymentIntentId: session.payment_intent as string | undefined,
          siteOrigin: requestOrigin,
        })
      } catch (mailErr) {
        console.error('[order-confirmation] sendPaidOrderEmails error (already paid):', mailErr)
      }
      return true
    }

    // Patch paymentIntentId if missing
    if (!order.paymentIntentId && session.payment_intent) {
      order.paymentIntentId = session.payment_intent as string
    }

    order.paymentStatus = 'paid'
    order.status = 'pending'
    await order.save()

    // Increment orderCount for each item
    for (const item of order.items) {
      await MenuItem.findByIdAndUpdate(item.menuItemId, {
        $inc: { orderCount: item.quantity },
      })
    }

    // Auto-update popular items
    const POPULAR_THRESHOLD = 10
    const allItems = await MenuItem.find({ popularOverride: 'auto' }).lean()
    const maxOrderCount = Math.max(...allItems.map((i) => i.orderCount), 0)
    for (const item of allItems) {
      const shouldBePopular =
        item.orderCount >= POPULAR_THRESHOLD || item.orderCount >= maxOrderCount
      if (item.isPopular !== shouldBePopular) {
        await MenuItem.findByIdAndUpdate(item._id, { isPopular: shouldBePopular })
      }
    }

    // Send emails — fire-and-forget, never throws into this function
    try {
      await sendPaidOrderEmails(order, {
        stripeSessionId: sessionId,
        stripePaymentIntentId: session.payment_intent as string | undefined,
        siteOrigin: requestOrigin,
      })
    } catch (mailErr) {
      console.error('[order-confirmation] sendPaidOrderEmails error:', mailErr)
    }

    return true
  } catch (err) {
    console.error('[order-confirmation] verifyAndMarkPaid error:', err)
    return false
  }
}

async function getOrder(orderNumber: string) {
  try {
    await connectDB()
    return await Order.findOne({ orderNumber }).lean()
  } catch {
    return null
  }
}

function formatPickupDisplay(order: {
  pickupType?: string
  estimatedPickupTime?: Date | string | null
  requestedPickupTime?: Date | string | null
}): { icon: React.ReactNode; title: string; detail: string } {
  if (order.pickupType === 'scheduled' && order.requestedPickupTime) {
    const label = new Date(order.requestedPickupTime).toLocaleString('en-AU', {
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
  searchParams: Promise<{ order?: string; session_id?: string }>
}) {
  const params = await searchParams
  const orderNumber = params.order ?? 'Unknown'
  const sessionId = params.session_id

  const siteOrigin =
    process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? ''

  // Verify payment server-side before rendering
  let paymentConfirmed = false
  if (sessionId && orderNumber !== 'Unknown') {
    paymentConfirmed = await verifyAndMarkPaid(sessionId, orderNumber, siteOrigin)
  }

  // Fetch order for display
  const order = orderNumber !== 'Unknown' ? await getOrder(orderNumber) : null

  // Webhook may have already marked it paid before we got here
  if (order?.paymentStatus === 'paid') paymentConfirmed = true

  const pickup = order ? formatPickupDisplay(order) : null

  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${paymentConfirmed ? 'bg-green-100' : 'bg-yellow-100'}`}>
        {paymentConfirmed
          ? <CheckCircle className="w-12 h-12 text-green-500" />
          : <AlertCircle className="w-12 h-12 text-yellow-500" />
        }
      </div>

      <h1 className="text-3xl font-bold text-charcoal mb-2">
        {paymentConfirmed ? 'Order Confirmed!' : 'Order Received'}
      </h1>
      <p className="text-gray-500 mb-6">
        {paymentConfirmed
          ? "Your payment was successful. We'll have your order ready for pickup soon."
          : "We've received your order. Payment confirmation may take a moment."}
      </p>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-cream-dark mb-6 text-left space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-gray-500 text-sm">Order Number</span>
          <code className="font-mono font-bold text-burgundy text-lg">{orderNumber}</code>
        </div>

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
          <span>
            Payment:{' '}
            <strong className={paymentConfirmed ? 'text-green-600' : 'text-yellow-600'}>
              {paymentConfirmed ? 'Confirmed ✓' : 'Processing...'}
            </strong>
          </span>
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
  searchParams: Promise<{ order?: string; session_id?: string }>
}) {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream pt-20">
        <Suspense fallback={
          <div className="max-w-lg mx-auto px-4 py-20 text-center">
            <div className="w-10 h-10 border-4 border-burgundy border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Confirming your payment...</p>
          </div>
        }>
          <OrderConfirmationInner searchParams={searchParams} />
        </Suspense>
      </main>
      <Footer />
    </>
  )
}
