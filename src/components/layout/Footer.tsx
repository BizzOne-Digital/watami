import Link from 'next/link'
import { MapPin, Phone, Mail, Clock } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-charcoal text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <h3 className="text-xl font-bold text-orange mb-3">Watami</h3>
            <p className="text-white/60 text-sm mb-4">
              Authentic Japanese cuisine crafted with care. Fresh sushi, bento, ramen, and more — ready for pickup.
            </p>
            <div className="flex items-start gap-2 text-sm text-white/70">
              <MapPin className="w-4 h-4 mt-0.5 text-orange flex-shrink-0" />
              <span>Shop 5/672 Glenferrie Rd,<br />Hawthorn VIC 3122, Australia</span>
            </div>
          </div>

          {/* Opening Hours */}
          <div>
            <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange" />
              Opening Hours
            </h4>
            <ul className="space-y-1 text-sm text-white/70">
              <li className="flex justify-between"><span>Monday – Friday</span><span>11:00 – 21:00</span></li>
              <li className="flex justify-between"><span>Saturday</span><span>11:00 – 21:30</span></li>
              <li className="flex justify-between"><span>Sunday</span><span>11:00 – 21:00</span></li>
            </ul>
            <p className="text-xs text-orange mt-3">Pickup orders only</p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-white mb-3">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="text-white/70 hover:text-orange transition-colors">Home</Link></li>
              <li><Link href="/#menu" className="text-white/70 hover:text-orange transition-colors">Menu</Link></li>
              <li><Link href="/checkout" className="text-white/70 hover:text-orange transition-colors">Checkout</Link></li>
              <li><Link href="/admin/login" className="text-white/70 hover:text-orange transition-colors">Admin</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-white mb-3">Contact</h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-orange" />
                <span>(03) 9000 0000</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-orange" />
                <span>info@watami.com.au</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-orange mt-0.5" />
                <span>Shop 5/672 Glenferrie Rd,<br />Hawthorn VIC 3122</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/50 text-sm">
            © {new Date().getFullYear()} Watami Japanese Food. All rights reserved.
          </p>
          <p className="text-white/40 text-xs">
            Pickup orders only · Hawthorn, Melbourne VIC
          </p>
        </div>
      </div>
    </footer>
  )
}
