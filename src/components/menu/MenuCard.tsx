'use client'
import { Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'

interface MenuCardProps {
  item: {
    _id: string
    name: string
    description?: string
    price: number
    imageUrl?: string
    tags: string[]
    isAvailable: boolean
    isPopular: boolean
  }
  hasPromo?: boolean
  onClick: () => void
}

export default function MenuCard({ item, hasPromo, onClick }: MenuCardProps) {
  return (
    <div
      onClick={onClick}
      className={`group relative bg-white rounded-xl border border-cream-dark hover:border-burgundy/30 hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden ${
        !item.isAvailable ? 'opacity-60' : ''
      }`}
    >
      {/* Image */}
      <div className="relative h-36 bg-gradient-to-br from-cream-dark to-cream overflow-hidden">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={encodeURI(item.imageUrl)}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl group-hover:scale-110 transition-transform duration-200">🍱</span>
          </div>
        )}

        {/* Badges — top left */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {item.isPopular && (
            <Badge variant="popular" className="text-xs py-0">⭐ Popular</Badge>
          )}
          {hasPromo && (
            <Badge variant="promo" className="text-xs py-0">🏷 Promo</Badge>
          )}
          {!item.isAvailable && (
            <Badge variant="unavailable" className="text-xs py-0">Unavailable</Badge>
          )}
        </div>

        {/* Tag badges — top right */}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          {item.tags.includes('vegetarian') && (
            <Badge variant="vegetarian" className="text-xs py-0">V</Badge>
          )}
          {item.tags.includes('gf') && (
            <Badge variant="gf" className="text-xs py-0">GF</Badge>
          )}
          {item.tags.includes('spicy') && (
            <Badge variant="spicy" className="text-xs py-0">🌶</Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="font-semibold text-charcoal text-sm leading-tight line-clamp-2 group-hover:text-burgundy transition-colors">
          {item.name}
        </h3>
        {item.description && (
          <p className="text-gray-500 text-xs mt-1 line-clamp-1">{item.description}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="text-burgundy font-bold text-base">{formatCurrency(item.price)}</span>
          {item.isAvailable && (
            <button
              onClick={(e) => { e.stopPropagation(); onClick() }}
              className="w-7 h-7 rounded-full bg-burgundy hover:bg-burgundy-dark text-white flex items-center justify-center transition-colors shadow-sm"
              aria-label={`Add ${item.name} to cart`}
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
