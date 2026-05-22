import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Order from '@/models/Order'

export const dynamic = 'force-dynamic'

/**
 * GET /api/orders/:orderNumber
 * Returns public-safe order details for the order-confirmation page.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const { orderNumber } = await params
    if (!orderNumber) {
      return NextResponse.json({ error: 'Missing order number' }, { status: 400 })
    }

    await connectDB()

    const order = await Order.findOne({ orderNumber })
      .select('orderNumber pickupType pickupWindowLabel estimatedPickupTime requestedPickupTime paymentStatus status total')
      .lean()

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json({ order })
  } catch (error) {
    console.error('[GET /api/orders/:orderNumber]', error)
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 })
  }
}
