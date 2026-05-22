'use client'
import { useRef, useEffect, useCallback } from 'react'

interface DrumTimePickerProps {
  slots: string[]          // ["11:00", "11:15", "11:30", ...]
  value: string            // currently selected "HH:MM"
  onChange: (time: string) => void
  disabled?: boolean
}

const ITEM_HEIGHT = 44  // px per row

export default function DrumTimePicker({ slots, value, onChange, disabled }: DrumTimePickerProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const startY = useRef(0)
  const startScrollTop = useRef(0)

  const selectedIndex = slots.indexOf(value)

  // Scroll to selected item
  const scrollToIndex = useCallback((index: number, smooth = true) => {
    if (!listRef.current) return
    const target = index * ITEM_HEIGHT
    listRef.current.scrollTo({ top: target, behavior: smooth ? 'smooth' : 'instant' })
  }, [])

  // On mount and value change, scroll to selected
  useEffect(() => {
    if (selectedIndex >= 0) scrollToIndex(selectedIndex, false)
  }, [selectedIndex, scrollToIndex])

  // Snap to nearest item after scroll ends
  const snapToNearest = useCallback(() => {
    if (!listRef.current) return
    const scrollTop = listRef.current.scrollTop
    const index = Math.round(scrollTop / ITEM_HEIGHT)
    const clamped = Math.max(0, Math.min(slots.length - 1, index))
    scrollToIndex(clamped)
    onChange(slots[clamped])
  }, [slots, onChange, scrollToIndex])

  // Handle scroll end
  useEffect(() => {
    const el = listRef.current
    if (!el) return
    let timer: ReturnType<typeof setTimeout>
    const onScroll = () => {
      clearTimeout(timer)
      timer = setTimeout(snapToNearest, 120)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => { el.removeEventListener('scroll', onScroll); clearTimeout(timer) }
  }, [snapToNearest])

  // Touch drag support
  const onTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY
    startScrollTop.current = listRef.current?.scrollTop ?? 0
  }
  const onTouchMove = (e: React.TouchEvent) => {
    if (!listRef.current) return
    const dy = startY.current - e.touches[0].clientY
    listRef.current.scrollTop = startScrollTop.current + dy
  }

  // Mouse drag support (desktop)
  const onMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true
    startY.current = e.clientY
    startScrollTop.current = listRef.current?.scrollTop ?? 0
    e.preventDefault()
  }
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !listRef.current) return
      const dy = startY.current - e.clientY
      listRef.current.scrollTop = startScrollTop.current + dy
    }
    const onMouseUp = () => { isDragging.current = false }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  if (slots.length === 0) return null

  return (
    <div className={`relative w-full select-none ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      {/* Top fade */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none rounded-t-xl" />
      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none rounded-b-xl" />
      {/* Selection highlight */}
      <div
        className="absolute left-0 right-0 z-10 pointer-events-none border-y-2 border-burgundy/30 bg-burgundy/5"
        style={{ top: '50%', transform: 'translateY(-50%)', height: ITEM_HEIGHT }}
      />

      {/* Scrollable drum */}
      <div
        ref={listRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onMouseDown={onMouseDown}
        className="overflow-y-scroll cursor-grab active:cursor-grabbing"
        style={{
          height: ITEM_HEIGHT * 5,   // show 5 items
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {/* Top padding — 2 blank rows so first item can center */}
        <div style={{ height: ITEM_HEIGHT * 2 }} />

        {slots.map((slot, i) => (
          <div
            key={slot}
            onClick={() => { onChange(slot); scrollToIndex(i) }}
            style={{ height: ITEM_HEIGHT }}
            className={`flex items-center justify-center text-base font-medium transition-all cursor-pointer ${
              slot === value
                ? 'text-burgundy font-bold text-lg scale-105'
                : 'text-gray-400'
            }`}
          >
            {slot}
          </div>
        ))}

        {/* Bottom padding */}
        <div style={{ height: ITEM_HEIGHT * 2 }} />
      </div>

      {/* Hide scrollbar for webkit */}
      <style>{`
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}
