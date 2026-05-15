'use client'
import { useRef, useEffect } from 'react'
import Link from 'next/link'
import { X, ShoppingCart, Trash2, Plus, Minus } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'

interface CartDrawerProps {
  open: boolean
  onClose: () => void
}

export default function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, removeItem, updateQuantity, getSubtotal, getTotal, discountAmount, couponCode } = useCartStore()
  const drawerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white shadow-2xl transition-transform duration-300 flex flex-col ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-cream-dark bg-burgundy text-white">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            <h2 className="font-bold text-lg">Your Order</h2>
            {items.length > 0 && (
              <span className="bg-orange text-white text-xs rounded-full px-2 py-0.5">
                {items.reduce((s, i) => s + i.quantity, 0)} items
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <ShoppingCart className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-gray-500 font-medium">Your cart is empty</p>
              <p className="text-gray-400 text-sm mt-1">Add items from the menu to get started</p>
              <Button onClick={onClose} className="mt-6 bg-burgundy hover:bg-burgundy-dark text-white">
                Browse Menu
              </Button>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex gap-3 p-3 bg-cream rounded-lg border border-cream-dark">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-charcoal text-sm line-clamp-1">{item.name}</p>
                  <p className="text-orange font-semibold text-sm mt-0.5">{formatCurrency(item.price)}</p>
                  {item.specialInstructions && (
                    <p className="text-gray-500 text-xs mt-1 italic line-clamp-1">
                      Note: {item.specialInstructions}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-6 h-6 rounded-full bg-burgundy/10 hover:bg-burgundy/20 flex items-center justify-center transition-colors"
                    >
                      <Minus className="w-3 h-3 text-burgundy" />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-6 h-6 rounded-full bg-burgundy/10 hover:bg-burgundy/20 flex items-center justify-center transition-colors"
                    >
                      <Plus className="w-3 h-3 text-burgundy" />
                    </button>
                  </div>
                  <p className="text-charcoal font-semibold text-sm">
                    {formatCurrency(item.price * item.quantity)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-cream-dark p-4 bg-white space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(getSubtotal())}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount {couponCode && `(${couponCode})`}</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-charcoal text-base pt-1 border-t border-cream-dark">
                <span>Total</span>
                <span className="text-burgundy">{formatCurrency(getTotal())}</span>
              </div>
            </div>
            <Link href="/checkout" onClick={onClose}>
              <Button className="w-full bg-burgundy hover:bg-burgundy-dark text-white h-12 text-base font-semibold">
                Proceed to Checkout
              </Button>
            </Link>
            <p className="text-center text-xs text-gray-400">Pickup only · Hawthorn VIC</p>
          </div>
        )}
      </div>
    </>
  )
}
