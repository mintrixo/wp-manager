'use client'

import { useState, useEffect } from 'react'

interface SiteDetailsModalProps {
  siteId: number
  siteDomain: string
  onClose: () => void
}

interface Plugin {
  file: string
  name: string
  version: string
  author: string
  active: boolean
  update_available: boolean
  new_version: string | null
}

interface Theme {
  slug: string
  name: string
  version: string
  author: string
  active: boolean
  update_available: boolean
  new_version: string | null
}

interface WPUser {
  id: number
  username: string
  email: string
  display_name: string
  roles: string[]
  registered: string
}

interface ErrorLog {
  message: string
  severity: 'CRITICAL' | 'ERROR' | 'WARNING' | 'INFO'
}

interface SiteInfo {
  wp_version: string
  php_version: string
  site_url: string
  home_url: string
  admin_email: string
  active_theme: string
  memory_limit: string
  max_upload_size: string
}

export default function SiteDetailsModal({ siteId, siteDomain, onClose }: SiteDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'plugins' | 'themes' | 'users' | 'errors'>('plugins')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  
  const [plugins, setPlugins] = useState<Plugin[]>([])
  const [themes, setThemes] = useState<Theme[]>([])
  const [users, setUsers] = useState<WPUser[]>([])
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([])
  const [siteInfo, setSiteInfo] = useState<SiteInfo | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      // Fetch all data in parallel
      const [pluginsRes, themesRes, usersRes, logsRes, infoRes] = await Promise.all([
        fetch('/api/sites//info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ siteId, endpoint: 'plugins' }),
          credentials: 'include'
        }),
        fetch('/api/sites//info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ siteId, endpoint: 'themes' }),
          credentials: 'include'
        }),
        fetch('/api/sites//info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ siteId, endpoint: 'users' }),
          credentials: 'include'
        }),
        fetch('/api/sites//info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ siteId, endpoint: 'error-logs' }),
          credentials: 'include'
        }),
        fetch('/api/sites//info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ siteId, endpoint: 'site-info' }),
          credentials: 'include'
        })
      ])

      if (pluginsRes.ok) setPlugins(await pluginsRes.json())
      if (themesRes.ok) setThemes(await themesRes.json())
      if (usersRes.ok) setUsers(await usersRes.json())
      if (logsRes.ok) {
        const logData = await logsRes.json()
        setErrorLogs(logData.logs || [])
      }
      if (infoRes.ok) setSiteInfo(await infoRes.json())
    } catch (e) {
      console.error('Error fetching site data:', e)
    }
    setLoading(false)
  }

  async function updateItem(type: 'plugin' | 'theme', item: string) {
    setUpdating(item)
    try {
      const res = await fetch('/api/sites//info/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, type, item }),
        credentials: 'include'
      })

      if (res.ok) {
        alert(`${type === 'plugin' ? 'Plugin' : 'Theme'} updated successfully!`)
        await fetchData()
      } else {
        alert('Update failed')
      }
    } catch (e) {
      alert('Error updating')
    }
    setUpdating(null)
  }

  const pluginsWithUpdates = plugins.filter(p => p.update_available).length
  const themesWithUpdates = themes.filter(t => t.update_available).length
  const criticalErrors = errorLogs.filter(log => log.severity === 'CRITICAL').length

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-xl">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-2">{siteDomain}</h2>
              {siteInfo && (
                <div className="text-sm opacity-90 space-y-1">
                  <p>WordPress {siteInfo.wp_version} • PHP {siteInfo.php_version} • {siteInfo.memory_limit}</p>
                  <p>Theme: {siteInfo.active_theme} • Max Upload: {siteInfo.max_upload_size}</p>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition"
            >
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b bg-gray-50">
          <div className="flex px-6">
            <button
              onClick={() => setActiveTab('plugins')}
              className={`px-6 py-3 font-medium relative ${
                activeTab === 'plugins'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Plugins ({plugins.length})
              {pluginsWithUpdates > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {pluginsWithUpdates}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('themes')}
              className={`px-6 py-3 font-medium relative ${
                activeTab === 'themes'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Themes ({themes.length})
              {themesWithUpdates > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {themesWithUpdates}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'users'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Users ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('errors')}
              className={`px-6 py-3 font-medium relative ${
                activeTab === 'errors'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Error Logs
              {criticalErrors > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {criticalErrors}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Plugins Tab */}
              {activeTab === 'plugins' && (
                <div className="space-y-3">
                  {plugins.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No plugins found</p>
                  ) : (
                    plugins.map(plugin => (
                      <div
                        key={plugin.file}
                        className={`border rounded-lg p-4 ${
                          plugin.update_available ? 'border-orange-300 bg-orange-50' : 'bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-lg">{plugin.name}</h3>
                              {plugin.active && (
                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                  Active
                                </span>
                              )}
                              {plugin.update_available && (
                                <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
                                  Update Available
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              Version: {plugin.version}
                              {plugin.update_available && plugin.new_version && (
                                <span className="text-orange-600 font-medium"> → {plugin.new_version}</span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">By {plugin.author}</p>
                          </div>
                          {plugin.update_available && (
                            <button
                              onClick={() => updateItem('plugin', plugin.file)}
                              disabled={updating === plugin.file}
                              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
                            >
                              {updating === plugin.file ? 'Updating...' : 'Update Now'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Themes Tab */}
              {activeTab === 'themes' && (
                <div className="space-y-3">
                  {themes.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No themes found</p>
                  ) : (
                    themes.map(theme => (
                      <div
                        key={theme.slug}
                        className={`border rounded-lg p-4 ${
                          theme.update_available ? 'border-orange-300 bg-orange-50' : 'bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-lg">{theme.name}</h3>
                              {theme.active && (
                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                  Active
                                </span>
                              )}
                              {theme.update_available && (
                                <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
                                  Update Available
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              Version: {theme.version}
                              {theme.update_available && theme.new_version && (
                                <span className="text-orange-600 font-medium"> → {theme.new_version}</span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">By {theme.author}</p>
                          </div>
                          {theme.update_available && (
                            <button
                              onClick={() => updateItem('theme', theme.slug)}
                              disabled={updating === theme.slug}
                              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
                            >
                              {updating === theme.slug ? 'Updating...' : 'Update Now'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Users Tab */}
              {activeTab === 'users' && (
                <div className="bg-white rounded-lg border overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registered</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {users.map(user => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="font-medium">{user.display_name}</div>
                            <div className="text-sm text-gray-500">@{user.username}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                          <td className="px-6 py-4">
                            <div className="flex gap-1">
                              {user.roles.map(role => (
                                <span
                                  key={role}
                                  className={`px-2 py-1 text-xs rounded ${
                                    role === 'administrator'
                                      ? 'bg-purple-100 text-purple-800'
                                      : role === 'editor'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}
                                >
                                  {role}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(user.registered).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Error Logs Tab - Terminal Style */}
              {activeTab === 'errors' && (
                <div className="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-sm h-96 overflow-auto">
                  <div className="flex items-center gap-2 mb-4 text-gray-400 border-b border-gray-700 pb-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <span className="ml-2">debug.log - {siteDomain}</span>
                  </div>
                  
                  {errorLogs.length === 0 ? (
                    <p className="text-gray-500">No error logs found or debug.log doesn't exist</p>
                  ) : (
                    <div className="space-y-1">
                      {errorLogs.map((log, idx) => (
                        <div
                          key={idx}
                          className={`py-1 px-2 rounded ${
                            log.severity === 'CRITICAL'
                              ? 'bg-red-900 bg-opacity-30 text-red-400'
                              : log.severity === 'ERROR'
                              ? 'bg-red-900 bg-opacity-20 text-red-300'
                              : log.severity === 'WARNING'
                              ? 'bg-yellow-900 bg-opacity-20 text-yellow-300'
                              : 'text-green-400'
                          }`}
                        >
                          <span className="opacity-50 mr-2">[{idx + 1}]</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-xs mr-2 ${
                              log.severity === 'CRITICAL'
                                ? 'bg-red-600 text-white'
                                : log.severity === 'ERROR'
                                ? 'bg-red-500 text-white'
                                : log.severity === 'WARNING'
                                ? 'bg-yellow-600 text-white'
                                : 'bg-blue-600 text-white'
                            }`}
                          >
                            {log.severity}
                          </span>
                          {log.message}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50 rounded-b-xl flex justify-between items-center">
          <button
            onClick={fetchData}
            disabled={loading}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            🔄 Refresh Data
          </button>
          <button
            onClick={onClose}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
