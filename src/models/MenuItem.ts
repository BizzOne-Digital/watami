import mongoose, { Schema, Document, Model, Types } from 'mongoose'

export interface IMenuItem extends Document {
  name: string
  slug: string
  description?: string
  price: number
  categoryId: Types.ObjectId
  imageUrl?: string
  tags: string[]
  isAvailable: boolean
  isPopular: boolean
  popularOverride: 'auto' | 'force_popular' | 'force_not_popular'
  orderCount: number
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

const MenuItemSchema = new Schema<IMenuItem>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    imageUrl: { type: String },
    tags: [{ type: String }],
    isAvailable: { type: Boolean, default: true },
    isPopular: { type: Boolean, default: false },
    popularOverride: {
      type: String,
      enum: ['auto', 'force_popular', 'force_not_popular'],
      default: 'auto',
    },
    orderCount: { type: Number, default: 0, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
)

MenuItemSchema.index({ categoryId: 1, sortOrder: 1 })
MenuItemSchema.index({ isAvailable: 1 })
MenuItemSchema.index({ isPopular: 1 })

const MenuItem: Model<IMenuItem> =
  mongoose.models.MenuItem ||
  mongoose.model<IMenuItem>('MenuItem', MenuItemSchema)

export default MenuItem
