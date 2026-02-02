'use client'

import { useEffect, useState } from 'react'
import { Activity } from 'lucide-react'

type ActivityLog = {
  id: number
  user: { name: string; email: string }
  site?: { domain: string }
  action: string
  details: string
  ipAddress: string
  createdAt: string
}

export default function LogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLogs()
  }, [])

  async function fetchLogs() {
    try {
      const res = await fetch('/api/activity-logs', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="space-y-4">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-200 rounded"></div>)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Activity Logs</h1>
        <p className="text-gray-600 mt-1">Track all user activities</p>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {logs.length === 0 ? (
          <div className="p-12 text-center">
            <Activity className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">No activity logs yet</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">User</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Action</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Site</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">IP</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                        {log.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{log.user.name}</div>
                        <div className="text-sm text-gray-600">{log.user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                        log.action === 'MAGIC_LOGIN' ? 'bg-green-100 text-green-800' :
                        log.action === 'LOGIN' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {log.action}
                      </span>
                      {log.details && (
                        <div className="text-sm text-gray-600 mt-1">{log.details}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {log.site ? (
                      <a 
                        href={`https://${log.site.domain}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {log.site.domain}
                      </a>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                    {log.ipAddress}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
