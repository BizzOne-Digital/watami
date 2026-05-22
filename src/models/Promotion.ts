import mongoose, { Schema, Document, Model, Types } from 'mongoose'

export interface IPromotion extends Document {
  title: string
  description?: string
  type: 'percentage' | 'fixed' | 'banner'
  value: number
  code?: string
  startsAt: Date
  endsAt: Date
  isActive: boolean
  appliesTo: 'all' | 'category' | 'item'
  categoryIds?: Types.ObjectId[]
  itemIds?: Types.ObjectId[]
  createdAt: Date
  updatedAt: Date
}

const PromotionSchema = new Schema<IPromotion>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    type: {
      type: String,
      enum: ['percentage', 'fixed', 'banner'],
      required: true,
    },
    value: { type: Number, default: 0 },
    code: { type: String, uppercase: true, trim: true, sparse: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    appliesTo: {
      type: String,
      enum: ['all', 'category', 'item'],
      default: 'all',
    },
    categoryIds: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    itemIds: [{ type: Schema.Types.ObjectId, ref: 'MenuItem' }],
  },
  { timestamps: true }
)

PromotionSchema.index({ isActive: 1 })
PromotionSchema.index({ startsAt: 1, endsAt: 1 })

const Promotion: Model<IPromotion> =
  mongoose.models.Promotion ||
  mongoose.model<IPromotion>('Promotion', PromotionSchema)

export default Promotion
