'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Settings, Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface SiteSettings {
  restaurantName: string
  address: string
  phone: string
  email: string
  logoUrl: string
  openingHoursText: string
  defaultPreparationMinutes: number
}

const defaults: SiteSettings = {
  restaurantName: 'Watami Japanese Food',
  address: 'Shop 5/672 Glenferrie Rd, Hawthorn VIC 3122, Australia',
  phone: '',
  email: '',
  logoUrl: '',
  openingHoursText: 'Mon–Sun · 11:00 AM – 9:00 PM',
  defaultPreparationMinutes: 25,
}

export default function AdminSettingsPage() {
  const [form, setForm] = useState<SiteSettings>(defaults)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/restaurant-settings')
      .then(r => r.json())
      .then(data => {
        if (data.settings) {
          setForm({
            restaurantName: data.settings.restaurantName ?? defaults.restaurantName,
            address: data.settings.address ?? defaults.address,
            phone: data.settings.phone ?? '',
            email: data.settings.email ?? '',
            logoUrl: data.settings.logoUrl ?? '',
            openingHoursText: data.settings.openingHoursText ?? defaults.openingHoursText,
            defaultPreparationMinutes: data.settings.defaultPreparationMinutes ?? 25,
          })
        }
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/restaurant-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      toast.success('Settings saved')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const set = (field: keyof SiteSettings, value: string | number) =>
    setForm(f => ({ ...f, [field]: value }))

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-2 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading settings...
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-charcoal flex items-center gap-2">
            <Settings className="w-6 h-6 text-burgundy" />
            Site Settings
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            These details show on the public website and on order confirmation emails.
          </p>
        </div>
      </div>

      <div className="space-y-6 mt-6">

        {/* Restaurant section */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Restaurant</h2>

          <div>
            <Label htmlFor="restaurantName">Restaurant Name</Label>
            <Input
              id="restaurantName"
              value={form.restaurantName}
              onChange={e => set('restaurantName', e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={form.address}
              onChange={e => set('address', e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="e.g. (03) 9000 0000"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="e.g. hello@watami.com.au"
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="logoUrl">Logo URL (for emails)</Label>
            <Input
              id="logoUrl"
              type="url"
              value={form.logoUrl}
              onChange={e => set('logoUrl', e.target.value)}
              placeholder="https://your-domain.com/logo.png"
              className="mt-1"
            />
            <p className="text-xs text-gray-400 mt-1">
              Must be a public <code className="bg-gray-100 px-1 rounded">https://</code> URL — Gmail blocks relative paths in emails.
              Upload your logo to Cloudinary, Vercel Blob, or any CDN and paste the URL here.
            </p>
            {form.logoUrl && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.logoUrl} alt="Logo preview" className="max-h-12 max-w-xs object-contain" />
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="openingHoursText">Opening Hours</Label>
            <textarea
              id="openingHoursText"
              value={form.openingHoursText}
              onChange={e => set('openingHoursText', e.target.value)}
              rows={3}
              placeholder="e.g. Mon–Sun · 11:00 AM – 9:00 PM"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-burgundy resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">
              Shown on the public website. You can write multiple lines.
            </p>
          </div>
        </div>

        {/* Pickup section */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pickup</h2>

          <div>
            <Label htmlFor="prepTime">Default Pickup Preparation Time (minutes)</Label>
            <div className="flex items-center gap-3 mt-1">
              <Input
                id="prepTime"
                type="number"
                min={5}
                max={120}
                value={form.defaultPreparationMinutes}
                onChange={e => set('defaultPreparationMinutes', parseInt(e.target.value) || 25)}
                className="w-28"
              />
              <span className="text-sm text-gray-500">minutes</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Shown on the order success page and in the customer confirmation email.
            </p>
          </div>
        </div>

        {/* Admin account — read only */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-3">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Admin Account</h2>
          <p className="text-xs text-gray-400">
            To change admin credentials, update <code className="bg-gray-100 px-1 rounded">ADMIN_EMAIL</code> and{' '}
            <code className="bg-gray-100 px-1 rounded">ADMIN_PASSWORD</code> in your Vercel environment variables and redeploy.
          </p>
        </div>

        {/* Save button */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-burgundy hover:bg-burgundy-dark text-white h-12 text-base font-semibold"
        >
          {saving
            ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</>
            : <><Save className="w-4 h-4 mr-2" />Save Settings</>
          }
        </Button>

      </div>
    </div>
  )
}
