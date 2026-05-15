import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Promotion from '@/models/Promotion'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await connectDB()
    const now = new Date()
    const promotions = await Promotion.find({
      isActive: true,
      startsAt: { $lte: now },
      endsAt: { $gte: now },
    })
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json({ promotions })
  } catch (error) {
    console.error('Promotions fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch promotions' }, { status: 500 })
  }
}
