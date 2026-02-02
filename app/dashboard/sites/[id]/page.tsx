'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

type Site = {
  id: number
  domain: string
  type: 'BETA' | 'LIVE'
  status: 'ACTIVE' | 'INACTIVE'
  apiKey: string
  apiSecret: string
  teamId: number
  createdAt: string
  updatedAt: string
}

export default function SiteDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [site, setSite] = useState<Site | null>(null)
  const [loading, setLoading] = useState(true)
  const [loggingIn, setLoggingIn] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchSiteDetails()
    }
  }, [params.id])

  async function fetchSiteDetails() {
    try {
      const res = await fetch(`/api/sites/${params.id}`, {
        credentials: 'include'
      })

      if (res.ok) {
        const data = await res.json()
        setSite(data.site)
      } else {
        console.error('Failed to load site')
        alert('Failed to load site details')
        router.push('/dashboard/sites')
      }
    } catch (error) {
      console.error('Error loading site:', error)
      alert('Error loading site')
      router.push('/dashboard/sites')
    } finally {
      setLoading(false)
    }
  }

  async function handleMagicLogin() {
    if (!site) return

    setLoggingIn(true)
    try {
      const res = await fetch('/api/sites/magic-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ siteId: site.id })
      })

      if (res.ok) {
        const data = await res.json()
        
        if (data.loginUrl) {
          window.open(data.loginUrl, '_blank')
        } else {
          alert('Login URL not received')
        }
      } else {
        const error = await res.json()
        alert(error.error || 'Magic login failed')
      }
    } catch (error) {
      console.error('Magic login error:', error)
      alert('Failed to generate magic login')
    } finally {
      setLoggingIn(false)
    }
  }

  async function deleteSite() {
    if (!site) return
    
    if (!confirm(`Are you sure you want to delete ${site.domain}?`)) return

    try {
      const res = await fetch(`/api/sites/${site.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (res.ok) {
        alert('Site deleted successfully')
        router.push('/dashboard/sites')
      } else {
        alert('Failed to delete site')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to delete site')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading site details...</p>
        </div>
      </div>
    )
  }

  if (!site) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Site not found</p>
        <button
          onClick={() => router.push('/dashboard/sites')}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Back to Sites
        </button>
      </div>
    )
  }

  const siteUrl = site.domain.startsWith('http') ? site.domain : `https://${site.domain}`

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/dashboard/sites')}
          className="text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-2"
        >
          ← Back to Sites
        </button>
        <h1 className="text-3xl font-bold text-gray-900">{site.domain}</h1>
        <div className="flex gap-2 mt-3">
          <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${
            site.type === 'LIVE' ? 'bg-green-500 text-white' : 'bg-yellow-500 text-gray-900'
          }`}>
            {site.type}
          </span>
          <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${
            site.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {site.status}
          </span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Magic Login */}
        <button
          onClick={handleMagicLogin}
          disabled={loggingIn}
          className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="text-4xl mb-3">🔐</div>
          <h3 className="font-bold text-lg mb-1">
            {loggingIn ? 'Logging in...' : 'Magic Login'}
          </h3>
          <p className="text-blue-100 text-sm">Login to WordPress admin</p>
        </button>

        {/* Visit Site */}
        <a
          href={siteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-6 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
        >
          <div className="text-4xl mb-3">🌐</div>
          <h3 className="font-bold text-lg mb-1">Visit Website</h3>
          <p className="text-green-100 text-sm">View live site</p>
        </a>

        {/* File Manager */}
        <button
          className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
          onClick={() => alert('File manager coming soon!')}
        >
          <div className="text-4xl mb-3">📁</div>
          <h3 className="font-bold text-lg mb-1">File Manager</h3>
          <p className="text-purple-100 text-sm">Browse files</p>
        </button>
      </div>

      {/* Site Information - WITHOUT API Credentials */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4">Site Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Domain</label>
            <p className="text-gray-900 font-medium">{site.domain}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Type</label>
            <p className="text-gray-900 font-medium">{site.type}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
            <p className="text-gray-900 font-medium">{site.status}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Created</label>
            <p className="text-gray-900 font-medium">
              {new Date(site.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
        <h2 className="text-2xl font-bold text-red-900 mb-4">Danger Zone</h2>
        <p className="text-red-700 mb-4">
          Once you delete a site, there is no going back. Please be certain.
        </p>
        <button
          onClick={deleteSite}
          className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
        >
          🗑️ Delete Site
        </button>
      </div>
    </div>
  )
}
