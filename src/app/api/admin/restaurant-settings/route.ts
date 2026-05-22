import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import RestaurantSettings from '@/models/RestaurantSettings'

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== 'admin') return null
  return session
}

export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  let settings = await RestaurantSettings.findOne().lean()

  if (!settings) {
    // Auto-create defaults if none exist
    const created = await RestaurantSettings.create({
      weeklyPickupHours: [0, 1, 2, 3, 4, 5, 6].map((day) => ({
        dayOfWeek: day,
        isOpen: true,
        openTime: '11:00',
        closeTime: '21:00',
      })),
    })
    settings = created.toObject()
  }

  return NextResponse.json({ settings })
}

export async function PUT(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const body = await req.json()

  // Remove _id and timestamps from body to avoid conflicts
  const { _id, createdAt, updatedAt, __v, ...update } = body

  const settings = await RestaurantSettings.findOneAndUpdate(
    {},
    { $set: update },
    { new: true, upsert: true }
  )

  return NextResponse.json({ settings })
}
