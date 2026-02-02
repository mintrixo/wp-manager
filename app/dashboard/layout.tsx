'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Globe,
  Users,
  UserCog,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronDown,
  Shield,
  Activity,
  AlertTriangle,
  Moon,
  Sun
} from 'lucide-react'

interface User {
  id: string
  email: string
  name: string
  role: 'super_admin' | 'team_admin' | 'team_user'
  twoFAEnabled?: boolean
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(true)
  const [sessionWarning, setSessionWarning] = useState(false)
  const [sessionTimeout, setSessionTimeout] = useState<NodeJS.Timeout | null>(null)

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (!res.ok) {
        router.push('/login')
        return
      }
      const data = await res.json()
      setUser(data.user)
    } catch (error) {
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  // Session timeout warning (mock - should use actual session expiry)
  useEffect(() => {
    if (!user) return

    // Show warning after 55 minutes
    const warningTimeout = setTimeout(() => {
      setSessionWarning(true)
    }, 55 * 60 * 1000)

    // Auto-logout after 60 minutes
    const logoutTimeout = setTimeout(() => {
      handleLogout()
    }, 60 * 60 * 1000)

    setSessionTimeout(logoutTimeout)

    return () => {
      clearTimeout(warningTimeout)
      clearTimeout(logoutTimeout)
    }
  }, [user])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      router.push('/login')
    }
  }

  const extendSession = async () => {
    try {
      await fetch('/api/auth/me') // This updates session activity
      setSessionWarning(false)
      if (sessionTimeout) {
        clearTimeout(sessionTimeout)
      }
    } catch (error) {
      handleLogout()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!user) return null

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Sites', href: '/dashboard/sites', icon: Globe },
    { name: 'Teams', href: '/dashboard/teams', icon: Users, roles: ['super_admin'] },
    { name: 'Users', href: '/dashboard/users', icon: UserCog, roles: ['super_admin', 'team_admin'] },
    { name: 'Activity', href: '/dashboard/activity', icon: Activity },
    { name: 'Errors', href: '/dashboard/errors', icon: AlertTriangle },
    { name: 'Security', href: '/dashboard/security', icon: Shield, roles: ['super_admin'] },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings, roles: ['super_admin'] },
  ]

  const filteredNav = navigation.filter(
    item => !item.roles || item.roles.includes(user.role)
  )

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-slate-900' : 'bg-gray-50'}`}>
      {/* Session Warning Modal */}
      {sessionWarning && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-slate-700">
            <h3 className="text-xl font-semibold text-white mb-2">Session Expiring</h3>
            <p className="text-gray-400 mb-6">
              Your session will expire soon due to inactivity. Would you like to stay logged in?
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleLogout}
                className="flex-1 py-2 px-4 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
              >
                Logout
              </button>
              <button
                onClick={extendSession}
                className="flex-1 py-2 px-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition"
              >
                Stay Logged In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-slate-800 border-r border-slate-700 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-700">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">WP</span>
            </div>
            <span className="text-white font-semibold">Site Manager</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {filteredNav.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${isActive
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'text-gray-400 hover:bg-slate-700 hover:text-white'
                  }`}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* User info at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700">
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 truncate">
              <p className="text-white font-medium truncate">{user.name}</p>
              <p className="text-xs capitalize">{user.role.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Navbar */}
        <header className="h-16 bg-slate-800/50 backdrop-blur-lg border-b border-slate-700 sticky top-0 z-30">
          <div className="h-full px-4 flex items-center justify-between">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-400 hover:text-white"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Page title (mobile) */}
            <h1 className="lg:hidden text-white font-semibold">
              {filteredNav.find(n => pathname.startsWith(n.href))?.name || 'Dashboard'}
            </h1>

            {/* Spacer */}
            <div className="hidden lg:block" />

            {/* Right side actions */}
            <div className="flex items-center gap-4">
              {/* Dark mode toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 text-gray-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {/* Notifications */}
              <button className="p-2 text-gray-400 hover:text-white hover:bg-slate-700 rounded-lg transition relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-2 text-gray-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
                >
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <ChevronDown className={`w-4 h-4 transition ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
                      <div className="p-4 border-b border-slate-700">
                        <p className="text-white font-medium">{user.name}</p>
                        <p className="text-sm text-gray-400 truncate">{user.email}</p>
                      </div>
                      <div className="p-2">
                        <Link
                          href="/dashboard/profile"
                          className="flex items-center gap-2 w-full px-3 py-2 text-gray-300 hover:bg-slate-700 rounded-lg transition"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <UserCog className="w-4 h-4" />
                          Profile
                        </Link>
                        <Link
                          href="/dashboard/profile/security"
                          className="flex items-center gap-2 w-full px-3 py-2 text-gray-300 hover:bg-slate-700 rounded-lg transition"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Shield className="w-4 h-4" />
                          Security
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-2 w-full px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition"
                        >
                          <LogOut className="w-4 h-4" />
                          Logout
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
