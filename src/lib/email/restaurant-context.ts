/**
 * Loads restaurant branding from the DB (RestaurantSettings) for use in email templates.
 * Falls back to env/constants if DB is unavailable.
 */
import { connectDB } from '@/lib/db'
import RestaurantSettings from '@/models/RestaurantSettings'
import { resolveEmailLogoUrl } from './restaurant-logo'
import {
  RESTAURANT_DISPLAY_NAME,
  RESTAURANT_ADDRESS_LINES,
  DEFAULT_PICKUP_PREPARE_MINUTES,
} from './constants'

export interface RestaurantEmailContext {
  restaurantName: string
  address: string
  logoUrl: string | null
  pickupPrepareMinutes: number
  email: string
}

export async function loadRestaurantEmailContext(
  siteOrigin?: string
): Promise<RestaurantEmailContext> {
  try {
    await connectDB()
    const settings = await RestaurantSettings.findOne().lean()

    if (settings) {
      return {
        restaurantName: settings.restaurantName || RESTAURANT_DISPLAY_NAME,
        address: settings.address || RESTAURANT_ADDRESS_LINES.join(', '),
        logoUrl: resolveEmailLogoUrl(settings.logoUrl, siteOrigin),
        pickupPrepareMinutes: settings.defaultPreparationMinutes || DEFAULT_PICKUP_PREPARE_MINUTES,
        email: settings.email || '',
      }
    }
  } catch (err) {
    console.warn('[email] Could not load RestaurantSettings for email context:', err)
  }

  // Fallback to env/constants
  return {
    restaurantName: RESTAURANT_DISPLAY_NAME,
    address: RESTAURANT_ADDRESS_LINES.join(', '),
    logoUrl: resolveEmailLogoUrl(process.env.RESTAURANT_LOGO_URL, siteOrigin),
    pickupPrepareMinutes: DEFAULT_PICKUP_PREPARE_MINUTES,
    email: process.env.RESTAURANT_ORDER_EMAIL || '',
  }
}
