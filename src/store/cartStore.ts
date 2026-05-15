import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  specialInstructions?: string
  categoryName?: string
}

interface CartState {
  items: CartItem[]
  couponCode: string
  discountAmount: number
  couponType: 'percentage' | 'fixed' | null
  couponValue: number
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  updateInstructions: (id: string, instructions: string) => void
  clearCart: () => void
  setCoupon: (code: string, discount: number, type: 'percentage' | 'fixed', value: number) => void
  clearCoupon: () => void
  getSubtotal: () => number
  getTotal: () => number
  getItemCount: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      couponCode: '',
      discountAmount: 0,
      couponType: null,
      couponValue: 0,

      addItem: (item) => {
        set((state) => {
          const existing = state.items.find((i) => i.id === item.id)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === item.id
                  ? { ...i, quantity: i.quantity + (item.quantity ?? 1) }
                  : i
              ),
            }
          }
          return {
            items: [...state.items, { ...item, quantity: item.quantity ?? 1 }],
          }
        })
      },

      removeItem: (id) => {
        set((state) => ({ items: state.items.filter((i) => i.id !== id) }))
      },

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id)
          return
        }
        set((state) => ({
          items: state.items.map((i) => (i.id === id ? { ...i, quantity } : i)),
        }))
      },

      updateInstructions: (id, instructions) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id ? { ...i, specialInstructions: instructions } : i
          ),
        }))
      },

      clearCart: () => {
        set({ items: [], couponCode: '', discountAmount: 0, couponType: null, couponValue: 0 })
      },

      setCoupon: (code, discount, type, value) => {
        set({ couponCode: code, discountAmount: discount, couponType: type, couponValue: value })
      },

      clearCoupon: () => {
        set({ couponCode: '', discountAmount: 0, couponType: null, couponValue: 0 })
      },

      getSubtotal: () => {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      },

      getTotal: () => {
        const subtotal = get().getSubtotal()
        return Math.max(0, subtotal - get().discountAmount)
      },

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0)
      },
    }),
    { name: 'watami-cart' }
  )
)
