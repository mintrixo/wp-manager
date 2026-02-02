/**
 * Get Current User API Route
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/jwt'
import { queryOne, execute } from '@/lib/db'
import { updateSessionActivity, has2FAEnabled } from '@/lib/auth'
import { RowDataPacket } from 'mysql2'

interface UserRow extends RowDataPacket {
  id: string
  email: string
  name: string
  role: 'super_admin' | 'team_admin' | 'team_user'
  status: string
  created_at: Date
}

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Verify token
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      )
    }

    // Get user from database
    const user = await queryOne<UserRow>(
      'SELECT id, email, name, role, status, created_at FROM users WHERE id = ?',
      [payload.userId]
    )

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (user.status !== 'active') {
      return NextResponse.json(
        { error: 'Account is not active' },
        { status: 403 }
      )
    }

    // Update session activity
    if (payload.sessionId) {
      await updateSessionActivity(payload.sessionId)
    }

    // Check 2FA status
    const twoFAEnabled = await has2FAEnabled(user.id)

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.created_at,
        twoFAEnabled
      }
    })

  } catch (error) {
    console.error('[Auth Me] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get user info' },
      { status: 500 }
    )
  }
}
