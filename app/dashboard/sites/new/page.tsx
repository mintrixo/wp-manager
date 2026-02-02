'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Globe, Loader2, CheckCircle, Copy, Download, AlertTriangle } from 'lucide-react'

export default function AddSitePage() {
    const router = useRouter()
    const [url, setUrl] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState<{
        siteId: string
        domain: string
        apiKey: string
        environment: string
    } | null>(null)
    const [copied, setCopied] = useState(false)

    const validateUrl = (value: string): boolean => {
        try {
            const urlObj = new URL(value)
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
        } catch {
            return false
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (!validateUrl(url)) {
            setError('Please enter a valid URL (e.g., https://example.com)')
            return
        }

        setLoading(true)

        try {
            const res = await fetch('/api/sites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || 'Failed to add site')
                return
            }

            setSuccess({
                siteId: data.site.id,
                domain: data.site.domain,
                apiKey: data.site.apiKey,
                environment: data.site.environment
            })

        } catch (err) {
            setError('An error occurred. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const copyApiKey = () => {
        if (success?.apiKey) {
            navigator.clipboard.writeText(success.apiKey)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const downloadPlugin = async () => {
        if (!success) return

        try {
            const res = await fetch(`/api/sites/${success.siteId}/plugin`)
            if (res.ok) {
                const blob = await res.blob()
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'wordpress-manager-mu-plugin.php'
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(url)
            }
        } catch (error) {
            console.error('Failed to download plugin:', error)
        }
    }

    if (success) {
        return (
            <div className="max-w-2xl mx-auto">
                <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-8 text-center">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-8 h-8 text-green-400" />
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-2">Site Added Successfully!</h2>
                    <p className="text-gray-400 mb-6">
                        <span className="text-green-400 font-mono">{success.domain}</span> has been added as a{' '}
                        <span className={success.environment === 'live' ? 'text-green-400' : 'text-yellow-400'}>
                            {success.environment}
                        </span> site.
                    </p>

                    {/* API Key */}
                    <div className="bg-slate-800 rounded-xl p-6 mb-6 text-left">
                        <h3 className="text-white font-semibold mb-2">API Key</h3>
                        <p className="text-gray-400 text-sm mb-4">
                            Save this API key securely. You'll need it to configure the MU-Plugin.
                        </p>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 p-3 bg-slate-900 rounded-lg text-green-400 font-mono text-sm overflow-x-auto">
                                {success.apiKey}
                            </code>
                            <button
                                onClick={copyApiKey}
                                className="p-3 bg-slate-700 rounded-lg text-white hover:bg-slate-600 transition"
                            >
                                {copied ? <CheckCircle className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Plugin Download */}
                    <div className="bg-slate-800 rounded-xl p-6 mb-6 text-left">
                        <h3 className="text-white font-semibold mb-2">Install MU-Plugin</h3>
                        <p className="text-gray-400 text-sm mb-4">
                            Download and upload the MU-Plugin to <code className="text-purple-400">wp-content/mu-plugins/</code>
                        </p>
                        <button
                            onClick={downloadPlugin}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition"
                        >
                            <Download className="w-4 h-4" />
                            Download MU-Plugin
                        </button>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => {
                                setSuccess(null)
                                setUrl('')
                            }}
                            className="flex-1 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
                        >
                            Add Another Site
                        </button>
                        <Link
                            href={`/dashboard/sites/${success.siteId}`}
                            className="flex-1 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition text-center"
                        >
                            View Site Details
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <Link
                    href="/dashboard/sites"
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition mb-4"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Sites
                </Link>
                <h1 className="text-2xl font-bold text-white">Add New Site</h1>
                <p className="text-gray-400 mt-1">Register a new WordPress site to manage</p>
            </div>

            {/* Form */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            WordPress Site URL
                        </label>
                        <div className="relative">
                            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                            <input
                                type="url"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://example.com"
                                className="w-full pl-12 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                required
                            />
                        </div>
                        <p className="text-gray-500 text-sm mt-2">
                            Enter the full URL of your WordPress site including http:// or https://
                        </p>
                    </div>

                    {/* Environment Detection Info */}
                    <div className="p-4 bg-slate-700/50 rounded-lg">
                        <h4 className="text-white font-medium mb-2">Automatic Environment Detection</h4>
                        <p className="text-gray-400 text-sm">
                            Sites with domains ending in <code className="text-yellow-400">.gogroth.com</code> will be marked as <span className="text-yellow-400">Beta</span>.
                            All other domains will be marked as <span className="text-green-400">Live</span>.
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !url}
                        className="w-full py-3 bg-purple-500 text-white font-semibold rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Adding Site...
                            </>
                        ) : (
                            'Add Site'
                        )}
                    </button>
                </form>
            </div>

            {/* Help Section */}
            <div className="mt-8 bg-slate-800/30 border border-slate-700 rounded-xl p-6">
                <h3 className="text-white font-semibold mb-4">What Happens Next?</h3>
                <ol className="space-y-3 text-gray-400">
                    <li className="flex items-start gap-3">
                        <span className="flex items-center justify-center w-6 h-6 bg-purple-500/20 text-purple-400 rounded-full text-sm flex-shrink-0">1</span>
                        <span>An API key will be generated for your site</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="flex items-center justify-center w-6 h-6 bg-purple-500/20 text-purple-400 rounded-full text-sm flex-shrink-0">2</span>
                        <span>Download and install the MU-Plugin on your WordPress site</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="flex items-center justify-center w-6 h-6 bg-purple-500/20 text-purple-400 rounded-full text-sm flex-shrink-0">3</span>
                        <span>Configure the plugin with your API key</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="flex items-center justify-center w-6 h-6 bg-purple-500/20 text-purple-400 rounded-full text-sm flex-shrink-0">4</span>
                        <span>Your site will sync automatically and appear in the dashboard</span>
                    </li>
                </ol>
            </div>
        </div>
    )
}
