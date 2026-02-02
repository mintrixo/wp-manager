'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Globe,
  Users,
  Shield,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Activity,
  Plus,
  ChevronRight,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react'

interface DashboardStats {
  totalSites: number
  liveSites: number
  betaSites: number
  healthySites: number
  warningSites: number
  errorSites: number
  totalTeams: number
  totalUsers: number
  recentErrors: number
  activeAlerts: number
}

interface RecentActivity {
  id: string
  action: string
  user: string
  target?: string
  time: string
  type: 'success' | 'warning' | 'error' | 'info'
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activities, setActivities] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch stats
      const statsRes = await fetch('/api/dashboard/stats')
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      } else {
        // Set mock data for now
        setStats({
          totalSites: 12,
          liveSites: 8,
          betaSites: 4,
          healthySites: 10,
          warningSites: 1,
          errorSites: 1,
          totalTeams: 3,
          totalUsers: 15,
          recentErrors: 5,
          activeAlerts: 2
        })
      }

      // Fetch recent activity
      const activityRes = await fetch('/api/dashboard/activity?limit=5')
      if (activityRes.ok) {
        const activityData = await activityRes.json()
        setActivities(activityData.activities || [])
      } else {
        // Mock activities
        setActivities([
          { id: '1', action: 'New site added', user: 'Admin', target: 'example.com', time: '2 min ago', type: 'success' },
          { id: '2', action: 'Plugin update available', user: 'System', target: 'blog.example.com', time: '15 min ago', type: 'warning' },
          { id: '3', action: 'User logged in', user: 'John Doe', time: '1 hour ago', type: 'info' },
          { id: '4', action: 'Site health check failed', user: 'System', target: 'shop.example.com', time: '2 hours ago', type: 'error' },
          { id: '5', action: 'Team member approved', user: 'Admin', target: 'Jane Smith', time: '3 hours ago', type: 'success' },
        ])
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchDashboardData()
    setRefreshing(false)
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-400" />
      case 'error': return <XCircle className="w-4 h-4 text-red-400" />
      default: return <Activity className="w-4 h-4 text-blue-400" />
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-700 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-1">Welcome back! Here's what's happening with your sites.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            href="/dashboard/sites/new"
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition"
          >
            <Plus className="w-4 h-4" />
            Add Site
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Sites */}
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Globe className="w-6 h-6 text-purple-400" />
            </div>
            <span className="flex items-center gap-1 text-green-400 text-sm">
              <TrendingUp className="w-4 h-4" />
              +2
            </span>
          </div>
          <h3 className="text-3xl font-bold text-white mb-1">{stats?.totalSites || 0}</h3>
          <p className="text-gray-400 text-sm">Total Sites</p>
          <div className="mt-4 flex items-center gap-4 text-sm">
            <span className="text-green-400">{stats?.liveSites || 0} Live</span>
            <span className="text-yellow-400">{stats?.betaSites || 0} Beta</span>
          </div>
        </div>

        {/* Site Health */}
        <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
            <span className="text-gray-400 text-sm">Health Status</span>
          </div>
          <h3 className="text-3xl font-bold text-white mb-1">{stats?.healthySites || 0}</h3>
          <p className="text-gray-400 text-sm">Healthy Sites</p>
          <div className="mt-4 flex items-center gap-4 text-sm">
            <span className="text-yellow-400">{stats?.warningSites || 0} Warning</span>
            <span className="text-red-400">{stats?.errorSites || 0} Error</span>
          </div>
        </div>

        {/* Teams & Users */}
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-white mb-1">{stats?.totalUsers || 0}</h3>
          <p className="text-gray-400 text-sm">Total Users</p>
          <div className="mt-4 flex items-center gap-4 text-sm">
            <span className="text-blue-400">{stats?.totalTeams || 0} Teams</span>
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            {(stats?.activeAlerts || 0) > 0 && (
              <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full">
                Action Required
              </span>
            )}
          </div>
          <h3 className="text-3xl font-bold text-white mb-1">{stats?.activeAlerts || 0}</h3>
          <p className="text-gray-400 text-sm">Active Alerts</p>
          <div className="mt-4 flex items-center gap-4 text-sm">
            <span className="text-red-400">{stats?.recentErrors || 0} Errors today</span>
          </div>
        </div>
      </div>

      {/* Quick Actions & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-1 bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              href="/dashboard/sites/new"
              className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Plus className="w-5 h-5 text-purple-400" />
                </div>
                <span className="text-white">Add New Site</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition" />
            </Link>

            <Link
              href="/dashboard/teams/new"
              className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-white">Create Team</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition" />
            </Link>

            <Link
              href="/dashboard/errors"
              className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <span className="text-white">View Errors</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition" />
            </Link>

            <Link
              href="/dashboard/security"
              className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-green-400" />
                </div>
                <span className="text-white">Security Logs</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition" />
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
            <Link
              href="/dashboard/activity"
              className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1 transition"
            >
              View all
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-4">
            {activities.length > 0 ? (
              activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-4 p-3 bg-slate-700/30 rounded-lg"
                >
                  <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm">
                      <span className="text-gray-400">{activity.user}</span>
                      {' '}{activity.action}
                      {activity.target && (
                        <span className="text-purple-400"> {activity.target}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-gray-500 text-xs">
                    <Clock className="w-3 h-3" />
                    {activity.time}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
