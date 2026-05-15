import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Settings, MapPin, Clock, Info } from 'lucide-react'

export default async function AdminSettingsPage() {
  const session = await auth()
  if (!session || session.user?.role !== 'admin') redirect('/admin/login')

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-charcoal flex items-center gap-2">
          <Settings className="w-6 h-6 text-burgundy" />
          Settings
        </h1>
        <p className="text-gray-500 text-sm mt-1">Restaurant configuration</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Restaurant Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-bold text-charcoal mb-4 flex items-center gap-2">
            <Info className="w-4 h-4 text-burgundy" />
            Restaurant Info
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">Name</span>
              <span className="font-medium text-charcoal">Watami Japanese Food</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">Order Type</span>
              <span className="font-medium text-green-600">Pickup Only</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">Currency</span>
              <span className="font-medium text-charcoal">AUD ($)</span>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-bold text-charcoal mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-burgundy" />
            Location
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">Address</span>
              <span className="font-medium text-charcoal text-right">Shop 5/672 Glenferrie Rd</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">Suburb</span>
              <span className="font-medium text-charcoal">Hawthorn VIC 3122</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">Country</span>
              <span className="font-medium text-charcoal">Australia</span>
            </div>
          </div>
        </div>

        {/* Opening Hours */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-bold text-charcoal mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-burgundy" />
            Opening Hours
          </h2>
          <div className="space-y-2 text-sm">
            {[
              { day: 'Monday – Friday', hours: '11:00 AM – 9:00 PM' },
              { day: 'Saturday', hours: '11:00 AM – 9:30 PM' },
              { day: 'Sunday', hours: '11:00 AM – 9:00 PM' },
            ].map((h) => (
              <div key={h.day} className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500">{h.day}</span>
                <span className="font-medium text-charcoal">{h.hours}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Admin Account */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-bold text-charcoal mb-4">Admin Account</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">Name</span>
              <span className="font-medium text-charcoal">{session.user?.name}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">Email</span>
              <span className="font-medium text-charcoal">{session.user?.email}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">Role</span>
              <span className="font-medium text-burgundy">Admin</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            To change admin credentials, update the environment variables and re-seed.
          </p>
        </div>
      </div>

      {/* Environment info */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-blue-700 text-sm font-medium mb-1">Environment Variables</p>
        <p className="text-blue-600 text-xs">
          Configure MONGODB_URI, NEXTAUTH_SECRET, ADMIN_EMAIL, and ADMIN_PASSWORD in your .env.local file.
          Never commit secrets to version control.
        </p>
      </div>
    </div>
  )
}
