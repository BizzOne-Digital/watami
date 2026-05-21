'use client'
import { useState } from 'react'
import { Plus, Minus, X, Star, Tag } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCartStore } from '@/store/cartStore'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'

interface MenuItemModalProps {
  item: {
    _id: string
    name: string
    description?: string
    price: number
    imageUrl?: string
    tags: string[]
    isAvailable: boolean
    isPopular: boolean
    categoryName?: string
  } | null
  hasPromo?: boolean
  onClose: () => void
}

export default function MenuItemModal({ item, hasPromo, onClose }: MenuItemModalProps) {
  const [quantity, setQuantity] = useState(1)
  const [instructions, setInstructions] = useState('')
  const addItem = useCartStore((s) => s.addItem)

  if (!item) return null

  const handleAdd = () => {
    addItem({
      id: item._id,
      name: item.name,
      price: item.price,
      quantity,
      specialInstructions: instructions || undefined,
      categoryName: item.categoryName,
    })
    toast.success(`${item.name} added to cart`, {
      description: `${quantity}x · ${formatCurrency(item.price * quantity)}`,
    })
    onClose()
    setQuantity(1)
    setInstructions('')
  }

  return (
    <Dialog open={!!item} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl">
        {/* Hidden title for accessibility */}
        <DialogTitle className="sr-only">{item.name}</DialogTitle>
        {/* Header image area */}
        <div className="relative h-48 bg-gradient-to-br from-burgundy to-charcoal flex items-center justify-center overflow-hidden">
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imageUrl}
              alt={item.name}
              className="w-full h-full object-cover opacity-90"
            />
          ) : (
            <div className="text-center text-white px-6">
              <div className="text-5xl mb-2">🍱</div>
            </div>
          )}
          {/* Dark overlay for text readability when image present */}
          {item.imageUrl && (
            <div className="absolute inset-0 bg-black/30" />
          )}
          {item.categoryName && (
            <div className="absolute bottom-3 left-4 z-10">
              <p className="text-white/80 text-xs uppercase tracking-wider">{item.categoryName}</p>
            </div>
          )}
          {/* Badges overlay */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1 z-10">
            {!item.isAvailable && <Badge variant="unavailable">Unavailable</Badge>}
            {item.isPopular && <Badge variant="popular">⭐ Popular</Badge>}
            {hasPromo && <Badge variant="promo">🏷 Promo</Badge>}
            {item.tags.includes('vegetarian') && <Badge variant="vegetarian">🌿 Veg</Badge>}
            {item.tags.includes('gf') && <Badge variant="gf">GF</Badge>}
            {item.tags.includes('spicy') && <Badge variant="spicy">🌶 Spicy</Badge>}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-xl font-bold text-charcoal leading-tight">{item.name}</h2>
            <span className="text-2xl font-bold text-burgundy whitespace-nowrap">
              {formatCurrency(item.price)}
            </span>
          </div>

          {item.description && (
            <p className="text-gray-600 text-sm leading-relaxed">{item.description}</p>
          )}

          {/* Special instructions */}
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">
              Special Instructions <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="E.g. no wasabi, extra sauce..."
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-burgundy resize-none"
              maxLength={200}
            />
          </div>

          {/* Quantity + Add */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-cream rounded-full px-4 py-2">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-7 h-7 rounded-full bg-burgundy/10 hover:bg-burgundy/20 flex items-center justify-center transition-colors"
                disabled={quantity <= 1}
              >
                <Minus className="w-3.5 h-3.5 text-burgundy" />
              </button>
              <span className="w-6 text-center font-bold text-charcoal">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-7 h-7 rounded-full bg-burgundy/10 hover:bg-burgundy/20 flex items-center justify-center transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-burgundy" />
              </button>
            </div>

            <Button
              onClick={handleAdd}
              disabled={!item.isAvailable}
              className="flex-1 bg-burgundy hover:bg-burgundy-dark text-white h-11 font-semibold"
            >
              {item.isAvailable
                ? `Add to Cart · ${formatCurrency(item.price * quantity)}`
                : 'Currently Unavailable'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
