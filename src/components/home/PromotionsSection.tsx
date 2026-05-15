'use client'
import { Tag, Clock } from 'lucide-react'

interface Promotion {
  _id: string
  title: string
  description?: string
  type: string
  value: number
  code?: string
  endsAt: string
}

interface PromotionsSectionProps {
  promotions: Promotion[]
}

export default function PromotionsSection({ promotions }: PromotionsSectionProps) {
  if (promotions.length === 0) return null

  return (
    <section className="py-10 bg-gradient-to-r from-burgundy to-burgundy-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-6">
          <Tag className="w-6 h-6 text-orange" />
          <h2 className="text-2xl font-bold text-white">Current Promotions</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {promotions.map((promo) => (
            <div
              key={promo._id}
              className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 hover:bg-white/15 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-bold text-white text-base">{promo.title}</h3>
                {promo.type !== 'banner' && (
                  <span className="bg-orange text-white text-sm font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                    {promo.type === 'percentage' ? `${promo.value}% OFF` : `$${promo.value} OFF`}
                  </span>
                )}
              </div>
              {promo.description && (
                <p className="text-white/70 text-sm mb-3">{promo.description}</p>
              )}
              {promo.code && (
                <div className="flex items-center gap-2">
                  <span className="text-white/60 text-xs">Code:</span>
                  <code className="bg-white/20 text-orange font-mono font-bold px-2 py-0.5 rounded text-sm">
                    {promo.code}
                  </code>
                </div>
              )}
              <div className="flex items-center gap-1 mt-2 text-white/50 text-xs">
                <Clock className="w-3 h-3" />
                <span>Ends {new Date(promo.endsAt).toLocaleDateString('en-AU')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
