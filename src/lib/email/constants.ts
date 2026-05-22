/**
 * Email constants — restaurant identity used in all email templates.
 * These are compile-time defaults; runtime values come from RestaurantSettings via loadRestaurantEmailContext().
 */

export const RESTAURANT_DISPLAY_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Watami Japanese Food'

export const RESTAURANT_ADDRESS_LINES = [
  'Shop 5/672 Glenferrie Rd',
  'Hawthorn VIC 3122, Australia',
]

export const DEFAULT_PICKUP_PREPARE_MINUTES = 25

/** "~20–35 min" style window label */
export function formatPickupPrepareWindow(minutes: number): string {
  const lo = Math.max(5, minutes - 5)
  const hi = minutes + 10
  return `~${lo}–${hi} min`
}
