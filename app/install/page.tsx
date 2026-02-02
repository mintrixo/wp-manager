'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, AlertTriangle, Loader2, ChevronRight, Database, Shield, User } from 'lucide-react'

interface RequirementCheck {
  name: string
  status: 'checking' | 'passed' | 'failed' | 'warning'
  message: string
  details?: string
}

interface Step {
  id: number
  title: string
  description: string
  status: 'pending' | 'current' | 'completed' | 'error'
}

export default function InstallPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [requirements, setRequirements] = useState<RequirementCheck[]>([])
  const [checkingRequirements, setCheckingRequirements] = useState(true)
  const [dbStatus, setDbStatus] = useState<'idle' | 'testing' | 'creating' | 'migrating' | 'success' | 'error'>('idle')
  const [dbMessage, setDbMessage] = useState('')
  const [adminForm, setAdminForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [adminErrors, setAdminErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [installComplete, setInstallComplete] = useState(false)

  const steps: Step[] = [
    { id: 1, title: 'Requirements', description: 'Check system requirements', status: currentStep === 1 ? 'current' : currentStep > 1 ? 'completed' : 'pending' },
    { id: 2, title: 'Database', description: 'Setup database', status: currentStep === 2 ? 'current' : currentStep > 2 ? 'completed' : 'pending' },
    { id: 3, title: 'Admin Account', description: 'Create super admin', status: currentStep === 3 ? 'current' : currentStep > 3 ? 'completed' : 'pending' },
  ]

  useEffect(() => {
    checkRequirements()
  }, [])

  const checkRequirements = async () => {
    setCheckingRequirements(true)

    // Initialize with checking state
    const initialChecks: RequirementCheck[] = [
      { name: 'Environment Variables', status: 'checking', message: 'Checking...' },
      { name: 'Database Connection', status: 'checking', message: 'Checking...' },
      { name: 'Encryption Key', status: 'checking', message: 'Checking...' },
      { name: 'JWT Secret', status: 'checking', message: 'Checking...' },
      { name: 'Session Secret', status: 'checking', message: 'Checking...' },
      { name: 'reCAPTCHA Config', status: 'checking', message: 'Checking...' },
    ]
    setRequirements(initialChecks)

    try {
      const res = await fetch('/api/install/check-requirements')
      const data = await res.json()
      setRequirements(data.checks)
    } catch (error) {
      setRequirements([
        { name: 'API Check Failed', status: 'failed', message: 'Could not connect to API', details: String(error) }
      ])
    } finally {
      setCheckingRequirements(false)
    }
  }

  const handleSetupDatabase = async () => {
    setDbStatus('testing')
    setDbMessage('Testing database connection...')

    try {
      // Test connection
      const testRes = await fetch('/api/install/test-db')
      const testData = await testRes.json()

      if (!testData.success) {
        setDbStatus('error')
        setDbMessage(testData.message || 'Database connection failed')
        return
      }

      setDbStatus('creating')
      setDbMessage('Creating database...')

      // Create database
      const createRes = await fetch('/api/install/setup-db', { method: 'POST' })
      const createData = await createRes.json()

      if (!createData.success) {
        setDbStatus('error')
        setDbMessage(createData.message || 'Failed to create database')
        return
      }

      setDbStatus('migrating')
      setDbMessage('Running migrations...')

      // Run migrations
      const migrateRes = await fetch('/api/install/migrate-db', { method: 'POST' })
      const migrateData = await migrateRes.json()

      if (!migrateData.success) {
        setDbStatus('error')
        setDbMessage(migrateData.message || 'Migration failed')
        return
      }

      setDbStatus('success')
      setDbMessage(`Database setup complete! ${migrateData.tablesCreated || 0} tables created.`)

    } catch (error) {
      setDbStatus('error')
      setDbMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const validateAdminForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!adminForm.name || adminForm.name.length < 2) {
      errors.name = 'Name must be at least 2 characters'
    }

    if (!adminForm.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminForm.email)) {
      errors.email = 'Valid email is required'
    }

    if (!adminForm.password || adminForm.password.length < 12) {
      errors.password = 'Password must be at least 12 characters'
    } else {
      if (!/[A-Z]/.test(adminForm.password)) {
        errors.password = 'Password must contain uppercase letter'
      } else if (!/[a-z]/.test(adminForm.password)) {
        errors.password = 'Password must contain lowercase letter'
      } else if (!/[0-9]/.test(adminForm.password)) {
        errors.password = 'Password must contain a number'
      } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(adminForm.password)) {
        errors.password = 'Password must contain a special character'
      }
    }

    if (adminForm.password !== adminForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }

    setAdminErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateAdminForm()) return

    setSubmitting(true)

    try {
      const res = await fetch('/api/install/create-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: adminForm.name,
          email: adminForm.email.toLowerCase(),
          password: adminForm.password
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setAdminErrors({ form: data.error || 'Failed to create admin' })
        return
      }

      setInstallComplete(true)

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login')
      }, 3000)

    } catch (error) {
      setAdminErrors({ form: 'An error occurred. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  const allRequirementsPassed = requirements.every(r => r.status === 'passed' || r.status === 'warning')

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />
      default:
        return <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
    }
  }

  if (installComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full text-center border border-white/20">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Installation Complete!</h1>
          <p className="text-gray-300 mb-6">
            Your WordPress Site Manager is ready to use. Redirecting to login...
          </p>
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
            <span className="text-gray-400">Redirecting...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-2xl w-full border border-white/20">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-white">WP</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">WordPress Site Manager</h1>
          <p className="text-gray-400">Installation Wizard</p>
        </div>

        {/* Steps Indicator */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${step.status === 'completed' ? 'bg-green-500 border-green-500' :
                  step.status === 'current' ? 'bg-purple-500 border-purple-500' :
                    'border-gray-600 bg-transparent'
                }`}>
                {step.status === 'completed' ? (
                  <CheckCircle className="w-5 h-5 text-white" />
                ) : (
                  <span className={`text-sm font-semibold ${step.status === 'current' ? 'text-white' : 'text-gray-500'}`}>
                    {step.id}
                  </span>
                )}
              </div>
              {index < steps.length - 1 && (
                <ChevronRight className="w-5 h-5 text-gray-600 mx-2" />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          {/* Step 1: Requirements */}
          {currentStep === 1 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Shield className="w-6 h-6 text-purple-400" />
                <h2 className="text-xl font-semibold text-white">System Requirements</h2>
              </div>

              <div className="space-y-3 mb-6">
                {requirements.map((req, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(req.status)}
                      <div>
                        <p className="text-white font-medium">{req.name}</p>
                        {req.details && (
                          <p className="text-xs text-gray-500">{req.details}</p>
                        )}
                      </div>
                    </div>
                    <span className={`text-sm ${req.status === 'passed' ? 'text-green-400' :
                        req.status === 'failed' ? 'text-red-400' :
                          req.status === 'warning' ? 'text-yellow-400' :
                            'text-gray-400'
                      }`}>
                      {req.message}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={checkRequirements}
                  disabled={checkingRequirements}
                  className="flex-1 py-3 px-4 bg-white/10 text-white rounded-lg hover:bg-white/20 transition disabled:opacity-50"
                >
                  {checkingRequirements ? 'Checking...' : 'Re-check'}
                </button>
                <button
                  onClick={() => setCurrentStep(2)}
                  disabled={!allRequirementsPassed}
                  className="flex-1 py-3 px-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Database Setup */}
          {currentStep === 2 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Database className="w-6 h-6 text-purple-400" />
                <h2 className="text-xl font-semibold text-white">Database Setup</h2>
              </div>

              <p className="text-gray-400 mb-6">
                Click the button below to test your database connection and create the required tables.
              </p>

              {dbMessage && (
                <div className={`p-4 rounded-lg mb-6 ${dbStatus === 'error' ? 'bg-red-500/20 border border-red-500/50 text-red-300' :
                    dbStatus === 'success' ? 'bg-green-500/20 border border-green-500/50 text-green-300' :
                      'bg-blue-500/20 border border-blue-500/50 text-blue-300'
                  }`}>
                  <div className="flex items-center gap-2">
                    {dbStatus === 'success' && <CheckCircle className="w-5 h-5" />}
                    {dbStatus === 'error' && <XCircle className="w-5 h-5" />}
                    {['testing', 'creating', 'migrating'].includes(dbStatus) && (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    )}
                    <span>{dbMessage}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="flex-1 py-3 px-4 bg-white/10 text-white rounded-lg hover:bg-white/20 transition"
                >
                  Back
                </button>
                {dbStatus !== 'success' ? (
                  <button
                    onClick={handleSetupDatabase}
                    disabled={['testing', 'creating', 'migrating'].includes(dbStatus)}
                    className="flex-1 py-3 px-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition disabled:opacity-50"
                  >
                    {['testing', 'creating', 'migrating'].includes(dbStatus) ? 'Setting up...' : 'Setup Database'}
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="flex-1 py-3 px-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition"
                  >
                    Continue
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Admin Account */}
          {currentStep === 3 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <User className="w-6 h-6 text-purple-400" />
                <h2 className="text-xl font-semibold text-white">Create Super Admin</h2>
              </div>

              <form onSubmit={handleCreateAdmin} className="space-y-4">
                {adminErrors.form && (
                  <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300">
                    {adminErrors.form}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={adminForm.name}
                    onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                    className={`w-full px-4 py-3 bg-white/10 border ${adminErrors.name ? 'border-red-500' : 'border-white/20'} rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500`}
                    placeholder="John Doe"
                  />
                  {adminErrors.name && <p className="text-red-400 text-sm mt-1">{adminErrors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={adminForm.email}
                    onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                    className={`w-full px-4 py-3 bg-white/10 border ${adminErrors.email ? 'border-red-500' : 'border-white/20'} rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500`}
                    placeholder="admin@example.com"
                  />
                  {adminErrors.email && <p className="text-red-400 text-sm mt-1">{adminErrors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                  <input
                    type="password"
                    value={adminForm.password}
                    onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                    className={`w-full px-4 py-3 bg-white/10 border ${adminErrors.password ? 'border-red-500' : 'border-white/20'} rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500`}
                    placeholder="••••••••••••"
                  />
                  {adminErrors.password && <p className="text-red-400 text-sm mt-1">{adminErrors.password}</p>}
                  <p className="text-xs text-gray-500 mt-1">
                    Min 12 chars with uppercase, lowercase, number, and special character
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
                  <input
                    type="password"
                    value={adminForm.confirmPassword}
                    onChange={(e) => setAdminForm({ ...adminForm, confirmPassword: e.target.value })}
                    className={`w-full px-4 py-3 bg-white/10 border ${adminErrors.confirmPassword ? 'border-red-500' : 'border-white/20'} rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500`}
                    placeholder="••••••••••••"
                  />
                  {adminErrors.confirmPassword && <p className="text-red-400 text-sm mt-1">{adminErrors.confirmPassword}</p>}
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="flex-1 py-3 px-4 bg-white/10 text-white rounded-lg hover:bg-white/20 transition"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Complete Installation'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
