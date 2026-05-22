'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader2, Clock, Save, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const INTERVAL_OPTIONS = [10, 15, 20, 30]

interface WeeklyHours {
  dayOfWeek: number
  isOpen: boolean
  openTime: string
  closeTime: string
}

interface BlockedTime {
  _id?: string
  date: string
  startTime: string
  endTime: string
  reason: string
}

interface SpecialHours {
  _id?: string
  date: string
  isOpen: boolean
  openTime: string
  closeTime: string
  reason: string
}

interface Settings {
  pickupEnabled: boolean
  asapPickupEnabled: boolean
  scheduledPickupEnabled: boolean
  defaultPreparationMinutes: number
  minScheduledLeadTimeMinutes: number
  maxScheduledDaysAhead: number
  pickupIntervalMinutes: number
  timezone: string
  weeklyPickupHours: WeeklyHours[]
  blockedPickupTimes: BlockedTime[]
  specialHours: SpecialHours[]
}

const defaultSettings: Settings = {
  pickupEnabled: true,
  asapPickupEnabled: true,
  scheduledPickupEnabled: true,
  defaultPreparationMinutes: 25,
  minScheduledLeadTimeMinutes: 30,
  maxScheduledDaysAhead: 7,
  pickupIntervalMinutes: 15,
  timezone: 'Australia/Melbourne',
  weeklyPickupHours: DAYS.map((_, i) => ({
    dayOfWeek: i,
    isOpen: true,
    openTime: '11:00',
    closeTime: '21:00',
  })),
  blockedPickupTimes: [],
  specialHours: [],
}

export default function PickupSettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/restaurant-settings')
      .then(r => r.json())
      .then(data => {
        if (data.settings) {
          // Ensure weeklyPickupHours has all 7 days
          const hours = [...(data.settings.weeklyPickupHours ?? [])]
          for (let i = 0; i < 7; i++) {
            if (!hours.find((h: WeeklyHours) => h.dayOfWeek === i)) {
              hours.push({ dayOfWeek: i, isOpen: true, openTime: '11:00', closeTime: '21:00' })
            }
          }
          hours.sort((a: WeeklyHours, b: WeeklyHours) => a.dayOfWeek - b.dayOfWeek)
          setSettings({ ...defaultSettings, ...data.settings, weeklyPickupHours: hours })
        }
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/restaurant-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!res.ok) throw new Error()
      toast.success('Pickup settings saved')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const updateWeekly = (dayOfWeek: number, field: keyof WeeklyHours, value: string | boolean) => {
    setSettings(s => ({
      ...s,
      weeklyPickupHours: s.weeklyPickupHours.map(h =>
        h.dayOfWeek === dayOfWeek ? { ...h, [field]: value } : h
      ),
    }))
  }

  const addBlocked = () => {
    setSettings(s => ({
      ...s,
      blockedPickupTimes: [
        ...s.blockedPickupTimes,
        { date: new Date().toISOString().split('T')[0], startTime: '12:00', endTime: '14:00', reason: '' },
      ],
    }))
  }

  const removeBlocked = (idx: number) => {
    setSettings(s => ({ ...s, blockedPickupTimes: s.blockedPickupTimes.filter((_, i) => i !== idx) }))
  }

  const updateBlocked = (idx: number, field: keyof BlockedTime, value: string) => {
    setSettings(s => ({
      ...s,
      blockedPickupTimes: s.blockedPickupTimes.map((b, i) => i === idx ? { ...b, [field]: value } : b),
    }))
  }

  const addSpecial = () => {
    setSettings(s => ({
      ...s,
      specialHours: [
        ...s.specialHours,
        { date: new Date().toISOString().split('T')[0], isOpen: false, openTime: '11:00', closeTime: '21:00', reason: '' },
      ],
    }))
  }

  const removeSpecial = (idx: number) => {
    setSettings(s => ({ ...s, specialHours: s.specialHours.filter((_, i) => i !== idx) }))
  }

  const updateSpecial = (idx: number, field: keyof SpecialHours, value: string | boolean) => {
    setSettings(s => ({
      ...s,
      specialHours: s.specialHours.map((h, i) => i === idx ? { ...h, [field]: value } : h),
    }))
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-2 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading pickup settings...
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-charcoal flex items-center gap-2">
            <Clock className="w-6 h-6 text-burgundy" /> Pickup Settings
          </h1>
          <p className="text-gray-500 text-sm mt-1">Configure pickup availability and scheduling</p>
        </div>
        <Button onClick={save} disabled={saving} className="bg-burgundy hover:bg-burgundy-dark text-white">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save Changes
        </Button>
      </div>

      <div className="space-y-6">

        {/* General toggles */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-charcoal mb-4">General</h2>
          <div className="space-y-3">
            {[
              { key: 'pickupEnabled', label: 'Enable pickup ordering' },
              { key: 'asapPickupEnabled', label: 'Enable "Pick Up ASAP"' },
              { key: 'scheduledPickupEnabled', label: 'Enable "Select Time (Later)"' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-charcoal">{label}</span>
                <div
                  onClick={() => setSettings(s => ({ ...s, [key]: !s[key as keyof Settings] }))}
                  className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                    settings[key as keyof Settings] ? 'bg-burgundy' : 'bg-gray-300'
                  }`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    settings[key as keyof Settings] ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Timing */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-charcoal mb-4">Timing</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>ASAP Preparation Time (minutes)</Label>
              <Input
                type="number" min="5" max="120"
                value={settings.defaultPreparationMinutes}
                onChange={e => setSettings(s => ({ ...s, defaultPreparationMinutes: parseInt(e.target.value) || 25 }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Min Scheduled Lead Time (minutes)</Label>
              <Input
                type="number" min="15" max="240"
                value={settings.minScheduledLeadTimeMinutes}
                onChange={e => setSettings(s => ({ ...s, minScheduledLeadTimeMinutes: parseInt(e.target.value) || 30 }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Max Days Ahead for Scheduling</Label>
              <Input
                type="number" min="1" max="30"
                value={settings.maxScheduledDaysAhead}
                onChange={e => setSettings(s => ({ ...s, maxScheduledDaysAhead: parseInt(e.target.value) || 7 }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Pickup Slot Interval (minutes)</Label>
              <select
                value={settings.pickupIntervalMinutes}
                onChange={e => setSettings(s => ({ ...s, pickupIntervalMinutes: parseInt(e.target.value) }))}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-burgundy"
              >
                {INTERVAL_OPTIONS.map(v => (
                  <option key={v} value={v}>{v} minutes</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Weekly hours */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-charcoal mb-4">Weekly Pickup Hours</h2>
          <div className="space-y-3">
            {settings.weeklyPickupHours.map((h) => (
              <div key={h.dayOfWeek} className="flex items-center gap-3 flex-wrap">
                <div className="w-24 text-sm font-medium text-charcoal">{DAYS[h.dayOfWeek]}</div>
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={h.isOpen}
                    onChange={e => updateWeekly(h.dayOfWeek, 'isOpen', e.target.checked)}
                    className="rounded"
                  />
                  Open
                </label>
                {h.isOpen && (
                  <>
                    <Input
                      type="time"
                      value={h.openTime}
                      onChange={e => updateWeekly(h.dayOfWeek, 'openTime', e.target.value)}
                      className="w-32 text-sm"
                    />
                    <span className="text-gray-400 text-sm">to</span>
                    <Input
                      type="time"
                      value={h.closeTime}
                      onChange={e => updateWeekly(h.dayOfWeek, 'closeTime', e.target.value)}
                      className="w-32 text-sm"
                    />
                  </>
                )}
                {!h.isOpen && <span className="text-gray-400 text-sm">Closed</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Blocked times */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-charcoal">Blocked Pickup Times</h2>
            <Button type="button" variant="outline" size="sm" onClick={addBlocked}>
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
          {settings.blockedPickupTimes.length === 0 ? (
            <p className="text-gray-400 text-sm">No blocked times configured.</p>
          ) : (
            <div className="space-y-3">
              {settings.blockedPickupTimes.map((b, idx) => (
                <div key={idx} className="flex items-center gap-2 flex-wrap">
                  <Input type="date" value={b.date} onChange={e => updateBlocked(idx, 'date', e.target.value)} className="w-36 text-sm" />
                  <Input type="time" value={b.startTime} onChange={e => updateBlocked(idx, 'startTime', e.target.value)} className="w-28 text-sm" />
                  <span className="text-gray-400 text-sm">to</span>
                  <Input type="time" value={b.endTime} onChange={e => updateBlocked(idx, 'endTime', e.target.value)} className="w-28 text-sm" />
                  <Input placeholder="Reason (optional)" value={b.reason} onChange={e => updateBlocked(idx, 'reason', e.target.value)} className="flex-1 min-w-32 text-sm" />
                  <button type="button" onClick={() => removeBlocked(idx)} className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Special hours */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-charcoal">Special Hours</h2>
            <Button type="button" variant="outline" size="sm" onClick={addSpecial}>
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
          <p className="text-gray-500 text-xs mb-3">Override regular hours for specific dates (e.g. public holidays).</p>
          {settings.specialHours.length === 0 ? (
            <p className="text-gray-400 text-sm">No special hours configured.</p>
          ) : (
            <div className="space-y-3">
              {settings.specialHours.map((h, idx) => (
                <div key={idx} className="flex items-center gap-2 flex-wrap">
                  <Input type="date" value={h.date} onChange={e => updateSpecial(idx, 'date', e.target.value)} className="w-36 text-sm" />
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={h.isOpen}
                      onChange={e => updateSpecial(idx, 'isOpen', e.target.checked)}
                      className="rounded"
                    />
                    Open
                  </label>
                  {h.isOpen && (
                    <>
                      <Input type="time" value={h.openTime} onChange={e => updateSpecial(idx, 'openTime', e.target.value)} className="w-28 text-sm" />
                      <span className="text-gray-400 text-sm">to</span>
                      <Input type="time" value={h.closeTime} onChange={e => updateSpecial(idx, 'closeTime', e.target.value)} className="w-28 text-sm" />
                    </>
                  )}
                  <Input placeholder="Reason" value={h.reason} onChange={e => updateSpecial(idx, 'reason', e.target.value)} className="flex-1 min-w-32 text-sm" />
                  <button type="button" onClick={() => removeSpecial(idx)} className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
