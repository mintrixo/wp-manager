/**
 * Logout API Route
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/jwt'
import { invalidateSession } from '@/lib/auth'
import { logActivity, AuthActions, extractRequestMetadata } from '@/lib/activity-logger'

export async function POST(req: Request) {
  const { ipAddress, userAgent } = extractRequestMetadata(req)

  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value

    if (token) {
      const payload = verifyToken(token)

      if (payload?.sessionId) {
        // Invalidate session in database
        await invalidateSession(payload.sessionId)

        // Log activity
        await logActivity({
          userId: payload.userId,
          userEmail: payload.email,
          userRole: payload.role,
          action: AuthActions.LOGOUT,
          category: 'auth',
          ipAddress,
          userAgent
        })
      }
    }

    // Clear cookies
    cookieStore.delete('auth_token')
    cookieStore.delete('temp_2fa_token')
    cookieStore.delete('temp_2fa_user')

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[Logout] Error:', error)

    // Still clear cookies on error
    const cookieStore = await cookies()
    cookieStore.delete('auth_token')

    return NextResponse.json({ success: true })
  }
}
