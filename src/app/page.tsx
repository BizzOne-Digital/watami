import { Suspense } from 'react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import HeroSection from '@/components/home/HeroSection'
import PromotionsSection from '@/components/home/PromotionsSection'
import MenuSection from '@/components/menu/MenuSection'
import HomeMenuWrapper from '@/components/home/HomeMenuWrapper'
import { connectDB } from '@/lib/db'
import Category from '@/models/Category'
import MenuItem from '@/models/MenuItem'
import Promotion from '@/models/Promotion'

export const revalidate = 60

async function getMenuData() {
  try {
    await connectDB()

    const [categories, items, promotions] = await Promise.all([
      Category.find({ isActive: true }).sort({ sortOrder: 1 }).lean(),
      MenuItem.find({ isAvailable: true }).sort({ sortOrder: 1 }).lean(),
      Promotion.find({
        isActive: true,
        startsAt: { $lte: new Date() },
        endsAt: { $gte: new Date() },
      }).lean(),
    ])

    return {
      categories: JSON.parse(JSON.stringify(categories)),
      items: JSON.parse(JSON.stringify(items)),
      promotions: JSON.parse(JSON.stringify(promotions)),
    }
  } catch (err) {
    console.error('Failed to load menu data:', err)
    return { categories: [], items: [], promotions: [] }
  }
}

export default async function HomePage() {
  const { categories, items, promotions } = await getMenuData()

  const promoItemIds = promotions
    .filter((p: { itemIds?: string[] }) => p.itemIds?.length)
    .flatMap((p: { itemIds?: string[] }) => p.itemIds ?? [])

  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <PromotionsSection promotions={promotions} />
        <HomeMenuWrapper items={items} />
        <MenuSection
          categories={categories}
          items={items}
          promoItemIds={promoItemIds}
        />
      </main>
      <Footer />
    </>
  )
}
