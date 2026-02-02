'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const SESSION_TIMEOUT = 60 * 60 * 1000 // 1 hour
const WARNING_TIME = 5 * 60 * 1000 // 5 minutes before timeout

export default function SessionTimeout() {
  const [showWarning, setShowWarning] = useState(false)
  const [timeLeft, setTimeLeft] = useState(5 * 60) // 5 minutes in seconds
  const router = useRouter()
  
  let lastActivity = Date.now()
  let timeoutId: NodeJS.Timeout
  let warningId: NodeJS.Timeout
  let countdownId: NodeJS.Timeout

  useEffect(() => {
    const resetTimer = () => {
      lastActivity = Date.now()
      setShowWarning(false)
      
      clearTimeout(timeoutId)
      clearTimeout(warningId)
      clearInterval(countdownId)
      
      // Set warning timer (55 minutes)
      warningId = setTimeout(() => {
        setShowWarning(true)
        setTimeLeft(5 * 60)
        
        // Start countdown
        countdownId = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 1) {
              handleLogout()
              return 0
            }
            return prev - 1
          })
        }, 1000)
      }, SESSION_TIMEOUT - WARNING_TIME)
      
      // Set logout timer (60 minutes)
      timeoutId = setTimeout(() => {
        handleLogout()
      }, SESSION_TIMEOUT)
    }

    const handleLogout = async () => {
      clearTimeout(timeoutId)
      clearTimeout(warningId)
      clearInterval(countdownId)
      
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include'
      })
      
      router.push('/login?session=expired')
    }

    const extendSession = async () => {
      try {
        await fetch('/api/auth/extend-session', {
          method: 'POST',
          credentials: 'include'
        })
        resetTimer()
      } catch (error) {
        console.error('Failed to extend session:', error)
      }
    }

    // Activity events
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']
    
    events.forEach(event => {
      document.addEventListener(event, resetTimer)
    })

    resetTimer()

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetTimer)
      })
      clearTimeout(timeoutId)
      clearTimeout(warningId)
      clearInterval(countdownId)
    }
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!showWarning) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-4">
            <svg className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            Session Expiring Soon
          </h3>
          <p className="text-gray-600 mb-6">
            Your session will expire in{' '}
            <span className="font-bold text-red-600 text-xl">
              {formatTime(timeLeft)}
            </span>
          </p>
          <p className="text-sm text-gray-500 mb-6">
            You will be automatically logged out due to inactivity.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                fetch('/api/auth/extend-session', {
                  method: 'POST',
                  credentials: 'include'
                }).then(() => {
                  setShowWarning(false)
                  window.location.reload()
                })
              }}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              Stay Logged In
            </button>
            <button
              onClick={async () => {
                await fetch('/api/auth/logout', {
                  method: 'POST',
                  credentials: 'include'
                })
                router.push('/login')
              }}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
