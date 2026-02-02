'use client'

import { useState, useEffect } from 'react'
import {
    AlertTriangle,
    AlertCircle,
    Info,
    XCircle,
    Search,
    Filter,
    Download,
    RefreshCw,
    CheckCircle,
    Clock,
    Globe
} from 'lucide-react'

interface SiteError {
    id: string
    siteId: string
    siteDomain: string
    severity: 'notice' | 'warning' | 'error' | 'critical' | 'fatal'
    errorType: string
    message: string
    sourceFile?: string
    lineNumber?: number
    stackTrace?: string
    resolved: boolean
    createdAt: string
}

type SeverityFilter = 'all' | 'notice' | 'warning' | 'error' | 'critical' | 'fatal'

export default function ErrorsPage() {
    const [errors, setErrors] = useState<SiteError[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all')
    const [showResolved, setShowResolved] = useState(false)
    const [selectedError, setSelectedError] = useState<SiteError | null>(null)
    const [refreshing, setRefreshing] = useState(false)

    useEffect(() => {
        fetchErrors()
    }, [])

    const fetchErrors = async () => {
        try {
            const res = await fetch('/api/errors')
            if (res.ok) {
                const data = await res.json()
                setErrors(data.errors || [])
            } else {
                // Mock data
                setErrors([
                    { id: '1', siteId: '1', siteDomain: 'example.com', severity: 'error', errorType: 'PHP Fatal Error', message: 'Uncaught Error: Call to undefined function get_header() in /var/www/html/wp-content/themes/custom/index.php:5', sourceFile: '/wp-content/themes/custom/index.php', lineNumber: 5, resolved: false, createdAt: new Date(Date.now() - 120000).toISOString() },
                    { id: '2', siteId: '2', siteDomain: 'blog.example.com', severity: 'warning', errorType: 'PHP Warning', message: 'Deprecated: Function create_function() is deprecated in /var/www/html/wp-content/plugins/old-plugin/core.php:142', sourceFile: '/wp-content/plugins/old-plugin/core.php', lineNumber: 142, resolved: false, createdAt: new Date(Date.now() - 300000).toISOString() },
                    { id: '3', siteId: '1', siteDomain: 'example.com', severity: 'notice', errorType: 'PHP Notice', message: 'Undefined index: page_id in /var/www/html/wp-content/themes/custom/functions.php:256', sourceFile: '/wp-content/themes/custom/functions.php', lineNumber: 256, resolved: true, createdAt: new Date(Date.now() - 3600000).toISOString() },
                    { id: '4', siteId: '3', siteDomain: 'shop.example.com', severity: 'critical', errorType: 'Database Error', message: 'WordPress database error: [Table \'wp_options\' is marked as crashed and should be repaired]', resolved: false, createdAt: new Date(Date.now() - 600000).toISOString() },
                    { id: '5', siteId: '2', siteDomain: 'blog.example.com', severity: 'fatal', errorType: 'PHP Fatal Error', message: 'Allowed memory size of 134217728 bytes exhausted (tried to allocate 65536 bytes)', sourceFile: '/wp-includes/class-wp-query.php', lineNumber: 3452, resolved: false, createdAt: new Date(Date.now() - 60000).toISOString() },
                ])
            }
        } catch (error) {
            console.error('Failed to fetch errors:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleRefresh = async () => {
        setRefreshing(true)
        await fetchErrors()
        setRefreshing(false)
    }

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'notice': return <Info className="w-4 h-4 text-blue-400" />
            case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-400" />
            case 'error': return <AlertCircle className="w-4 h-4 text-orange-400" />
            case 'critical': return <XCircle className="w-4 h-4 text-red-400" />
            case 'fatal': return <XCircle className="w-4 h-4 text-red-500" />
            default: return <Info className="w-4 h-4 text-gray-400" />
        }
    }

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'notice': return 'text-blue-400 bg-blue-500/10 border-blue-500/30'
            case 'warning': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
            case 'error': return 'text-orange-400 bg-orange-500/10 border-orange-500/30'
            case 'critical': return 'text-red-400 bg-red-500/10 border-red-500/30'
            case 'fatal': return 'text-red-500 bg-red-600/10 border-red-600/30'
            default: return 'text-gray-400 bg-gray-500/10 border-gray-500/30'
        }
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
        return date.toLocaleDateString()
    }

    const filteredErrors = errors.filter(error => {
        const matchesSearch = error.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
            error.siteDomain.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (error.sourceFile?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
        const matchesSeverity = severityFilter === 'all' || error.severity === severityFilter
        const matchesResolved = showResolved || !error.resolved
        return matchesSearch && matchesSeverity && matchesResolved
    })

    const severityCounts = {
        all: errors.filter(e => !e.resolved).length,
        notice: errors.filter(e => e.severity === 'notice' && !e.resolved).length,
        warning: errors.filter(e => e.severity === 'warning' && !e.resolved).length,
        error: errors.filter(e => e.severity === 'error' && !e.resolved).length,
        critical: errors.filter(e => e.severity === 'critical' && !e.resolved).length,
        fatal: errors.filter(e => e.severity === 'fatal' && !e.resolved).length,
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-8 w-48 bg-slate-700 rounded animate-pulse" />
                <div className="h-64 bg-slate-800 rounded-xl animate-pulse" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Error Monitoring</h1>
                    <p className="text-gray-400 mt-1">Track and resolve PHP errors across your sites</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition">
                        <Download className="w-4 h-4" />
                        Export
                    </button>
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
                        placeholder="Search errors..."
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
                    {(['all', 'fatal', 'critical', 'error', 'warning', 'notice'] as SeverityFilter[]).map((severity) => (
                        <button
                            key={severity}
                            onClick={() => setSeverityFilter(severity)}
                            className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap transition ${severityFilter === severity
                                    ? 'bg-purple-500 text-white'
                                    : 'bg-slate-700 text-gray-400 hover:text-white'
                                }`}
                        >
                            {severity.charAt(0).toUpperCase() + severity.slice(1)}
                            {severity !== 'all' && (
                                <span className="ml-1.5 opacity-75">({severityCounts[severity]})</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Show resolved toggle */}
            <div className="flex items-center gap-2">
                <input
                    type="checkbox"
                    id="showResolved"
                    checked={showResolved}
                    onChange={(e) => setShowResolved(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-purple-500 focus:ring-purple-500"
                />
                <label htmlFor="showResolved" className="text-gray-400 text-sm">
                    Show resolved errors
                </label>
            </div>

            {/* Terminal-style Error List */}
            <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden font-mono">
                {/* Terminal Header */}
                <div className="flex items-center gap-2 px-4 py-3 bg-slate-800 border-b border-slate-700">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="ml-4 text-gray-400 text-sm">error-log — {filteredErrors.length} entries</span>
                </div>

                {/* Error List */}
                <div className="max-h-[600px] overflow-y-auto">
                    {filteredErrors.length > 0 ? (
                        filteredErrors.map((error, index) => (
                            <div
                                key={error.id}
                                onClick={() => setSelectedError(selectedError?.id === error.id ? null : error)}
                                className={`px-4 py-3 border-b border-slate-800 cursor-pointer hover:bg-slate-800/50 transition ${error.resolved ? 'opacity-50' : ''
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    {/* Line number */}
                                    <span className="text-gray-600 text-sm w-6">{String(index + 1).padStart(2, '0')}</span>

                                    {/* Severity icon */}
                                    <span className="mt-0.5">{getSeverityIcon(error.severity)}</span>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`text-xs px-2 py-0.5 rounded border ${getSeverityColor(error.severity)}`}>
                                                {error.severity.toUpperCase()}
                                            </span>
                                            <span className="text-gray-500 text-sm flex items-center gap-1">
                                                <Globe className="w-3 h-3" />
                                                {error.siteDomain}
                                            </span>
                                            <span className="text-gray-600 text-sm flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {formatTime(error.createdAt)}
                                            </span>
                                            {error.resolved && (
                                                <span className="text-green-400 text-xs flex items-center gap-1">
                                                    <CheckCircle className="w-3 h-3" />
                                                    Resolved
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-gray-300 text-sm mt-1 break-all">{error.message}</p>
                                        {error.sourceFile && (
                                            <p className="text-gray-500 text-xs mt-1">
                                                at {error.sourceFile}
                                                {error.lineNumber && <span>:{error.lineNumber}</span>}
                                            </p>
                                        )}

                                        {/* Expanded details */}
                                        {selectedError?.id === error.id && error.stackTrace && (
                                            <div className="mt-3 p-3 bg-slate-800 rounded border border-slate-700">
                                                <p className="text-gray-400 text-xs mb-2">Stack Trace:</p>
                                                <pre className="text-gray-500 text-xs overflow-x-auto whitespace-pre-wrap">
                                                    {error.stackTrace}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="px-4 py-12 text-center">
                            <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
                            <p className="text-gray-400">No errors found</p>
                            <p className="text-gray-600 text-sm mt-1">Your sites are running smoothly</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
