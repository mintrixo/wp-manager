'use client'

import { useState, useEffect } from 'react'
import {
  Shield,
  Search,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Lock,
  Unlock,
  Eye,
  Clock,
  Download,
  Filter
} from 'lucide-react'

interface SecurityEvent {
  id: string
  eventType: string
  eventDescription: string
  userEmail?: string
  ipAddress?: string
  userAgent?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  createdAt: string
}

type SeverityFilter = 'all' | 'low' | 'medium' | 'high' | 'critical'

export default function SecurityPage() {
  const [events, setEvents] = useState<SecurityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all')

  useEffect(() => {
    fetchSecurityEvents()
  }, [])

  const fetchSecurityEvents = async () => {
    try {
      const res = await fetch('/api/security/events')
      if (res.ok) {
        const data = await res.json()
        setEvents(data.events || [])
      } else {
        // Mock data
        setEvents([
          { id: '1', eventType: 'login_failed', eventDescription: 'Multiple failed login attempts from same IP', ipAddress: '185.220.101.1', severity: 'high', createdAt: new Date(Date.now() - 60000).toISOString() },
          { id: '2', eventType: 'account_locked', eventDescription: 'Account locked after 3 failed attempts', userEmail: 'john@example.com', ipAddress: '192.168.1.50', severity: 'medium', createdAt: new Date(Date.now() - 300000).toISOString() },
          { id: '3', eventType: '2fa_enabled', eventDescription: 'Two-factor authentication enabled', userEmail: 'admin@example.com', severity: 'low', createdAt: new Date(Date.now() - 600000).toISOString() },
          { id: '4', eventType: 'sql_injection_attempt', eventDescription: 'Potential SQL injection attempt detected', ipAddress: '103.152.85.1', severity: 'critical', createdAt: new Date(Date.now() - 1200000).toISOString() },
          { id: '5', eventType: 'password_changed', eventDescription: 'Password changed successfully', userEmail: 'jane@example.com', severity: 'low', createdAt: new Date(Date.now() - 3600000).toISOString() },
          { id: '6', eventType: 'brute_force_detected', eventDescription: 'Brute force attack detected and blocked', ipAddress: '45.33.32.156', severity: 'critical', createdAt: new Date(Date.now() - 7200000).toISOString() },
        ])
      }
    } catch (error) {
      console.error('Failed to fetch security events:', error)
    } finally {
      setLoading(false)
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'low': return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'medium': return <AlertTriangle className="w-4 h-4 text-yellow-400" />
      case 'high': return <AlertTriangle className="w-4 h-4 text-orange-400" />
      case 'critical': return <XCircle className="w-4 h-4 text-red-400" />
      default: return <Eye className="w-4 h-4 text-gray-400" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-green-500/10 text-green-400 border-green-500/30'
      case 'medium': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
      case 'high': return 'bg-orange-500/10 text-orange-400 border-orange-500/30'
      case 'critical': return 'bg-red-500/10 text-red-400 border-red-500/30'
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/30'
    }
  }

  const getEventIcon = (eventType: string) => {
    if (eventType.includes('login') || eventType.includes('failed')) return <Lock className="w-5 h-5" />
    if (eventType.includes('locked')) return <Lock className="w-5 h-5" />
    if (eventType.includes('unlocked') || eventType.includes('enabled')) return <Unlock className="w-5 h-5" />
    if (eventType.includes('injection') || eventType.includes('brute')) return <Shield className="w-5 h-5" />
    return <Eye className="w-5 h-5" />
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)

    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
  }

  const formatEventType = (eventType: string) => {
    return eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.eventDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.eventType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (event.userEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (event.ipAddress?.includes(searchQuery) ?? false)
    const matchesSeverity = severityFilter === 'all' || event.severity === severityFilter
    return matchesSearch && matchesSeverity
  })

  const severityCounts = {
    all: events.length,
    critical: events.filter(e => e.severity === 'critical').length,
    high: events.filter(e => e.severity === 'high').length,
    medium: events.filter(e => e.severity === 'medium').length,
    low: events.filter(e => e.severity === 'low').length,
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-700 rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Security Logs</h1>
          <p className="text-gray-400 mt-1">Monitor security events and threats</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition">
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-400 text-sm">Critical</span>
          </div>
          <p className="text-2xl font-bold text-white mt-2">{severityCounts.critical}</p>
        </div>
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
            <span className="text-orange-400 text-sm">High</span>
          </div>
          <p className="text-2xl font-bold text-white mt-2">{severityCounts.high}</p>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <span className="text-yellow-400 text-sm">Medium</span>
          </div>
          <p className="text-2xl font-bold text-white mt-2">{severityCounts.medium}</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-green-400 text-sm">Low</span>
          </div>
          <p className="text-2xl font-bold text-white mt-2">{severityCounts.low}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {(['all', 'critical', 'high', 'medium', 'low'] as SeverityFilter[]).map((severity) => (
            <button
              key={severity}
              onClick={() => setSeverityFilter(severity)}
              className={`px-3 py-2 rounded-lg text-sm transition ${severityFilter === severity
                  ? 'bg-purple-500 text-white'
                  : 'bg-slate-700 text-gray-400 hover:text-white'
                }`}
            >
              {severity.charAt(0).toUpperCase() + severity.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Events List */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        {filteredEvents.length > 0 ? (
          <div className="divide-y divide-slate-700">
            {filteredEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-4 p-4 hover:bg-slate-700/30 transition"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getSeverityColor(event.severity).split(' ')[0]}`}>
                  {getEventIcon(event.eventType)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-medium">{formatEventType(event.eventType)}</span>
                        <span className={`text-xs px-2 py-0.5 rounded border ${getSeverityColor(event.severity)}`}>
                          {event.severity.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mt-1">{event.eventDescription}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        {event.userEmail && <span>User: {event.userEmail}</span>}
                        {event.ipAddress && <span>IP: {event.ipAddress}</span>}
                      </div>
                    </div>
                    <span className="text-gray-500 text-sm whitespace-nowrap flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(event.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <Shield className="w-12 h-12 mx-auto text-green-500 mb-4" />
            <p className="text-gray-400">No security events found</p>
            <p className="text-gray-600 text-sm mt-1">Your system is secure</p>
          </div>
        )}
      </div>
    </div>
  )
}
