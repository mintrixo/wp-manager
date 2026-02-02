'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Search,
  Plus,
  Filter,
  MoreVertical,
  Globe,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Key,
  Download,
  Trash2,
  RefreshCw,
  ArrowRightOnRectangle,
  Loader2
} from 'lucide-react'

interface Site {
  id: string
  domain: string
  url: string
  environment: 'beta' | 'live'
  status: 'healthy' | 'warning' | 'error' | 'offline'
  team: {
    id: string
    name: string
  }
  lastSync?: string
  pluginCount?: number
  themeCount?: number
  userCount?: number
}

type FilterTab = 'all' | 'live' | 'beta'

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [selectedSite, setSelectedSite] = useState<string | null>(null)
  const [magicLoginLoading, setMagicLoginLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchSites()
  }, [])

  const fetchSites = async () => {
    try {
      const res = await fetch('/api/sites')
      if (res.ok) {
        const data = await res.json()
        setSites(data.sites || [])
      } else {
        // Mock data for now
        setSites([
          { id: '1', domain: 'example.com', url: 'https://example.com', environment: 'live', status: 'healthy', team: { id: '1', name: 'Main Team' }, pluginCount: 12, themeCount: 3, userCount: 5 },
          { id: '2', domain: 'blog.example.com', url: 'https://blog.example.com', environment: 'live', status: 'warning', team: { id: '1', name: 'Main Team' }, pluginCount: 8, themeCount: 2, userCount: 3 },
          { id: '3', domain: 'shop.example.com', url: 'https://shop.example.com', environment: 'live', status: 'error', team: { id: '2', name: 'E-commerce' }, pluginCount: 25, themeCount: 1, userCount: 8 },
          { id: '4', domain: 'staging.gogroth.com', url: 'https://staging.gogroth.com', environment: 'beta', status: 'healthy', team: { id: '1', name: 'Main Team' }, pluginCount: 10, themeCount: 2, userCount: 2 },
          { id: '5', domain: 'dev.gogroth.com', url: 'https://dev.gogroth.com', environment: 'beta', status: 'healthy', team: { id: '3', name: 'Development' }, pluginCount: 15, themeCount: 4, userCount: 4 },
        ])
      }
    } catch (error) {
      console.error('Failed to fetch sites:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMagicLogin = async (siteId: string) => {
    setMagicLoginLoading(siteId)
    try {
      const res = await fetch('/api/sites/magic-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId })
      })

      if (res.ok) {
        const data = await res.json()
        if (data.loginUrl) {
          window.open(data.loginUrl, '_blank')
        }
      } else {
        console.error('Magic login failed')
      }
    } catch (error) {
      console.error('Magic login error:', error)
    } finally {
      setMagicLoginLoading(null)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-400" />
      case 'error': return <XCircle className="w-4 h-4 text-red-400" />
      default: return <div className="w-4 h-4 bg-gray-500 rounded-full" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'warning': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'error': return 'bg-red-500/20 text-red-400 border-red-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const filteredSites = sites.filter(site => {
    const matchesSearch = site.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.team.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTab = activeTab === 'all' || site.environment === activeTab
    return matchesSearch && matchesTab
  })

  const tabCounts = {
    all: sites.length,
    live: sites.filter(s => s.environment === 'live').length,
    beta: sites.filter(s => s.environment === 'beta').length
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-700 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 bg-slate-800 rounded-xl animate-pulse" />
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
          <h1 className="text-2xl font-bold text-white">Sites</h1>
          <p className="text-gray-400 mt-1">Manage your WordPress sites</p>
        </div>
        <Link
          href="/dashboard/sites/new"
          className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition"
        >
          <Plus className="w-4 h-4" />
          Add Site
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sites..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {/* Tab filters */}
        <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
          {(['all', 'live', 'beta'] as FilterTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === tab
                  ? 'bg-purple-500 text-white'
                  : 'text-gray-400 hover:text-white'
                }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              <span className="ml-1.5 text-xs opacity-75">({tabCounts[tab]})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sites Grid */}
      {filteredSites.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSites.map((site) => (
            <div
              key={site.id}
              className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 hover:border-slate-600 transition group"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${site.environment === 'live' ? 'bg-green-500/20' : 'bg-yellow-500/20'
                    }`}>
                    <Globe className={`w-5 h-5 ${site.environment === 'live' ? 'text-green-400' : 'text-yellow-400'
                      }`} />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">{site.domain}</h3>
                    <p className="text-gray-500 text-sm">{site.team.name}</p>
                  </div>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setSelectedSite(selectedSite === site.id ? null : site.id)}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {selectedSite === site.id && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setSelectedSite(null)}
                      />
                      <div className="absolute right-0 top-full mt-1 w-48 bg-slate-700 border border-slate-600 rounded-lg shadow-xl z-50 overflow-hidden py-1">
                        <a
                          href={site.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:bg-slate-600 transition"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Visit Site
                        </a>
                        <button
                          onClick={() => handleMagicLogin(site.id)}
                          className="flex items-center gap-2 w-full px-4 py-2 text-gray-300 hover:bg-slate-600 transition"
                        >
                          <ArrowRightOnRectangle className="w-4 h-4" />
                          Magic Login
                        </button>
                        <Link
                          href={`/dashboard/sites/${site.id}`}
                          className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:bg-slate-600 transition"
                        >
                          <Key className="w-4 h-4" />
                          View Details
                        </Link>
                        <button className="flex items-center gap-2 w-full px-4 py-2 text-gray-300 hover:bg-slate-600 transition">
                          <Download className="w-4 h-4" />
                          Download Plugin
                        </button>
                        <button className="flex items-center gap-2 w-full px-4 py-2 text-red-400 hover:bg-red-500/10 transition">
                          <Trash2 className="w-4 h-4" />
                          Remove Site
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2 mb-4">
                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${getStatusColor(site.status)}`}>
                  {getStatusIcon(site.status)}
                  {site.status.charAt(0).toUpperCase() + site.status.slice(1)}
                </span>
                <span className={`px-2.5 py-1 rounded-full text-xs ${site.environment === 'live'
                    ? 'bg-green-500/10 text-green-400'
                    : 'bg-yellow-500/10 text-yellow-400'
                  }`}>
                  {site.environment.toUpperCase()}
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-slate-700/50 rounded-lg p-2 text-center">
                  <p className="text-lg font-semibold text-white">{site.pluginCount || 0}</p>
                  <p className="text-xs text-gray-500">Plugins</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-2 text-center">
                  <p className="text-lg font-semibold text-white">{site.themeCount || 0}</p>
                  <p className="text-xs text-gray-500">Themes</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-2 text-center">
                  <p className="text-lg font-semibold text-white">{site.userCount || 0}</p>
                  <p className="text-xs text-gray-500">Users</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleMagicLogin(site.id)}
                  disabled={magicLoginLoading === site.id}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition disabled:opacity-50"
                >
                  {magicLoginLoading === site.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <ArrowRightOnRectangle className="w-4 h-4" />
                      Login
                    </>
                  )}
                </button>
                <Link
                  href={`/dashboard/sites/${site.id}`}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
                >
                  Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Globe className="w-16 h-16 mx-auto text-gray-600 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No sites found</h3>
          <p className="text-gray-400 mb-6">
            {searchQuery ? 'Try adjusting your search.' : 'Get started by adding your first WordPress site.'}
          </p>
          <Link
            href="/dashboard/sites/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition"
          >
            <Plus className="w-5 h-5" />
            Add Your First Site
          </Link>
        </div>
      )}
    </div>
  )
}
