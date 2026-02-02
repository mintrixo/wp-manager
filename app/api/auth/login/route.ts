/**
 * Login API Route
 * Handles user authentication with brute force protection
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { query, queryOne } from '@/lib/db'
import { verifyPassword, isAccountLocked, recordLoginAttempt, has2FAEnabled, logSecurityEvent } from '@/lib/auth'
import { generateToken, AUTH_COOKIE_OPTIONS, hashSessionToken } from '@/lib/jwt'
import { createSession } from '@/lib/auth'
import { loginSchema, isWeakPassword } from '@/lib/validation'
import { logActivity, AuthActions, extractRequestMetadata, parseUserAgent } from '@/lib/activity-logger'
import { generateSecureToken, generateUUID } from '@/lib/encryption'
import { RowDataPacket } from 'mysql2'

interface UserRow extends RowDataPacket {
  id: string
  email: string
  name: string
  password_hash: string
  role: 'super_admin' | 'team_admin' | 'team_user'
  status: 'active' | 'blocked' | 'pending'
}

export async function POST(req: Request) {
  const { ipAddress, userAgent } = extractRequestMetadata(req)
  const { deviceType, browser } = parseUserAgent(userAgent)

  try {
    const body = await req.json()

    // Validate input
    const validation = loginSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid email or password format' },
        { status: 400 }
      )
    }

    const { email, password } = validation.data

    // Find user (don't reveal if user exists)
    const user = await queryOne<UserRow>(
      'SELECT id, email, name, password_hash, role, status FROM users WHERE email = ?',
      [email]
    )

    if (!user) {
      // Log failed attempt for non-existent user
      await recordLoginAttempt(email, ipAddress, false, undefined, 'User not found', { userAgent, deviceType, browser })

      await logSecurityEvent('login_failed', 'Login attempt for non-existent user', {
        ipAddress,
        userAgent,
        severity: 'low'
      })

      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Check if account is blocked
    if (user.status === 'blocked') {
      await recordLoginAttempt(email, ipAddress, false, user.id, 'Account blocked', { userAgent, deviceType, browser })
      return NextResponse.json(
        { error: 'Your account has been blocked. Please contact an administrator.' },
        { status: 403 }
      )
    }

    // Check if account is pending
    if (user.status === 'pending') {
      await recordLoginAttempt(email, ipAddress, false, user.id, 'Account pending', { userAgent, deviceType, browser })
      return NextResponse.json(
        { error: 'Your account is pending approval.' },
        { status: 403 }
      )
    }

    // Check account lockout
    const lockStatus = await isAccountLocked(user.id)
    if (lockStatus.locked) {
      const minutesLeft = lockStatus.lockedUntil
        ? Math.ceil((lockStatus.lockedUntil.getTime() - Date.now()) / 60000)
        : 15

      await logSecurityEvent('account_locked', `Login attempt on locked account`, {
        userId: user.id,
        ipAddress,
        userAgent,
        severity: 'medium'
      })

      return NextResponse.json(
        { error: `Account locked. Try again in ${minutesLeft} minutes.` },
        { status: 429 }
      )
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash)
    if (!isValidPassword) {
      await recordLoginAttempt(email, ipAddress, false, user.id, 'Invalid password', { userAgent, deviceType, browser })

      // Check remaining attempts after this failure
      const newLockStatus = await isAccountLocked(user.id)
      const remaining = newLockStatus.remainingAttempts ?? 0

      if (newLockStatus.locked) {
        await logSecurityEvent('account_locked', 'Account locked after failed attempts', {
          userId: user.id,
          ipAddress,
          userAgent,
          severity: 'high'
        })
        return NextResponse.json(
          { error: 'Too many failed attempts. Account locked for 15 minutes.' },
          { status: 429 }
        )
      }

      return NextResponse.json(
        { error: `Invalid credentials. ${remaining} attempt(s) remaining.` },
        { status: 401 }
      )
    }

    // Check weak password
    const weakCheck = isWeakPassword(password)
    if (weakCheck.weak) {
      await logSecurityEvent('suspicious_activity', `Weak password detected for user ${email}`, {
        userId: user.id,
        ipAddress,
        userAgent,
        severity: 'low'
      })
    }

    // Check if 2FA is enabled
    const has2FA = await has2FAEnabled(user.id)
    if (has2FA) {
      // Generate temporary token for 2FA step
      const tempToken = generateSecureToken()

      // Store temp token in session (expires in 5 minutes)
      const cookieStore = await cookies()
      cookieStore.set('temp_2fa_token', tempToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 300, // 5 minutes
        path: '/'
      })
      cookieStore.set('temp_2fa_user', user.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 300,
        path: '/'
      })

      return NextResponse.json({
        requires2FA: true,
        tempToken
      })
    }

    // Create session
    const sessionId = generateUUID()
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId
    })

    const tokenHash = hashSessionToken(token)
    await createSession(user.id, tokenHash, {
      ipAddress,
      userAgent,
      deviceType,
      browser
    })

    // Record successful login
    await recordLoginAttempt(email, ipAddress, true, user.id, 'Success', { userAgent, deviceType, browser })

    // Log activity
    await logActivity({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: AuthActions.LOGIN,
      category: 'auth',
      details: { method: 'password' },
      ipAddress,
      userAgent,
      deviceType,
      browser
    })

    // Set auth cookie
    const cookieStore = await cookies()
    cookieStore.set(AUTH_COOKIE_OPTIONS.name, token, AUTH_COOKIE_OPTIONS)

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    })

  } catch (error) {
    console.error('[Login] Error:', error)
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
