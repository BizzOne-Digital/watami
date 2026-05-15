'use client'
import { Star } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface MenuItem {
  _id: string
  name: string
  description?: string
  price: number
  tags: string[]
  isAvailable: boolean
  isPopular: boolean
  categoryId: string
}

interface FeaturedSectionProps {
  items: MenuItem[]
  onItemClick: (item: MenuItem) => void
}

export default function FeaturedSection({ items, onItemClick }: FeaturedSectionProps) {
  const featured = items.filter((i) => i.isPopular).slice(0, 6)
  if (featured.length === 0) return null

  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-8">
          <Star className="w-6 h-6 text-orange fill-orange" />
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-charcoal">Popular Items</h2>
            <p className="text-gray-500 text-sm">Our most-loved dishes</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {featured.map((item) => (
            <div
              key={item._id}
              onClick={() => onItemClick(item)}
              className="group cursor-pointer bg-cream rounded-xl p-4 hover:shadow-md transition-all duration-200 hover:-translate-y-1 border border-cream-dark hover:border-burgundy/30"
            >
              <div className="text-3xl mb-2 text-center group-hover:scale-110 transition-transform">🍱</div>
              <h3 className="font-semibold text-charcoal text-xs leading-tight line-clamp-2 group-hover:text-burgundy transition-colors text-center">
                {item.name}
              </h3>
              <p className="text-burgundy font-bold text-sm mt-1 text-center">{formatCurrency(item.price)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
