import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IWeeklyPickupHours {
  dayOfWeek: number // 0 = Sunday, 6 = Saturday
  isOpen: boolean
  openTime: string  // "11:00"
  closeTime: string // "21:00"
}

export interface IBlockedPickupTime {
  date: Date
  startTime: string // "12:00"
  endTime: string   // "14:00"
  reason?: string
}

export interface ISpecialHours {
  date: Date
  isOpen: boolean
  openTime?: string
  closeTime?: string
  reason?: string
}

export interface IRestaurantSettings extends Document {
  restaurantName: string
  address: string
  phone: string
  email: string
  openingHoursText: string
  pickupEnabled: boolean
  asapPickupEnabled: boolean
  scheduledPickupEnabled: boolean
  defaultPreparationMinutes: number
  minScheduledLeadTimeMinutes: number
  maxScheduledDaysAhead: number
  pickupIntervalMinutes: number
  timezone: string
  weeklyPickupHours: IWeeklyPickupHours[]
  blockedPickupTimes: IBlockedPickupTime[]
  specialHours: ISpecialHours[]
  createdAt: Date
  updatedAt: Date
}

const WeeklyPickupHoursSchema = new Schema<IWeeklyPickupHours>(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    isOpen: { type: Boolean, default: true },
    openTime: { type: String, default: '11:00' },
    closeTime: { type: String, default: '21:00' },
  },
  { _id: false }
)

const BlockedPickupTimeSchema = new Schema<IBlockedPickupTime>(
  {
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    reason: { type: String },
  },
  { _id: true }
)

const SpecialHoursSchema = new Schema<ISpecialHours>(
  {
    date: { type: Date, required: true },
    isOpen: { type: Boolean, required: true },
    openTime: { type: String },
    closeTime: { type: String },
    reason: { type: String },
  },
  { _id: true }
)

const RestaurantSettingsSchema = new Schema<IRestaurantSettings>(
  {
    restaurantName: { type: String, default: 'Watami Japanese Food' },
    address: { type: String, default: 'Shop 5/672 Glenferrie Rd, Hawthorn VIC 3122, Australia' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    openingHoursText: { type: String, default: 'Mon–Sun · 11:00 AM – 9:00 PM' },
    pickupEnabled: { type: Boolean, default: true },
    asapPickupEnabled: { type: Boolean, default: true },
    scheduledPickupEnabled: { type: Boolean, default: true },
    defaultPreparationMinutes: { type: Number, default: 25 },
    minScheduledLeadTimeMinutes: { type: Number, default: 30 },
    maxScheduledDaysAhead: { type: Number, default: 7 },
    pickupIntervalMinutes: { type: Number, default: 15 },
    timezone: { type: String, default: 'Australia/Melbourne' },
    weeklyPickupHours: { type: [WeeklyPickupHoursSchema], default: [] },
    blockedPickupTimes: { type: [BlockedPickupTimeSchema], default: [] },
    specialHours: { type: [SpecialHoursSchema], default: [] },
  },
  { timestamps: true }
)

RestaurantSettingsSchema.index({ updatedAt: -1 })

const RestaurantSettings: Model<IRestaurantSettings> =
  mongoose.models.RestaurantSettings ||
  mongoose.model<IRestaurantSettings>('RestaurantSettings', RestaurantSettingsSchema)

export default RestaurantSettings
