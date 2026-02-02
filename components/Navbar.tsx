'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

type User = {
  id: number
  email: string
  role: 'SUPERADMIN' | 'TEAMADMIN' | 'USER'
}

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    async function checkAuth() {
      const res = await fetch('/api/auth/me', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
      }
    }
    checkAuth()
  }, [])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    router.push('/login')
  }

  const isActive = (path: string) => pathname === path

  if (!user) return null

  // Define menu items based on role
  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊', roles: ['ADMIN', 'USER'] },
    { path: '/dashboard/sites', label: 'Sites', icon: '🌐', roles: ['ADMIN', 'USER'] },
    { path: '/dashboard/users', label: 'Users', icon: '👥', roles: ['ADMIN'] },
    { path: '/dashboard/teams', label: 'Teams', icon: '👨‍👩‍👧‍👦', roles: ['ADMIN'] },
    { path: '/dashboard/logs', label: 'Activity Logs', icon: '📋', roles: ['ADMIN'] },
    { path: '/dashboard/security', label: 'Security', icon: '🔥', roles: ['ADMIN'] },
    { path: '/dashboard/settings', label: 'Settings', icon: '⚙️', roles: ['ADMIN'] },
  ]

  // Filter menu items based on user role
  const visibleMenuItems = menuItems.filter(item => 
    user && item.roles.includes(user.role)
  )

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                DT
              </div>
              
            </Link>
            
            <div className="flex space-x-1">
              {visibleMenuItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                    isActive(item.path)
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                {user.email.charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:block">
                <div className="text-sm font-medium text-gray-900">{user.email}</div>
                <div className="text-xs text-gray-500">{user.role}</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-50"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
