'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  EnvelopeIcon, 
  CheckCircleIcon, 
  ExclamationCircleIcon,
  PaperAirplaneIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'

interface EmailSettings {
  id?: number
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPass: string
  fromEmail: string
  fromName: string
  secure: boolean
}

export default function EmailSettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  const [settings, setSettings] = useState<EmailSettings>({
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPass: '',
    fromEmail: '',
    fromName: 'WP-System',
    secure: false // Default false for port 587
  })

  const [testEmail, setTestEmail] = useState('')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings/email')
      const data = await res.json()
      
      if (data.settings) {
        setSettings(data.settings)
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch('/api/settings/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      const data = await res.json()

      if (res.ok) {
        setMessage({ type: 'success', text: 'Email settings saved successfully!' })
        setSettings(data.settings)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save settings' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    if (!testEmail) {
      setMessage({ type: 'error', text: 'Please enter an email address for testing' })
      return
    }

    setTesting(true)
    setMessage(null)

    try {
      const res = await fetch('/api/settings/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail })
      })

      const data = await res.json()

      if (res.ok) {
        setMessage({ type: 'success', text: '✅ Test email sent! Check your inbox.' })
      } else {
        setMessage({ type: 'error', text: data.details || data.error || 'Failed to send test email' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to send test email' })
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <button
        onClick={() => router.push('/dashboard/settings')}
        className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to Settings
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <EnvelopeIcon className="h-8 w-8 text-blue-600" />
          Email Settings
        </h1>
        <p className="text-gray-600 mt-2">Configure SMTP settings for sending emails</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircleIcon className="h-5 w-5" />
          ) : (
            <ExclamationCircleIcon className="h-5 w-5" />
          )}
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SMTP Host
            </label>
            <input
              type="text"
              value={settings.smtpHost}
              onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
              placeholder="smtp.gmail.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SMTP Port
            </label>
            <input
              type="number"
              value={settings.smtpPort}
              onChange={(e) => setSettings({ ...settings, smtpPort: parseInt(e.target.value) })}
              placeholder="587"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              587 (STARTTLS) or 465 (SSL/TLS)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SMTP Username
            </label>
            <input
              type="text"
              value={settings.smtpUser}
              onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
              placeholder="your-email@gmail.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SMTP Password
            </label>
            <input
              type="password"
              value={settings.smtpPass}
              onChange={(e) => setSettings({ ...settings, smtpPass: e.target.value })}
              placeholder="App password or SMTP password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required={!settings.id}
            />
            <p className="text-xs text-gray-500 mt-1">
              For Gmail, use an App Password (not your regular password)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From Email
            </label>
            <input
              type="email"
              value={settings.fromEmail}
              onChange={(e) => setSettings({ ...settings, fromEmail: e.target.value })}
              placeholder="noreply@yourdomain.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From Name
            </label>
            <input
              type="text"
              value={settings.fromName}
              onChange={(e) => setSettings({ ...settings, fromName: e.target.value })}
              placeholder="WP-System"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
        </div>

        <div className="flex items-center p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <input
            type="checkbox"
            id="secure"
            checked={settings.secure}
            onChange={(e) => setSettings({ ...settings, secure: e.target.checked })}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="secure" className="ml-3 block text-sm">
            <span className="font-medium text-gray-900">Use SSL/TLS</span>
            <span className="block text-gray-600 mt-1">
              ⚠️ <strong>Important:</strong> Check this ONLY for port 465. For port 587, leave UNCHECKED (uses STARTTLS automatically)
            </span>
          </label>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <CheckCircleIcon className="h-5 w-5" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </form>

      <div className="mt-8 bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <PaperAirplaneIcon className="h-6 w-6 text-blue-600" />
          Test Email
        </h2>
        <p className="text-gray-600 mb-4">
          Send a test email to verify your SMTP configuration
        </p>
        <div className="flex gap-4">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="recipient@example.com"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleTest}
            disabled={testing || !settings.id}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            {testing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Sending...
              </>
            ) : (
              <>
                <PaperAirplaneIcon className="h-5 w-5" />
                Send Test
              </>
            )}
          </button>
        </div>
        {!settings.id && (
          <p className="text-sm text-amber-600 mt-2">
            ⚠️ Please save your SMTP settings first before testing
          </p>
        )}
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">📝 Common SMTP Settings</h3>
        <div className="space-y-3 text-sm text-blue-800">
          <div>
            <strong>Gmail:</strong>
            <ul className="list-disc list-inside ml-4 mt-1">
              <li>Host: smtp.gmail.com</li>
              <li>Port: 587 (SSL/TLS: OFF) or 465 (SSL/TLS: ON)</li>
              <li>Use App Password (not regular password)</li>
            </ul>
          </div>
          <div>
            <strong>Your Server (smtp.growth99.net):</strong>
            <ul className="list-disc list-inside ml-4 mt-1">
              <li>Host: smtp.growth99.net</li>
              <li>Port: 587 (SSL/TLS: OFF)</li>
              <li>Self-signed certificates are handled automatically</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
