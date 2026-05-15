'use client'
import { useState, useEffect, useRef } from 'react'
import { Search } from 'lucide-react'
import MenuCard from './MenuCard'
import MenuItemModal from './MenuItemModal'

interface Category {
  _id: string
  name: string
  slug: string
  sortOrder: number
}

interface MenuItem {
  _id: string
  name: string
  description?: string
  price: number
  categoryId: string
  tags: string[]
  isAvailable: boolean
  isPopular: boolean
}

interface MenuSectionProps {
  categories: Category[]
  items: MenuItem[]
  promoItemIds?: string[]
}

export default function MenuSection({ categories, items, promoItemIds = [] }: MenuSectionProps) {
  const [activeCategory, setActiveCategory] = useState(categories[0]?._id ?? '')
  const [search, setSearch] = useState('')
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const tabsRef = useRef<HTMLDivElement>(null)

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description?.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = !search && activeCategory ? item.categoryId === activeCategory : true
    return search ? matchesSearch : matchesSearch && matchesCategory
  })

  const categoryMap = Object.fromEntries(categories.map((c) => [c._id, c.name]))

  const scrollTabIntoView = (id: string) => {
    const el = tabsRef.current?.querySelector(`[data-cat="${id}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }

  return (
    <section id="menu" className="py-12 bg-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-charcoal mb-2">Our Menu</h2>
          <p className="text-gray-500">Fresh Japanese cuisine, made to order</p>
        </div>

        {/* Search */}
        <div className="relative max-w-md mx-auto mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search menu items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-full border border-cream-dark bg-white focus:outline-none focus:ring-2 focus:ring-burgundy text-sm shadow-sm"
          />
        </div>

        {/* Category tabs */}
        {!search && (
          <div
            ref={tabsRef}
            className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide"
            style={{ scrollbarWidth: 'none' }}
          >
            {categories.map((cat) => (
              <button
                key={cat._id}
                data-cat={cat._id}
                onClick={() => {
                  setActiveCategory(cat._id)
                  scrollTabIntoView(cat._id)
                }}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeCategory === cat._id
                    ? 'bg-burgundy text-white shadow-md'
                    : 'bg-white text-charcoal border border-cream-dark hover:border-burgundy/40 hover:text-burgundy'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Items grid */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">No items found</p>
            {search && (
              <button onClick={() => setSearch('')} className="mt-2 text-burgundy hover:underline text-sm">
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4 animate-fade-in">
            {filteredItems.map((item) => (
              <MenuCard
                key={item._id}
                item={item}
                hasPromo={promoItemIds.includes(item._id)}
                onClick={() => setSelectedItem(item)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Item modal */}
      <MenuItemModal
        item={selectedItem ? { ...selectedItem, categoryName: categoryMap[selectedItem.categoryId] } : null}
        hasPromo={selectedItem ? promoItemIds.includes(selectedItem._id) : false}
        onClose={() => setSelectedItem(null)}
      />
    </section>
  )
}
