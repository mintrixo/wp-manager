'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Users,
  Plus,
  Search,
  Globe,
  MoreVertical,
  Mail,
  UserPlus,
  Settings,
  Trash2
} from 'lucide-react'

interface Team {
  id: string
  name: string
  email: string
  description?: string
  status: string
  memberCount: number
  siteCount: number
  createdAt: string
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)

  useEffect(() => {
    fetchTeams()
  }, [])

  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/teams')
      if (res.ok) {
        const data = await res.json()
        setTeams(data.teams || [])
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-700 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
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
          <h1 className="text-2xl font-bold text-white">Teams</h1>
          <p className="text-gray-400 mt-1">Manage your teams and members</p>
        </div>
        <Link
          href="/dashboard/teams/new"
          className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition"
        >
          <Plus className="w-4 h-4" />
          Create Team
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search teams..."
          className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* Teams Grid */}
      {filteredTeams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeams.map((team) => (
            <div
              key={team.id}
              className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 hover:border-slate-600 transition"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{team.name}</h3>
                    <p className="text-gray-500 text-sm flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {team.email}
                    </p>
                  </div>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setSelectedTeam(selectedTeam === team.id ? null : team.id)}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {selectedTeam === team.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setSelectedTeam(null)} />
                      <div className="absolute right-0 top-full mt-1 w-48 bg-slate-700 border border-slate-600 rounded-lg shadow-xl z-50 overflow-hidden py-1">
                        <Link
                          href={`/dashboard/teams/${team.id}/members`}
                          className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:bg-slate-600 transition"
                        >
                          <UserPlus className="w-4 h-4" />
                          Manage Members
                        </Link>
                        <Link
                          href={`/dashboard/teams/${team.id}/settings`}
                          className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:bg-slate-600 transition"
                        >
                          <Settings className="w-4 h-4" />
                          Team Settings
                        </Link>
                        <button className="flex items-center gap-2 w-full px-4 py-2 text-red-400 hover:bg-red-500/10 transition">
                          <Trash2 className="w-4 h-4" />
                          Delete Team
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Description */}
              {team.description && (
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">{team.description}</p>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-blue-400" />
                    <span className="text-xl font-bold text-white">{team.memberCount}</span>
                  </div>
                  <p className="text-xs text-gray-500">Members</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Globe className="w-4 h-4 text-green-400" />
                    <span className="text-xl font-bold text-white">{team.siteCount}</span>
                  </div>
                  <p className="text-xs text-gray-500">Sites</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Link
                  href={`/dashboard/teams/${team.id}/members`}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition"
                >
                  <UserPlus className="w-4 h-4" />
                  Members
                </Link>
                <Link
                  href={`/dashboard/teams/${team.id}`}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
                >
                  View
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Users className="w-16 h-16 mx-auto text-gray-600 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No teams found</h3>
          <p className="text-gray-400 mb-6">
            {searchQuery ? 'Try adjusting your search.' : 'Create your first team to get started.'}
          </p>
          <Link
            href="/dashboard/teams/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition"
          >
            <Plus className="w-5 h-5" />
            Create Your First Team
          </Link>
        </div>
      )}
    </div>
  )
}
