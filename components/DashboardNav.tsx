'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function DashboardNav() {
  const pathname = usePathname()
  const [userRole, setUserRole] = useState<string>('USER')

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUserRole(data.user.role)
        }
      })
      .catch(console.error)
  }, [])

  const isSuperAdmin = userRole === 'SUPERADMIN'

  const navItems = [
    { href: '/dashboard', label: '📊 Dashboard', show: true },
    { href: '/dashboard/sites', label: '🌐 Sites', show: true },
    { href: '/dashboard/users', label: '👥 Users', show: isSuperAdmin },
    { href: '/dashboard/teams', label: '👔 Teams', show: isSuperAdmin },
    { href: '/dashboard/logs', label: '📋 Activity Logs', show: isSuperAdmin },
    { href: '/dashboard/security', label: '🔥 Security', show: isSuperAdmin },
    { href: '/dashboard/settings', label: '⚙ Settings', show: true },
  ]

  return (
    <nav className="flex gap-6 border-b px-6 py-4">
      {navItems
        .filter(item => item.show)
        .map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`transition ${
              pathname === item.href
                ? 'text-blue-600 font-semibold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {item.label}
          </Link>
        ))}
    </nav>
  )
}
