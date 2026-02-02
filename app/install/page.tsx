'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Database,
  Shield,
  User,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  RefreshCw,
  Mail,
  Key
} from 'lucide-react'

interface Requirement {
  name: string
  description: string
  status: 'pass' | 'fail' | 'warning' | 'pending'
  message?: string
}

type Step = 'config' | 'requirements' | 'database' | 'admin'

export default function InstallPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>('config')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Configuration form
  const [dbHost, setDbHost] = useState('localhost')
  const [dbPort, setDbPort] = useState('3306')
  const [dbUser, setDbUser] = useState('root')
  const [dbPassword, setDbPassword] = useState('')
  const [dbName, setDbName] = useState('wordpress_manager')
  const [showDbPassword, setShowDbPassword] = useState(false)

  // Optional config
  const [showOptional, setShowOptional] = useState(false)
  const [recaptchaSiteKey, setRecaptchaSiteKey] = useState('')
  const [recaptchaSecretKey, setRecaptchaSecretKey] = useState('')
  const [smtpHost, setSmtpHost] = useState('')
  const [smtpPort, setSmtpPort] = useState('587')
  const [smtpUser, setSmtpUser] = useState('')
  const [smtpPassword, setSmtpPassword] = useState('')
  const [smtpFromEmail, setSmtpFromEmail] = useState('')

  // Requirements
  const [requirements, setRequirements] = useState<Requirement[]>([])

  // Admin form
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [showAdminPassword, setShowAdminPassword] = useState(false)

  // Database status
  const [dbConnected, setDbConnected] = useState(false)
  const [dbCreated, setDbCreated] = useState(false)
  const [dbMigrated, setDbMigrated] = useState(false)

  const saveConfig = async () => {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/install/save-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dbHost,
          dbPort,
          dbUser,
          dbPassword,
          dbName,
          recaptchaSiteKey,
          recaptchaSecretKey,
          smtpHost,
          smtpPort,
          smtpUser,
          smtpPassword,
          smtpFromEmail: smtpFromEmail
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save configuration')
      }

      // Wait a moment for the config to be written
      await new Promise(resolve => setTimeout(resolve, 1000))
      setCurrentStep('requirements')

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration')
    } finally {
      setLoading(false)
    }
  }

  const checkRequirements = async () => {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/install/check-requirements')
      const data = await res.json()
      setRequirements(data.requirements || [])
    } catch (err) {
      setError('Failed to check requirements')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (currentStep === 'requirements') {
      checkRequirements()
    }
  }, [currentStep])

  const setupDatabase = async () => {
    setLoading(true)
    setError('')

    try {
      // Test connection
      const testRes = await fetch('/api/install/test-db', { method: 'POST' })
      if (!testRes.ok) {
        throw new Error('Database connection failed. Check your credentials.')
      }
      setDbConnected(true)

      // Create database
      const createRes = await fetch('/api/install/setup-db', { method: 'POST' })
      if (!createRes.ok) {
        throw new Error('Failed to create database')
      }
      setDbCreated(true)

      // Run migrations
      const migrateRes = await fetch('/api/install/migrate-db', { method: 'POST' })
      if (!migrateRes.ok) {
        throw new Error('Failed to run database migrations')
      }
      setDbMigrated(true)

      setCurrentStep('admin')

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Database setup failed')
    } finally {
      setLoading(false)
    }
  }

  const createAdmin = async () => {
    setLoading(true)
    setError('')

    if (!adminName || !adminEmail || !adminPassword) {
      setError('All fields are required')
      setLoading(false)
      return
    }

    if (adminPassword.length < 8) {
      setError('Password must be at least 8 characters')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/install/create-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: adminName,
          email: adminEmail,
          password: adminPassword
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create admin')
      }

      router.push('/login?installed=true')

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create admin')
    } finally {
      setLoading(false)
    }
  }

  const allRequirementsPassed = requirements.length > 0 &&
    requirements.every(r => r.status === 'pass' || r.status === 'warning')

  const steps = [
    { key: 'config', label: 'Configuration', number: 1 },
    { key: 'requirements', label: 'Requirements', number: 2 },
    { key: 'database', label: 'Database', number: 3 },
    { key: 'admin', label: 'Admin', number: 4 }
  ]

  const currentStepIndex = steps.findIndex(s => s.key === currentStep)

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-slate-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">WP</span>
          </div>
          <h1 className="text-3xl font-bold text-white">WordPress Site Manager</h1>
          <p className="text-gray-400 mt-2">Installation Wizard</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {steps.map((step, index) => (
            <div key={step.key} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition ${index <= currentStepIndex
                  ? 'bg-purple-500 text-white'
                  : 'bg-slate-700 text-gray-400'
                }`}>
                {index < currentStepIndex ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  step.number
                )}
              </div>
              {index < steps.length - 1 && (
                <div className={`w-12 h-1 mx-2 rounded ${index < currentStepIndex ? 'bg-purple-500' : 'bg-slate-700'
                  }`} />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="bg-slate-800/50 backdrop-blur-lg border border-slate-700 rounded-2xl p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 flex items-center gap-2">
              <XCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Step 1: Configuration */}
          {currentStep === 'config' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <Database className="w-6 h-6 text-purple-400" />
                <h2 className="text-xl font-semibold text-white">Database Configuration</h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Host</label>
                  <input
                    type="text"
                    value={dbHost}
                    onChange={(e) => setDbHost(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Port</label>
                  <input
                    type="text"
                    value={dbPort}
                    onChange={(e) => setDbPort(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Username</label>
                <input
                  type="text"
                  value={dbUser}
                  onChange={(e) => setDbUser(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showDbPassword ? 'text' : 'password'}
                    value={dbPassword}
                    onChange={(e) => setDbPassword(e.target.value)}
                    placeholder="Enter your MySQL password"
                    className="w-full px-4 py-2.5 pr-12 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDbPassword(!showDbPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showDbPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Database Name</label>
                <input
                  type="text"
                  value={dbName}
                  onChange={(e) => setDbName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Optional Settings Toggle */}
              <button
                onClick={() => setShowOptional(!showOptional)}
                className="text-purple-400 text-sm hover:text-purple-300 transition"
              >
                {showOptional ? '− Hide' : '+ Show'} Optional Settings (reCAPTCHA, Email)
              </button>

              {showOptional && (
                <div className="space-y-6 pt-4 border-t border-slate-700">
                  {/* reCAPTCHA */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="w-5 h-5 text-green-400" />
                      <span className="text-white font-medium">reCAPTCHA v3 (Optional)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Site Key</label>
                        <input
                          type="text"
                          value={recaptchaSiteKey}
                          onChange={(e) => setRecaptchaSiteKey(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Secret Key</label>
                        <input
                          type="text"
                          value={recaptchaSecretKey}
                          onChange={(e) => setRecaptchaSecretKey(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SMTP */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Mail className="w-5 h-5 text-blue-400" />
                      <span className="text-white font-medium">Email SMTP (Optional)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">SMTP Host</label>
                        <input
                          type="text"
                          value={smtpHost}
                          onChange={(e) => setSmtpHost(e.target.value)}
                          placeholder="smtp.gmail.com"
                          className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Port</label>
                        <input
                          type="text"
                          value={smtpPort}
                          onChange={(e) => setSmtpPort(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Username</label>
                        <input
                          type="text"
                          value={smtpUser}
                          onChange={(e) => setSmtpUser(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Password</label>
                        <input
                          type="password"
                          value={smtpPassword}
                          onChange={(e) => setSmtpPassword(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm text-gray-400 mb-1">From Email</label>
                      <input
                        type="email"
                        value={smtpFromEmail}
                        onChange={(e) => setSmtpFromEmail(e.target.value)}
                        placeholder="noreply@example.com"
                        className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-purple-400 mb-2">
                  <Key className="w-4 h-4" />
                  <span className="font-medium">Security Keys</span>
                </div>
                <p className="text-gray-400 text-sm">
                  Encryption keys, JWT secret, and session secret will be automatically generated for you.
                </p>
              </div>

              <button
                onClick={saveConfig}
                disabled={loading || !dbPassword}
                className="w-full py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Save & Continue
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 2: Requirements */}
          {currentStep === 'requirements' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Shield className="w-6 h-6 text-purple-400" />
                  <h2 className="text-xl font-semibold text-white">System Requirements</h2>
                </div>
                <button
                  onClick={checkRequirements}
                  disabled={loading}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 rounded-lg text-gray-300 hover:bg-slate-600 transition"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Re-check
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                </div>
              ) : (
                <div className="space-y-3">
                  {requirements.map((req, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${req.status === 'pass' ? 'bg-green-500/10 border-green-500/30' :
                          req.status === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30' :
                            'bg-red-500/10 border-red-500/30'
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        {req.status === 'pass' && <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />}
                        {req.status === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />}
                        {req.status === 'fail' && <XCircle className="w-5 h-5 text-red-400 mt-0.5" />}
                        <div>
                          <p className="text-white font-medium">{req.name}</p>
                          <p className="text-gray-400 text-sm">{req.description}</p>
                          {req.message && (
                            <p className={`text-sm mt-1 ${req.status === 'pass' ? 'text-green-400' :
                                req.status === 'warning' ? 'text-yellow-400' : 'text-red-400'
                              }`}>
                              {req.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => setCurrentStep('config')}
                  className="flex-1 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Back
                </button>
                <button
                  onClick={() => setCurrentStep('database')}
                  disabled={!allRequirementsPassed}
                  className="flex-1 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                  Continue
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Database Setup */}
          {currentStep === 'database' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <Database className="w-6 h-6 text-purple-400" />
                <h2 className="text-xl font-semibold text-white">Database Setup</h2>
              </div>

              <div className="space-y-4">
                <div className={`p-4 rounded-lg border ${dbConnected ? 'bg-green-500/10 border-green-500/30' : 'bg-slate-700/50 border-slate-600'}`}>
                  <div className="flex items-center gap-3">
                    {dbConnected ? <CheckCircle className="w-5 h-5 text-green-400" /> : <div className="w-5 h-5 border-2 border-gray-500 rounded-full" />}
                    <span className="text-white">Connect to database server</span>
                  </div>
                </div>

                <div className={`p-4 rounded-lg border ${dbCreated ? 'bg-green-500/10 border-green-500/30' : 'bg-slate-700/50 border-slate-600'}`}>
                  <div className="flex items-center gap-3">
                    {dbCreated ? <CheckCircle className="w-5 h-5 text-green-400" /> : <div className="w-5 h-5 border-2 border-gray-500 rounded-full" />}
                    <span className="text-white">Create database</span>
                  </div>
                </div>

                <div className={`p-4 rounded-lg border ${dbMigrated ? 'bg-green-500/10 border-green-500/30' : 'bg-slate-700/50 border-slate-600'}`}>
                  <div className="flex items-center gap-3">
                    {dbMigrated ? <CheckCircle className="w-5 h-5 text-green-400" /> : <div className="w-5 h-5 border-2 border-gray-500 rounded-full" />}
                    <span className="text-white">Run database migrations</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setCurrentStep('requirements')}
                  disabled={loading}
                  className="flex-1 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Back
                </button>
                <button
                  onClick={setupDatabase}
                  disabled={loading}
                  className="flex-1 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Setup Database
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Create Admin */}
          {currentStep === 'admin' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <User className="w-6 h-6 text-purple-400" />
                <h2 className="text-xl font-semibold text-white">Create Super Admin</h2>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Full Name</label>
                <input
                  type="text"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Email</label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showAdminPassword ? 'text' : 'password'}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full px-4 py-2.5 pr-12 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showAdminPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                onClick={createAdmin}
                disabled={loading || !adminName || !adminEmail || !adminPassword}
                className="w-full py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Complete Installation
                    <CheckCircle className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
