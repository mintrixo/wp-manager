'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, UserPlus, Trash2, Users } from 'lucide-react'

type User = {
  id: number
  name: string
  email: string
  role: string
}

type Team = {
  id: number
  name: string
  members: User[]
}

export default function TeamManagePage() {
  const params = useParams()
  const router = useRouter()
  const teamId = params.id as string

  const [team, setTeam] = useState<Team | null>(null)
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')

  useEffect(() => {
    fetchTeam()
    fetchAllUsers()
  }, [teamId])

  async function fetchTeam() {
    try {
      const res = await fetch(`/api/teams/${teamId}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setTeam(data.team)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchAllUsers() {
    try {
      const res = await fetch('/api/users', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setAllUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  async function addUserToTeam() {
    if (!selectedUserId) return

    try {
      const res = await fetch(`/api/teams/${teamId}/add-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId: parseInt(selectedUserId) })
      })

      if (res.ok) {
        setShowAddModal(false)
        setSelectedUserId('')
        await fetchTeam()
        await fetchAllUsers()
        alert('User added to team successfully!')
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to add user')
      }
    } catch (error) {
      alert('Failed to add user to team')
    }
  }

  async function removeUserFromTeam(userId: number, userName: string) {
    if (!confirm(`Remove ${userName} from this team?`)) return

    try {
      const res = await fetch(`/api/teams/${teamId}/remove-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId })
      })

      if (res.ok) {
        await fetchTeam()
        await fetchAllUsers()
        alert('User removed from team successfully!')
      } else {
        alert('Failed to remove user')
      }
    } catch (error) {
      alert('Failed to remove user from team')
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

  if (!team) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600">Team not found</p>
        </div>
      </div>
    )
  }

  // Filter out users already in the team
  const availableUsers = allUsers.filter(
    user => !team.members.find(member => member.id === user.id)
  )

  return (
    <div className="p-8">
      <div className="mb-8">
        <button
          onClick={() => router.push('/dashboard/teams')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Teams
        </button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{team.name}</h1>
            <p className="text-gray-600 mt-1">Manage team members</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-semibold"
          >
            <UserPlus size={20} />
            Add Member
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <div className="flex items-center gap-3">
            <Users size={32} />
            <div>
              <h2 className="text-2xl font-bold">{team.members.length} Members</h2>
              <p className="text-blue-100">Team members and their roles</p>
            </div>
          </div>
        </div>

        {team.members.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">No team members yet</p>
            <p className="text-sm text-gray-400 mt-2">Click "Add Member" to add users to this team</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">User</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Role</th>
                <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {team.members.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{member.name}</div>
                        <div className="text-sm text-gray-600">{member.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                      member.role === 'SUPERADMIN' ? 'bg-red-100 text-red-800' :
                      member.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => removeUserFromTeam(member.id, member.name)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-semibold"
                    >
                      <Trash2 size={16} />
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-6">Add Team Member</h2>
            
            {availableUsers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">All users are already in this team</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Select User</label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full border rounded-lg px-4 py-2"
                  >
                    <option value="">Choose a user...</option>
                    {availableUsers.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-6">
              {availableUsers.length > 0 && (
                <button
                  onClick={addUserToTeam}
                  disabled={!selectedUserId}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Member
                </button>
              )}
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setSelectedUserId('')
                }}
                className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
