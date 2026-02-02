'use client'

import { useState, useEffect } from 'react'
import {
    Activity,
    Search,
    Filter,
    Download,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Info,
    Clock,
    User,
    Globe,
    Shield,
    Settings
} from 'lucide-react'

interface ActivityLog {
    id: string
    action: string
    category: string
    userEmail: string
    userName?: string
    targetType?: string
    targetName?: string
    details?: Record<string, unknown>
    ipAddress?: string
    browser?: string
    createdAt: string
}

type CategoryFilter = 'all' | 'auth' | 'user' | 'team' | 'site' | 'settings' | 'security'

export default function ActivityPage() {
    const [activities, setActivities] = useState<ActivityLog[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(true)

    useEffect(() => {
        fetchActivities()
    }, [])

    const fetchActivities = async () => {
        try {
            const res = await fetch('/api/activity?limit=50')
            if (res.ok) {
                const data = await res.json()
                setActivities(data.activities || [])
            } else {
                // Mock data
                setActivities([
                    { id: '1', action: 'user.login', category: 'auth', userEmail: 'admin@example.com', userName: 'Admin', ipAddress: '192.168.1.1', browser: 'Chrome', createdAt: new Date(Date.now() - 60000).toISOString() },
                    { id: '2', action: 'site.created', category: 'site', userEmail: 'admin@example.com', userName: 'Admin', targetType: 'site', targetName: 'newsite.com', createdAt: new Date(Date.now() - 300000).toISOString() },
                    { id: '3', action: 'team.member_added', category: 'team', userEmail: 'admin@example.com', userName: 'Admin', targetType: 'user', targetName: 'john@example.com', createdAt: new Date(Date.now() - 600000).toISOString() },
                    { id: '4', action: 'user.2fa_enabled', category: 'security', userEmail: 'john@example.com', userName: 'John Doe', createdAt: new Date(Date.now() - 1200000).toISOString() },
                    { id: '5', action: 'settings.email_updated', category: 'settings', userEmail: 'admin@example.com', userName: 'Admin', createdAt: new Date(Date.now() - 3600000).toISOString() },
                    { id: '6', action: 'user.login_failed', category: 'auth', userEmail: 'unknown@attacker.com', ipAddress: '185.220.101.1', browser: 'Unknown', createdAt: new Date(Date.now() - 7200000).toISOString() },
                ])
            }
        } catch (error) {
            console.error('Failed to fetch activities:', error)
        } finally {
            setLoading(false)
        }
    }

    const getActionIcon = (action: string, category: string) => {
        if (action.includes('failed') || action.includes('error')) {
            return <XCircle className="w-4 h-4 text-red-400" />
        }
        if (action.includes('warning')) {
            return <AlertTriangle className="w-4 h-4 text-yellow-400" />
        }
        if (action.includes('login') || action.includes('logout')) {
            return <User className="w-4 h-4 text-blue-400" />
        }
        if (category === 'site') {
            return <Globe className="w-4 h-4 text-green-400" />
        }
        if (category === 'security') {
            return <Shield className="w-4 h-4 text-purple-400" />
        }
        if (category === 'settings') {
            return <Settings className="w-4 h-4 text-gray-400" />
        }
        return <CheckCircle className="w-4 h-4 text-green-400" />
    }

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'auth': return 'bg-blue-500/10 text-blue-400 border-blue-500/30'
            case 'user': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
            case 'team': return 'bg-orange-500/10 text-orange-400 border-orange-500/30'
            case 'site': return 'bg-green-500/10 text-green-400 border-green-500/30'
            case 'security': return 'bg-purple-500/10 text-purple-400 border-purple-500/30'
            case 'settings': return 'bg-gray-500/10 text-gray-400 border-gray-500/30'
            default: return 'bg-slate-500/10 text-slate-400 border-slate-500/30'
        }
    }

    const formatAction = (action: string) => {
        return action
            .split('.')
            .pop()
            ?.replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase()) || action
    }

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr)
        const now = new Date()
        const diff = now.getTime() - date.getTime()
        const mins = Math.floor(diff / 60000)
        const hours = Math.floor(diff / 3600000)
        const days = Math.floor(diff / 86400000)

        if (mins < 1) return 'Just now'
        if (mins < 60) return `${mins} min ago`
        if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
        if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`
        return date.toLocaleDateString()
    }

    const filteredActivities = activities.filter(activity => {
        const matchesSearch = activity.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
            activity.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (activity.targetName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
        const matchesCategory = categoryFilter === 'all' || activity.category === categoryFilter
        return matchesSearch && matchesCategory
    })

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-8 w-48 bg-slate-700 rounded animate-pulse" />
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-16 bg-slate-800 rounded-lg animate-pulse" />
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
                    <h1 className="text-2xl font-bold text-white">Activity Log</h1>
                    <p className="text-gray-400 mt-1">View all system activity and audit trail</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition">
                    <Download className="w-4 h-4" />
                    Export
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search activity..."
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
                    {(['all', 'auth', 'site', 'team', 'user', 'security', 'settings'] as CategoryFilter[]).map((category) => (
                        <button
                            key={category}
                            onClick={() => setCategoryFilter(category)}
                            className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap transition ${categoryFilter === category
                                    ? 'bg-purple-500 text-white'
                                    : 'bg-slate-700 text-gray-400 hover:text-white'
                                }`}
                        >
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Activity List */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
                {filteredActivities.length > 0 ? (
                    <div className="divide-y divide-slate-700">
                        {filteredActivities.map((activity) => (
                            <div
                                key={activity.id}
                                className="flex items-start gap-4 p-4 hover:bg-slate-700/30 transition"
                            >
                                {/* Icon */}
                                <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
                                    {getActionIcon(activity.action, activity.category)}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-white">
                                                <span className="font-medium">{activity.userName || activity.userEmail}</span>
                                                {' '}
                                                <span className="text-gray-400">{formatAction(activity.action)}</span>
                                                {activity.targetName && (
                                                    <>
                                                        {' '}
                                                        <span className="text-purple-400">{activity.targetName}</span>
                                                    </>
                                                )}
                                            </p>
                                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                                                <span className={`text-xs px-2 py-0.5 rounded border ${getCategoryColor(activity.category)}`}>
                                                    {activity.category}
                                                </span>
                                                {activity.ipAddress && (
                                                    <span className="text-gray-500 text-xs">IP: {activity.ipAddress}</span>
                                                )}
                                                {activity.browser && (
                                                    <span className="text-gray-500 text-xs">{activity.browser}</span>
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-gray-500 text-sm whitespace-nowrap flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {formatTime(activity.createdAt)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-12 text-center">
                        <Activity className="w-12 h-12 mx-auto text-gray-600 mb-4" />
                        <p className="text-gray-400">No activity found</p>
                        <p className="text-gray-600 text-sm mt-1">Try adjusting your filters</p>
                    </div>
                )}
            </div>
        </div>
    )
}
