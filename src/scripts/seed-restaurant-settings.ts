/**
 * Seeds default RestaurantSettings into MongoDB.
 * Safe to run multiple times — upserts, never duplicates.
 *
 * Run: npx tsx src/scripts/seed-restaurant-settings.ts
 * Against production: MONGODB_URI="mongodb+srv://..." npx tsx src/scripts/seed-restaurant-settings.ts
 */
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const MONGODB_URI = process.env.MONGODB_URI!
if (!MONGODB_URI) throw new Error('MONGODB_URI not set')

const Schema = mongoose.Schema

const settingsSchema = new Schema({}, { strict: false, timestamps: true })
const RestaurantSettings =
  mongoose.models.RestaurantSettings ||
  mongoose.model('RestaurantSettings', settingsSchema)

const defaultSettings = {
  restaurantName: 'Watami Japanese Food',
  address: 'Shop 5/672 Glenferrie Rd, Hawthorn VIC 3122, Australia',
  pickupEnabled: true,
  asapPickupEnabled: true,
  scheduledPickupEnabled: true,
  defaultPreparationMinutes: 25,
  minScheduledLeadTimeMinutes: 30,
  maxScheduledDaysAhead: 7,
  pickupIntervalMinutes: 15,
  timezone: 'Australia/Melbourne',
  weeklyPickupHours: [
    { dayOfWeek: 0, isOpen: true, openTime: '11:00', closeTime: '21:00' }, // Sunday
    { dayOfWeek: 1, isOpen: true, openTime: '11:00', closeTime: '21:00' }, // Monday
    { dayOfWeek: 2, isOpen: true, openTime: '11:00', closeTime: '21:00' }, // Tuesday
    { dayOfWeek: 3, isOpen: true, openTime: '11:00', closeTime: '21:00' }, // Wednesday
    { dayOfWeek: 4, isOpen: true, openTime: '11:00', closeTime: '21:00' }, // Thursday
    { dayOfWeek: 5, isOpen: true, openTime: '11:00', closeTime: '21:00' }, // Friday
    { dayOfWeek: 6, isOpen: true, openTime: '11:00', closeTime: '21:00' }, // Saturday
  ],
  blockedPickupTimes: [],
  specialHours: [],
}

async function run() {
  await mongoose.connect(MONGODB_URI)
  console.log('Connected to MongoDB')

  const existing = await RestaurantSettings.findOne()
  if (existing) {
    console.log('RestaurantSettings already exists — updating with any missing fields...')
    await RestaurantSettings.findOneAndUpdate({}, { $set: defaultSettings }, { new: true })
    console.log('✓ Updated')
  } else {
    await RestaurantSettings.create(defaultSettings)
    console.log('✓ Created default RestaurantSettings')
  }

  await mongoose.disconnect()
  console.log('Done.')
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
