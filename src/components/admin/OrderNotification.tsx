'use client'
import { useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { ShoppingBag } from 'lucide-react'

const POLL_INTERVAL = 15000 // 15 seconds
const STORAGE_KEY = 'admin_last_order_check'

export default function OrderNotification() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const isFirstRun = useRef(true)

  const playSound = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('/order-notification.mp3.mpeg')
        audioRef.current.volume = 0.8
      }
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {
        // Autoplay blocked — user hasn't interacted yet, silent fail
      })
    } catch {
      // ignore
    }
  }, [])

  const checkNewOrders = useCallback(async () => {
    try {
      const lastCheck = localStorage.getItem(STORAGE_KEY) ?? new Date(Date.now() - POLL_INTERVAL).toISOString()

      const res = await fetch(`/api/admin/orders?status=pending&since=${encodeURIComponent(lastCheck)}&limit=50`)
      if (!res.ok) return

      const data = await res.json()
      const newOrders: { orderNumber: string; customerName: string; total: number }[] = data.orders ?? []

      // Update last check time
      localStorage.setItem(STORAGE_KEY, new Date().toISOString())

      // Skip notification on very first run (page load)
      if (isFirstRun.current) {
        isFirstRun.current = false
        return
      }

      if (newOrders.length > 0) {
        playSound()
        newOrders.forEach((order) => {
          toast(
            <div className="flex items-start gap-3">
              <div className="bg-orange/20 p-2 rounded-full mt-0.5">
                <ShoppingBag className="w-4 h-4 text-orange" />
              </div>
              <div>
                <p className="font-semibold text-charcoal text-sm">New Order #{order.orderNumber}</p>
                <p className="text-gray-500 text-xs">{order.customerName} — ${order.total.toFixed(2)}</p>
              </div>
            </div>,
            {
              duration: 8000,
              position: 'top-right',
            }
          )
        })
      }
    } catch {
      // silent fail — don't spam errors
    }
  }, [playSound])

  useEffect(() => {
    // Reset last check on mount so we only catch orders from now on
    localStorage.setItem(STORAGE_KEY, new Date().toISOString())
    isFirstRun.current = false

    const interval = setInterval(checkNewOrders, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [checkNewOrders])

  return null
}
