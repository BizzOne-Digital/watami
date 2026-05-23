/**
 * Pickup scheduling utilities.
 * All times are handled in Australia/Melbourne timezone.
 */
import type { IRestaurantSettings } from '@/models/RestaurantSettings'

export interface PickupSlot {
  value: string   // ISO string — store/send this
  label: string   // "Today 11:30 AM", "Tomorrow 2:00 PM"
  date: string    // "2025-05-22"
  time: string    // "11:30"
}

const TZ = 'Australia/Melbourne'

/** Format a Date in Melbourne time */
function toMelbourne(date: Date): Date {
  // We use Intl to get the Melbourne wall-clock time parts
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '00'
  return new Date(
    `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`
  )
}

/** Parse "HH:MM" into { hours, minutes } */
function parseTime(t: string): { hours: number; minutes: number } {
  const [h, m] = t.split(':').map(Number)
  return { hours: h, minutes: m }
}

/** Get YYYY-MM-DD string in Melbourne timezone */
function getMelbourneDateStr(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

/** Build a Date from a Melbourne date string + HH:MM time */
function buildMelbourneDate(dateStr: string, timeStr: string): Date {
  // Get Melbourne's UTC offset in minutes at this wall-clock moment.
  // We do this by comparing what UTC time a "fake UTC" date gives
  // when re-read in Melbourne timezone.
  //
  // Example: dateStr="2026-05-23", timeStr="18:00"
  // We want the UTC Date that equals 18:00 Melbourne time.
  //
  // Step 1: treat the wall-clock as UTC to get a starting point
  const fakeUtc = new Date(`${dateStr}T${timeStr}:00Z`)

  // Step 2: read that instant back in Melbourne to find the offset
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(fakeUtc)
  const get = (t: string) => parseInt(parts.find(p => p.type === t)?.value ?? '0')

  // Melbourne wall-clock when fakeUtc is the UTC instant
  const melbH = get('hour')
  const melbM = get('minute')
  const targetH = parseInt(timeStr.split(':')[0])
  const targetM = parseInt(timeStr.split(':')[1])

  // Difference in minutes between what Melbourne shows vs what we want
  const diffMinutes = (targetH * 60 + targetM) - (melbH * 60 + melbM)

  // Adjust fakeUtc by that difference to get the correct UTC instant
  return new Date(fakeUtc.getTime() + diffMinutes * 60 * 1000)
}

/** Format a slot label like "Today 11:30 AM" or "Tomorrow 2:00 PM" */
function formatSlotLabel(dateStr: string, timeStr: string, todayStr: string, tomorrowStr: string): string {
  const timeLabel = new Date(`2000-01-01T${timeStr}:00`).toLocaleTimeString('en-AU', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).toUpperCase()

  if (dateStr === todayStr) return `Today ${timeLabel}`
  if (dateStr === tomorrowStr) return `Tomorrow ${timeLabel}`

  const d = new Date(`${dateStr}T12:00:00`)
  const dayLabel = d.toLocaleDateString('en-AU', { weekday: 'short', month: 'short', day: 'numeric' })
  return `${dayLabel} ${timeLabel}`
}

/**
 * Get all available pickup slots for a given date string (YYYY-MM-DD in Melbourne time).
 * Returns slots that satisfy lead time and are not blocked.
 */
export function getAvailableSlotsForDate(
  dateStr: string,
  settings: IRestaurantSettings,
  now: Date = new Date()
): PickupSlot[] {
  const todayStr = getMelbourneDateStr(now)
  const tomorrowDate = new Date(now.getTime() + 86400000)
  const tomorrowStr = getMelbourneDateStr(tomorrowDate)

  // Find day-of-week for this date (Melbourne)
  const dateObj = new Date(`${dateStr}T12:00:00`)
  const dowInMelbourne = parseInt(
    new Intl.DateTimeFormat('en-AU', { timeZone: TZ, weekday: 'short' })
      .formatToParts(dateObj)
      .find(p => p.type === 'weekday')?.value === 'Mon' ? '1' :
    new Intl.DateTimeFormat('en-AU', { timeZone: TZ, weekday: 'narrow' })
      .format(dateObj) === 'M' ? '1' : '0'
  )

  // Use Intl to get day of week 0-6
  const dayNum = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(
    new Intl.DateTimeFormat('en-AU', { timeZone: TZ, weekday: 'short' }).format(new Date(`${dateStr}T12:00:00`))
  )

  // Check special hours override
  const special = settings.specialHours.find(s => {
    const sDate = getMelbourneDateStr(new Date(s.date))
    return sDate === dateStr
  })

  let isOpen: boolean
  let openTime: string
  let closeTime: string

  if (special) {
    isOpen = special.isOpen
    openTime = special.openTime ?? '11:00'
    closeTime = special.closeTime ?? '21:00'
  } else {
    const weekly = settings.weeklyPickupHours.find(w => w.dayOfWeek === dayNum)
    if (!weekly || !weekly.isOpen) return []
    isOpen = weekly.isOpen
    openTime = weekly.openTime
    closeTime = weekly.closeTime
  }

  if (!isOpen) return []

  const { hours: openH, minutes: openM } = parseTime(openTime)
  const { hours: closeH, minutes: closeM } = parseTime(closeTime)
  const interval = settings.pickupIntervalMinutes || 15
  const leadMinutes = settings.minScheduledLeadTimeMinutes || 30

  // Earliest allowed slot = now + leadMinutes
  const earliestAllowed = new Date(now.getTime() + leadMinutes * 60 * 1000)

  const slots: PickupSlot[] = []

  // Generate all interval slots between open and close
  let slotH = openH
  let slotM = openM

  while (slotH < closeH || (slotH === closeH && slotM < closeM)) {
    const timeStr = `${String(slotH).padStart(2, '0')}:${String(slotM).padStart(2, '0')}`
    const slotDate = buildMelbourneDate(dateStr, timeStr)

    // Must be after earliest allowed
    if (slotDate >= earliestAllowed) {
      // Check not blocked
      const blocked = settings.blockedPickupTimes.some(b => {
        const bDate = getMelbourneDateStr(new Date(b.date))
        if (bDate !== dateStr) return false
        const { hours: bStartH, minutes: bStartM } = parseTime(b.startTime)
        const { hours: bEndH, minutes: bEndM } = parseTime(b.endTime)
        const slotMins = slotH * 60 + slotM
        const blockStart = bStartH * 60 + bStartM
        const blockEnd = bEndH * 60 + bEndM
        return slotMins >= blockStart && slotMins < blockEnd
      })

      if (!blocked) {
        slots.push({
          value: slotDate.toISOString(),
          label: formatSlotLabel(dateStr, timeStr, todayStr, tomorrowStr),
          date: dateStr,
          time: timeStr,
        })
      }
    }

    // Advance by interval
    slotM += interval
    if (slotM >= 60) {
      slotH += Math.floor(slotM / 60)
      slotM = slotM % 60
    }
  }

  return slots
}

/**
 * Get available dates for scheduled pickup (today + up to maxScheduledDaysAhead).
 */
export function getAvailableDates(
  settings: IRestaurantSettings,
  now: Date = new Date()
): string[] {
  const dates: string[] = []
  const max = settings.maxScheduledDaysAhead || 7

  for (let i = 0; i <= max; i++) {
    const d = new Date(now.getTime() + i * 86400000)
    const dateStr = getMelbourneDateStr(d)
    const slots = getAvailableSlotsForDate(dateStr, settings, now)
    if (slots.length > 0) dates.push(dateStr)
  }

  return dates
}

/**
 * Calculate estimated ASAP pickup time.
 * Returns null if restaurant is currently closed.
 */
export function calculateAsapPickupTime(
  settings: IRestaurantSettings,
  now: Date = new Date()
): { time: Date; label: string } | null {
  const prepMins = settings.defaultPreparationMinutes || 25
  const estimated = new Date(now.getTime() + prepMins * 60 * 1000)

  const dateStr = getMelbourneDateStr(estimated)
  const dayNum = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(
    new Intl.DateTimeFormat('en-AU', { timeZone: TZ, weekday: 'short' }).format(new Date(`${dateStr}T12:00:00`))
  )

  const special = settings.specialHours.find(s => getMelbourneDateStr(new Date(s.date)) === dateStr)
  let isOpen: boolean, openTime: string, closeTime: string

  if (special) {
    isOpen = special.isOpen
    openTime = special.openTime ?? '11:00'
    closeTime = special.closeTime ?? '21:00'
  } else {
    const weekly = settings.weeklyPickupHours.find(w => w.dayOfWeek === dayNum)
    if (!weekly || !weekly.isOpen) return null
    isOpen = weekly.isOpen
    openTime = weekly.openTime
    closeTime = weekly.closeTime
  }

  if (!isOpen) return null

  const melbEstimated = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(estimated)
  const estH = parseInt(melbEstimated.find(p => p.type === 'hour')?.value ?? '0')
  const estM = parseInt(melbEstimated.find(p => p.type === 'minute')?.value ?? '0')
  const { hours: closeH, minutes: closeM } = parseTime(closeTime)
  const { hours: openH, minutes: openM } = parseTime(openTime)

  const estMins = estH * 60 + estM
  const closeMins = closeH * 60 + closeM
  const openMins = openH * 60 + openM

  if (estMins < openMins || estMins >= closeMins) return null

  const label = estimated.toLocaleTimeString('en-AU', {
    timeZone: TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).toUpperCase()

  return { time: estimated, label: `~${label}` }
}

/**
 * Validate a scheduled pickup time against restaurant settings.
 * Returns null if valid, or an error string if invalid.
 */
export function validateScheduledPickup(
  requestedTime: Date,
  settings: IRestaurantSettings,
  now: Date = new Date()
): string | null {
  // Must be in the future
  if (requestedTime <= now) return 'Pickup time must be in the future.'

  // Must be within maxScheduledDaysAhead
  const maxMs = settings.maxScheduledDaysAhead * 24 * 60 * 60 * 1000
  if (requestedTime.getTime() - now.getTime() > maxMs) {
    return `Pickup time must be within ${settings.maxScheduledDaysAhead} days.`
  }

  // Must satisfy lead time
  const leadMs = settings.minScheduledLeadTimeMinutes * 60 * 1000
  if (requestedTime.getTime() - now.getTime() < leadMs) {
    return `Pickup time must be at least ${settings.minScheduledLeadTimeMinutes} minutes from now.`
  }

  const dateStr = getMelbourneDateStr(requestedTime)
  const dayNum = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(
    new Intl.DateTimeFormat('en-AU', { timeZone: TZ, weekday: 'short' }).format(new Date(`${dateStr}T12:00:00`))
  )

  const special = settings.specialHours.find(s => getMelbourneDateStr(new Date(s.date)) === dateStr)
  let isOpen: boolean, openTime: string, closeTime: string

  if (special) {
    isOpen = special.isOpen
    openTime = special.openTime ?? '11:00'
    closeTime = special.closeTime ?? '21:00'
  } else {
    const weekly = settings.weeklyPickupHours.find(w => w.dayOfWeek === dayNum)
    if (!weekly || !weekly.isOpen) return 'Restaurant is closed on the selected date.'
    isOpen = weekly.isOpen
    openTime = weekly.openTime
    closeTime = weekly.closeTime
  }

  if (!isOpen) return 'Restaurant is closed on the selected date.'

  // Read the requested time in Melbourne wall-clock using Intl (works on any server timezone)
  const melbFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
  const melbTimeParts = melbFormatter.formatToParts(requestedTime)
  const reqH = parseInt(melbTimeParts.find(p => p.type === 'hour')?.value ?? '0')
  const reqM = parseInt(melbTimeParts.find(p => p.type === 'minute')?.value ?? '0')
  const { hours: openH, minutes: openM } = parseTime(openTime)
  const { hours: closeH, minutes: closeM } = parseTime(closeTime)

  const reqMins = reqH * 60 + reqM
  if (reqMins < openH * 60 + openM) return `Pickup time is before opening hours (${openTime}).`
  if (reqMins >= closeH * 60 + closeM) return `Pickup time is after closing hours (${closeTime}).`

  // Check blocked times
  const blocked = settings.blockedPickupTimes.some(b => {
    const bDate = getMelbourneDateStr(new Date(b.date))
    if (bDate !== dateStr) return false
    const { hours: bStartH, minutes: bStartM } = parseTime(b.startTime)
    const { hours: bEndH, minutes: bEndM } = parseTime(b.endTime)
    const blockStart = bStartH * 60 + bStartM
    const blockEnd = bEndH * 60 + bEndM
    return reqMins >= blockStart && reqMins < blockEnd
  })

  if (blocked) return 'The selected pickup time is unavailable.'

  return null
}

/** Format a pickup time for display */
export function formatPickupTime(date: Date, tz = TZ): string {
  return date.toLocaleString('en-AU', {
    timeZone: tz,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/** Get Melbourne date string helper — exported for use in API routes */
export function getMelbourneDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date)
}
