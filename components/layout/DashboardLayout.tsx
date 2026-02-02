"use client"

import Link from "next/link"

interface Props {
  userRole: string
  userName: string
  children: React.ReactNode
}

export default function DashboardLayout({
  userRole,
  userName,
  children,
}: Props) {
  return (
    <div className="min-h-screen bg-gray-100 flex">
      <aside className="w-64 bg-white border-r p-4">
        <h2 className="text-xl font-bold mb-6">Admin Panel</h2>
        <p className="text-sm text-gray-600 mb-4">
          {userName} ({userRole})
        </p>

        <nav className="space-y-2">
          <Link href="/dashboard" className="block text-blue-600">
            Dashboard
          </Link>
          <Link href="/dashboard/sites" className="block">
            Sites
          </Link>
          <Link href="/dashboard/teams" className="block">
            Teams
          </Link>
          <Link href="/auth/logout" className="block text-red-600">
            Logout
          </Link>
        </nav>
      </aside>

      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
