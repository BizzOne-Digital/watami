'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { ShoppingCart, Menu, X } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { Button } from '@/components/ui/button'
import CartDrawer from '@/components/cart/CartDrawer'

export default function Header() {
  const pathname = usePathname()
  // Pages that have a white/light background from the very top (no hero image)
  const isWhitePage = pathname !== '/'

  const [scrolled, setScrolled] = useState(false)
  const [scrollOnWhite, setScrollOnWhite] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const itemCount = useCartStore((s) => s.getItemCount())

  // onWhite = true when either we're on a non-home page OR scrolled past the hero
  const onWhite = isWhitePage || scrollOnWhite

  useEffect(() => {
    setMounted(true)
    const handler = () => {
      const y = window.scrollY
      setScrolled(y > 20)
      setScrollOnWhite(y > window.innerHeight - 80)
    }
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/#menu', label: 'Menu' },
    { href: '/#about', label: 'About' },
    { href: '/#contact', label: 'Contact' },
  ]

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          onWhite
            ? 'bg-white/90 backdrop-blur-md border-b border-black/10 shadow-lg'
            : scrolled
              ? 'bg-white/10 backdrop-blur-md border-b border-white/20 shadow-lg'
              : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 md:h-24">
            {/* Logo */}
            <Link href="/" className="flex items-center group">
              <div className="relative h-20 md:h-24 w-auto">
                <Image
                  src="/logo-transparent.webp"
                  alt="Watami Japanese Food"
                  height={96}
                  width={240}
                  className="h-20 md:h-24 w-auto object-contain"
                  priority
                />
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`transition-colors text-base font-medium ${
                    onWhite
                      ? 'text-charcoal/80 hover:text-orange'
                      : 'text-white/80 hover:text-orange'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-4">
              {/* Cart */}
              <button
                onClick={() => setCartOpen(true)}
                className={`relative p-2 transition-colors ${
                  onWhite ? 'text-charcoal hover:text-orange' : 'text-white hover:text-orange'
                }`}
                aria-label="Open cart"
              >
                <ShoppingCart className="w-7 h-7" />
                {mounted && itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-bounce-subtle">
                    {itemCount > 99 ? '99+' : itemCount}
                  </span>
                )}
              </button>

              {/* Order button */}
              <Link href="/#menu">
                <Button size="default" className="hidden sm:flex bg-orange hover:bg-orange-light text-white border-0 text-base px-5">
                  Order Pickup
                </Button>
              </Link>

              {/* Mobile menu toggle */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className={`md:hidden p-2 transition-colors ${
                  onWhite ? 'text-charcoal hover:text-orange' : 'text-white hover:text-orange'
                }`}
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className={`md:hidden border-t animate-fade-in ${onWhite ? 'bg-white border-black/10' : 'bg-charcoal border-white/10'}`}>
            <nav className="px-4 py-4 flex flex-col gap-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`transition-colors py-2 text-base font-medium border-b ${
                    onWhite
                      ? 'text-charcoal/80 hover:text-orange border-black/10'
                      : 'text-white/80 hover:text-orange border-white/10'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <Link href="/#menu" onClick={() => setMobileOpen(false)}>
                <Button className="w-full mt-2 bg-orange hover:bg-orange-light text-white border-0">
                  Order Pickup
                </Button>
              </Link>
            </nav>
          </div>
        )}
      </header>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  )
}
