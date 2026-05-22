import mongoose, { Schema, Document, Model, Types } from 'mongoose'

export type PickupType = 'asap' | 'scheduled'

export interface IOrderItem {
  menuItemId: Types.ObjectId
  name: string
  price: number
  quantity: number
  specialInstructions?: string
}

export interface IStatusEmailLogEntry {
  status: string
  sentAt: Date
  recipient: string
}

export interface IOrder extends Document {
  orderNumber: string
  customerName: string
  customerPhone: string
  customerEmail: string
  items: IOrderItem[]
  subtotal: number
  discountAmount: number
  tipPercentage: number
  tipAmount: number
  total: number
  couponCode?: string
  pickupOnly: boolean
  // Pickup scheduling
  pickupType: PickupType
  requestedPickupTime: Date | null
  estimatedPickupTime: Date | null
  pickupWindowLabel: string
  status:
    | 'pending_payment'
    | 'pending'
    | 'accepted'
    | 'preparing'
    | 'ready_for_pickup'
    | 'completed'
    | 'cancelled'
  paymentIntentId?: string
  paymentStatus?: 'unpaid' | 'paid' | 'failed'
  // Email idempotency flags
  merchantNotificationEmailSent: boolean
  merchantNotificationEmailSentAt?: Date
  confirmationEmailSent: boolean
  confirmationEmailSentAt?: Date
  confirmationEmailStatus: 'sent' | 'failed' | 'skipped'
  confirmationEmailError?: string
  statusEmailLog: IStatusEmailLogEntry[]
  createdAt: Date
  updatedAt: Date
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    specialInstructions: { type: String },
  },
  { _id: false }
)

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, required: true, trim: true },
    customerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    items: [OrderItemSchema],
    subtotal: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    tipPercentage: { type: Number, default: 0 },
    tipAmount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    couponCode: { type: String },
    pickupOnly: { type: Boolean, default: true },
    // Pickup scheduling
    pickupType: {
      type: String,
      enum: ['asap', 'scheduled'],
      required: true,
      default: 'asap',
      index: true,
    },
    requestedPickupTime: { type: Date, default: null },
    estimatedPickupTime: { type: Date, default: null },
    pickupWindowLabel: { type: String, default: 'ASAP' },
    status: {
      type: String,
      enum: [
        'pending_payment',
        'pending',
        'accepted',
        'preparing',
        'ready_for_pickup',
        'completed',
        'cancelled',
      ],
      default: 'pending_payment',
      index: true,
    },
    paymentIntentId: { type: String, index: true },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'failed'],
      default: 'unpaid',
    },
    // Email idempotency flags
    merchantNotificationEmailSent: { type: Boolean, default: false },
    merchantNotificationEmailSentAt: { type: Date },
    confirmationEmailSent: { type: Boolean, default: false },
    confirmationEmailSentAt: { type: Date },
    confirmationEmailStatus: {
      type: String,
      enum: ['sent', 'failed', 'skipped'],
      default: 'skipped',
    },
    confirmationEmailError: { type: String },
    statusEmailLog: {
      type: [
        new Schema<IStatusEmailLogEntry>(
          {
            status: { type: String, required: true },
            sentAt: { type: Date, required: true },
            recipient: { type: String, required: true },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  { timestamps: true }
)

OrderSchema.index({ createdAt: -1 })
OrderSchema.index({ status: 1, createdAt: -1 })
OrderSchema.index({ pickupType: 1, createdAt: -1 })
OrderSchema.index({ requestedPickupTime: 1 })

const Order: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema)

export default Order
