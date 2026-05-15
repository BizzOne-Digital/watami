import { Suspense } from 'react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import HeroSection from '@/components/home/HeroSection'
import PromotionsSection from '@/components/home/PromotionsSection'
import MenuSection from '@/components/menu/MenuSection'
import HomeMenuWrapper from '@/components/home/HomeMenuWrapper'

export const revalidate = 60 // Revalidate every 60 seconds

async function getMenuData() {
  try {
    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
    const [menuRes, promoRes] = await Promise.all([
      fetch(`${baseUrl}/api/menu`, { next: { revalidate: 60 } }),
      fetch(`${baseUrl}/api/promotions`, { next: { revalidate: 60 } }),
    ])

    const menuData = menuRes.ok ? await menuRes.json() : { categories: [], items: [] }
    const promoData = promoRes.ok ? await promoRes.json() : { promotions: [] }

    return {
      categories: menuData.categories ?? [],
      items: menuData.items ?? [],
      promotions: promoData.promotions ?? [],
    }
  } catch {
    return { categories: [], items: [], promotions: [] }
  }
}

export default async function HomePage() {
  const { categories, items, promotions } = await getMenuData()

  // Collect item IDs that have active promotions
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
