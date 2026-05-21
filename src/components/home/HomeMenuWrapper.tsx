'use client'
import { useState } from 'react'
import FeaturedSection from './FeaturedSection'
import MenuItemModal from '@/components/menu/MenuItemModal'

interface MenuItem {
  _id: string
  name: string
  description?: string
  price: number
  imageUrl?: string
  tags: string[]
  isAvailable: boolean
  isPopular: boolean
  categoryId: string
}

export default function HomeMenuWrapper({ items }: { items: MenuItem[] }) {
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)

  return (
    <>
      <FeaturedSection items={items} onItemClick={setSelectedItem} />
      <MenuItemModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </>
  )
}
