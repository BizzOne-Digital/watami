import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import RestaurantSettings from '@/models/RestaurantSettings'
import {
  getAvailableSlotsForDate,
  getAvailableDates,
  calculateAsapPickupTime,
  getMelbourneDateString,
} from '@/lib/pickup'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    await connectDB()

    let settings = await RestaurantSettings.findOne().lean()

    // Auto-create defaults if none exist (first deploy)
    if (!settings) {
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

    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date') // YYYY-MM-DD

    const now = new Date()

    if (date) {
      // Return slots for a specific date
      const slots = getAvailableSlotsForDate(date, settings, now)
      return NextResponse.json({ slots })
    }

    // Return available dates + ASAP info
    const availableDates = getAvailableDates(settings, now)
    const asap = calculateAsapPickupTime(settings, now)

    return NextResponse.json({
      pickupEnabled: settings.pickupEnabled,
      asapPickupEnabled: settings.asapPickupEnabled,
      scheduledPickupEnabled: settings.scheduledPickupEnabled,
      defaultPreparationMinutes: settings.defaultPreparationMinutes,
      availableDates,
      asapEstimate: asap
        ? { time: asap.time.toISOString(), label: asap.label }
        : null,
      timezone: settings.timezone,
    })
  } catch (error) {
    console.error('Pickup slots error:', error)
    return NextResponse.json({ error: 'Failed to load pickup settings' }, { status: 500 })
  }
}
