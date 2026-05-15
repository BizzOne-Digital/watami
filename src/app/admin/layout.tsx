import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/admin/AdminSidebar'
import OrderNotification from '@/components/admin/OrderNotification'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {session?.user?.role === 'admin' && (
        <>
          <AdminSidebar />
          <OrderNotification />
        </>
      )}
      <main className={`flex-1 ${session?.user?.role === 'admin' ? 'ml-0 md:ml-64' : ''}`}>
        {children}
      </main>
    </div>
  )
}
