#!/bin/bash

echo "🎨 Fixing all page designs for consistency..."

# 1. Fix all role type definitions across the app
echo "1️⃣ Fixing role types..."
find app -name "*.tsx" -type f -exec sed -i "s/role: 'ADMIN' | 'USER'/role: 'SUPERADMIN' | 'TEAMADMIN' | 'USER'/g" {} \;
find components -name "*.tsx" -type f -exec sed -i "s/role: 'ADMIN' | 'USER'/role: 'SUPERADMIN' | 'TEAMADMIN' | 'USER'/g" {} \;

# 2. Fix isAdmin checks
echo "2️⃣ Fixing admin role checks..."
find app -name "*.tsx" -type f -exec sed -i "s/user.role === 'ADMIN'/user.role === 'SUPERADMIN'/g" {} \;
find components -name "*.tsx" -type f -exec sed -i "s/user.role === 'ADMIN'/user.role === 'SUPERADMIN'/g" {} \;

# 3. Create consistent page wrapper styles
echo "3️⃣ Creating consistent page styles..."

# Update sites page styling
cat > app/dashboard/sites/page.tsx << 'ENDSITES'
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Site = {
  id: number
  domain: string
  type: 'BETA' | 'LIVE'
  status: 'ACTIVE' | 'INACTIVE'
  teamId: number | null
  createdAt: string
}

type User = {
  id: number
  email: string
  role: 'SUPERADMIN' | 'TEAMADMIN' | 'USER'
}

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'live' | 'beta'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [newSiteDomain, setNewSiteDomain] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [userRes, sitesRes] = await Promise.all([
        fetch('/api/auth/me', { credentials: 'include' }),
        fetch('/api/sites', { credentials: 'include' })
      ])

      if (userRes.ok) {
        const userData = await userRes.json()
        setUser(userData.user)
      }

      if (sitesRes.ok) {
        const sitesData = await sitesRes.json()
        setSites(Array.isArray(sitesData) ? sitesData : sitesData.sites || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function addSite(e: React.FormEvent) {
    e.preventDefault()
    
    if (!newSiteDomain.trim()) {
      alert('Please enter a domain')
      return
    }

    try {
      const res = await fetch('/api/sites/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ domain: newSiteDomain })
      })

      if (res.ok) {
        await fetchData()
        setShowAddModal(false)
        setNewSiteDomain('')
        alert('Site added successfully!')
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to add site')
      }
    } catch (error) {
      console.error('Error adding site:', error)
      alert('Failed to add site')
    }
  }

  const filteredSites = sites.filter(site => {
    const matchesFilter = filter === 'all' || site.type?.toLowerCase() === filter
    const matchesSearch = site.domain?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  const betaCount = sites.filter(s => s.type === 'BETA').length
  const liveCount = sites.filter(s => s.type === 'LIVE').length

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sites</h1>
          <p className="text-gray-600 mt-1">Manage your WordPress sites</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            + Add Site
          </button>
          <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition">
            Bulk Add
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4 items-center">
        <input
          type="text"
          placeholder="Search sites..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({sites.length})
          </button>
          <button
            onClick={() => setFilter('live')}
            className={`px-4 py-2 rounded-lg transition ${
              filter === 'live'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Live ({liveCount})
          </button>
          <button
            onClick={() => setFilter('beta')}
            className={`px-4 py-2 rounded-lg transition ${
              filter === 'beta'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Beta ({betaCount})
          </button>
        </div>
      </div>

      {/* Sites Grid */}
      <div className="grid gap-4">
        {filteredSites.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-gray-400 text-6xl mb-4">🌐</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No sites found</h3>
            <p className="text-gray-600 mb-4">Add your first site to get started</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Add Site
            </button>
          </div>
        ) : (
          filteredSites.map((site) => (
            <div
              key={site.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition p-6"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {site.domain}
                  </h3>
                  <div className="flex gap-2">
                    <span
                      className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                        site.type === 'LIVE'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {site.type}
                    </span>
                    <span
                      className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                        site.status === 'ACTIVE'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {site.status}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => router.push(`/dashboard/sites/${site.id}`)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  View Details →
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Site Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Add New Site</h2>
            <form onSubmit={addSite}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Domain
                </label>
                <input
                  type="text"
                  value={newSiteDomain}
                  onChange={(e) => setNewSiteDomain(e.target.value)}
                  placeholder="example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Sites ending with .gogroth.com will be marked as Beta
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Add Site
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setNewSiteDomain('')
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
ENDSITES

echo "✅ Sites page updated"

# 4. Fix dashboard page role types
sed -i "s/role: 'ADMIN' | 'USER'/role: 'SUPERADMIN' | 'TEAMADMIN' | 'USER'/g" app/dashboard/page.tsx

echo "✅ All designs fixed!"
