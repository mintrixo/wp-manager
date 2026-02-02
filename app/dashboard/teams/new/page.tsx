'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Users, Loader2 } from 'lucide-react'

export default function NewTeamPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        description: '',
        allowedEmailDomains: ''
    })

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)

        try {
            const res = await fetch('/api/teams/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    description: formData.description,
                    allowedEmailDomains: formData.allowedEmailDomains
                        ? formData.allowedEmailDomains.split(',').map(d => d.trim())
                        : []
                })
            })

            if (res.ok) {
                router.push('/dashboard/teams')
            } else {
                const error = await res.json()
                alert(error.error || 'Failed to create team')
            }
        } catch (error) {
            alert('Failed to create team')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-8">
            <button
                onClick={() => router.push('/dashboard/teams')}
                className="flex items-center gap-2 text-gray-400 hover:text-white mb-6"
            >
                <ArrowLeft size={20} />
                Back to Teams
            </button>

            <div className="max-w-2xl">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <Users size={28} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white">Create New Team</h1>
                        <p className="text-gray-400">Add a new team to organize your sites and users</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="bg-slate-800 rounded-xl p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">
                            Team Name *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. Development Team"
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">
                            Team Email *
                        </label>
                        <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="e.g. team@example.com"
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Brief description of the team's purpose"
                            rows={3}
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">
                            Allowed Email Domains
                        </label>
                        <input
                            type="text"
                            value={formData.allowedEmailDomains}
                            onChange={(e) => setFormData({ ...formData, allowedEmailDomains: e.target.value })}
                            placeholder="e.g. example.com, company.org (comma separated)"
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Only users with these email domains can join this team
                        </p>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Users size={20} />
                                    Create Team
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => router.push('/dashboard/teams')}
                            className="px-6 py-3 bg-slate-700 text-gray-300 rounded-lg hover:bg-slate-600 font-semibold"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
