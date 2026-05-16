import Link from 'next/link'
import { MapPin, Clock, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-charcoal via-burgundy-dark to-charcoal" />
      {/* Pattern overlay */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center px-4 sm:px-6 max-w-4xl mx-auto pt-20">
        {/* Pickup badge */}
        <div className="inline-flex items-center gap-2 bg-orange/20 border border-orange/40 text-orange rounded-full px-4 py-1.5 text-sm font-medium mb-6 animate-fade-in">
          <ShoppingBag className="w-4 h-4" />
          Pickup Orders Only
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 leading-tight animate-slide-up">
          Watami
          <span className="block text-orange">Japanese Food</span>
        </h1>

        <p className="text-white/70 text-lg md:text-xl mb-8 max-w-2xl mx-auto animate-slide-up">
          Authentic Japanese cuisine crafted with passion. Fresh sushi, hearty ramen, and premium bento — ready for pickup.
        </p>

        {/* Address */}
        <div className="flex items-center justify-center gap-2 text-white/60 text-sm mb-8">
          <MapPin className="w-4 h-4 text-orange" />
          <span>Shop 5/672 Glenferrie Rd, Hawthorn VIC 3122</span>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 animate-slide-up">
          <Link href="/#menu">
            <Button size="lg" className="bg-orange hover:bg-orange-light text-white border-0 px-8 h-14 text-base font-semibold shadow-lg shadow-orange/30">
              <ShoppingBag className="w-5 h-5 mr-2" />
              Order Pickup Now
            </Button>
          </Link>
          <Link href="/#menu">
            <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 hover:text-white px-8 h-14 text-base">
              View Menu
            </Button>
          </Link>
        </div>

        {/* Highlight cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
          {[
            { emoji: '🍣', label: 'Fresh Sushi' },
            { emoji: '🍱', label: 'Bento Meals' },
            { emoji: '🍜', label: 'Ramen & Udon' },
            { emoji: '⚡', label: 'Pickup Ready' },
          ].map((card) => (
            <div
              key={card.label}
              className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3 text-center hover:bg-white/15 transition-colors"
            >
              <div className="text-2xl mb-1">{card.emoji}</div>
              <p className="text-white/80 text-xs font-medium">{card.label}</p>
            </div>
          ))}
        </div>
      </div>


    </section>
  )
}
