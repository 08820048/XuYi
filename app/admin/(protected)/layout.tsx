import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { isAdminAuthenticated, COOKIE_NAME } from '@/lib/admin-auth'
import { AdminMobileBar, AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminToastProvider } from '@/components/admin/toast'

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  if (!(await isAdminAuthenticated(token))) {
    redirect('/admin/login')
  }

  return (
    <div className="coss-admin flex min-h-screen bg-background text-foreground">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminMobileBar />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-8">{children}</main>
      </div>
      <AdminToastProvider />
    </div>
  )
}
