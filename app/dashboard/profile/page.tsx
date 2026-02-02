'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  User,
  Mail,
  Lock,
  Shield,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Smartphone
} from 'lucide-react'

interface UserProfile {
  id: string
  email: string
  name: string
  role: string
  twoFAEnabled: boolean
  createdAt: string
}

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'security'>('profile')

  // Profile form
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState('')
  const [profileError, setProfileError] = useState('')

  // Password form
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [passwordError, setPasswordError] = useState('')

  // 2FA
  const [twoFASetup, setTwoFASetup] = useState<{ qrCodeUrl: string; manualKey: string; backupCodes: string[] } | null>(null)
  const [twoFACode, setTwoFACode] = useState('')
  const [twoFALoading, setTwoFALoading] = useState(false)
  const [twoFAError, setTwoFAError] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
        setName(data.user.name)
        setEmail(data.user.email)
      } else {
        router.push('/login')
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileLoading(true)
    setProfileError('')
    setProfileSuccess('')

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email })
      })

      if (res.ok) {
        setProfileSuccess('Profile updated successfully')
        fetchProfile()
      } else {
        const data = await res.json()
        setProfileError(data.error || 'Failed to update profile')
      }
    } catch (error) {
      setProfileError('An error occurred')
    } finally {
      setProfileLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordLoading(true)
    setPasswordError('')
    setPasswordSuccess('')

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      setPasswordLoading(false)
      return
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      setPasswordLoading(false)
      return
    }

    try {
      const res = await fetch('/api/user/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      })

      if (res.ok) {
        setPasswordSuccess('Password changed successfully')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        const data = await res.json()
        setPasswordError(data.error || 'Failed to change password')
      }
    } catch (error) {
      setPasswordError('An error occurred')
    } finally {
      setPasswordLoading(false)
    }
  }

  const setup2FA = async () => {
    setTwoFALoading(true)
    setTwoFAError('')

    try {
      const res = await fetch('/api/auth/2fa')
      if (res.ok) {
        const data = await res.json()
        setTwoFASetup(data)
      } else {
        const data = await res.json()
        setTwoFAError(data.error || 'Failed to setup 2FA')
      }
    } catch (error) {
      setTwoFAError('An error occurred')
    } finally {
      setTwoFALoading(false)
    }
  }

  const enable2FA = async () => {
    if (twoFACode.length !== 6) {
      setTwoFAError('Enter a 6-digit code')
      return
    }

    setTwoFALoading(true)
    setTwoFAError('')

    try {
      const res = await fetch('/api/auth/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: twoFACode })
      })

      if (res.ok) {
        setTwoFASetup(null)
        setTwoFACode('')
        fetchProfile()
      } else {
        const data = await res.json()
        setTwoFAError(data.error || 'Invalid code')
      }
    } catch (error) {
      setTwoFAError('An error occurred')
    } finally {
      setTwoFALoading(false)
    }
  }

  const disable2FA = async () => {
    if (!confirm('Are you sure you want to disable 2FA?')) return

    setTwoFALoading(true)
    try {
      const res = await fetch('/api/auth/2fa', { method: 'DELETE' })
      if (res.ok) {
        fetchProfile()
      }
    } finally {
      setTwoFALoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Profile Settings</h1>
        <p className="text-gray-400 mt-1">Manage your account settings and security</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-700 pb-4">
        {[
          { key: 'profile', label: 'Profile', icon: User },
          { key: 'password', label: 'Password', icon: Lock },
          { key: 'security', label: '2FA', icon: Shield },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeTab === key
                ? 'bg-purple-500 text-white'
                : 'text-gray-400 hover:bg-slate-700 hover:text-white'
              }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <form onSubmit={handleProfileUpdate} className="space-y-6">
            {profileSuccess && (
              <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                {profileSuccess}
              </div>
            )}
            {profileError && (
              <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                {profileError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-700/50 rounded-lg">
              <p className="text-gray-400 text-sm">
                <strong>Role:</strong> {user?.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Member since {new Date(user?.createdAt || '').toLocaleDateString()}
              </p>
            </div>

            <button
              type="submit"
              disabled={profileLoading}
              className="w-full py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {profileLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
          </form>
        </div>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <form onSubmit={handlePasswordChange} className="space-y-6">
            {passwordSuccess && (
              <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                {passwordSuccess}
              </div>
            )}
            {passwordError && (
              <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                {passwordError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Current Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={passwordLoading}
              className="w-full py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {passwordLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Change Password
            </button>
          </form>
        </div>
      )}

      {/* 2FA Tab */}
      {activeTab === 'security' && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          {user?.twoFAEnabled ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">2FA is Enabled</h3>
              <p className="text-gray-400 mb-6">
                Your account is protected with two-factor authentication
              </p>
              <button
                onClick={disable2FA}
                disabled={twoFALoading}
                className="px-6 py-2 bg-red-500/20 text-red-400 border border-red-500/50 rounded-lg hover:bg-red-500/30 transition disabled:opacity-50"
              >
                {twoFALoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Disable 2FA'}
              </button>
            </div>
          ) : twoFASetup ? (
            <div className="space-y-6">
              {twoFAError && (
                <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
                  {twoFAError}
                </div>
              )}

              <div className="text-center">
                <h3 className="text-lg font-semibold text-white mb-4">Scan QR Code</h3>
                <div className="bg-white p-4 rounded-lg inline-block mb-4">
                  <img src={twoFASetup.qrCodeUrl} alt="2FA QR Code" className="w-48 h-48" />
                </div>
                <p className="text-gray-400 text-sm">
                  Or enter this code manually: <code className="text-purple-400">{twoFASetup.manualKey}</code>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Enter 6-digit code from your authenticator app
                </label>
                <input
                  type="text"
                  value={twoFACode}
                  onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <h4 className="text-yellow-400 font-medium mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Save Your Backup Codes
                </h4>
                <p className="text-gray-400 text-sm mb-3">
                  Store these codes safely. Each can be used once if you lose access to your authenticator.
                </p>
                <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                  {twoFASetup.backupCodes.map((code, i) => (
                    <div key={i} className="bg-slate-700 p-2 rounded text-gray-300">
                      {code}
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={enable2FA}
                disabled={twoFALoading || twoFACode.length !== 6}
                className="w-full py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {twoFALoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Enable 2FA
              </button>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Smartphone className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Enable Two-Factor Authentication</h3>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                Add an extra layer of security to your account using an authenticator app like Google Authenticator or Authy
              </p>
              <button
                onClick={setup2FA}
                disabled={twoFALoading}
                className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition disabled:opacity-50 flex items-center gap-2 mx-auto"
              >
                {twoFALoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                Setup 2FA
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
