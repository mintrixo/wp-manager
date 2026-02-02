/**
 * Verify 2FA API Route
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { query, queryOne } from '@/lib/db'
import { verify2FACode, createSession } from '@/lib/auth'
import { generateToken, AUTH_COOKIE_OPTIONS, hashSessionToken } from '@/lib/jwt'
import { verify2FASchema } from '@/lib/validation'
import { logActivity, AuthActions, extractRequestMetadata, parseUserAgent } from '@/lib/activity-logger'
import { generateUUID } from '@/lib/encryption'
import { RowDataPacket } from 'mysql2'

interface UserRow extends RowDataPacket {
    id: string
    email: string
    name: string
    role: 'super_admin' | 'team_admin' | 'team_user'
}

export async function POST(req: Request) {
    const { ipAddress, userAgent } = extractRequestMetadata(req)
    const { deviceType, browser } = parseUserAgent(userAgent)

    try {
        const body = await req.json()
        const { tempToken, code, isBackupCode } = body

        // Validate input
        const validation = verify2FASchema.safeParse({ code, isBackupCode })
        if (!validation.success && !isBackupCode) {
            return NextResponse.json(
                { error: 'Invalid code format' },
                { status: 400 }
            )
        }

        // Verify temp token
        const cookieStore = await cookies()
        const storedToken = cookieStore.get('temp_2fa_token')?.value
        const userId = cookieStore.get('temp_2fa_user')?.value

        if (!storedToken || storedToken !== tempToken || !userId) {
            return NextResponse.json(
                { error: 'Session expired. Please login again.' },
                { status: 401 }
            )
        }

        // Get user
        const user = await queryOne<UserRow>(
            'SELECT id, email, name, role FROM users WHERE id = ?',
            [userId]
        )

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            )
        }

        // Verify 2FA code
        const isValid = await verify2FACode(userId, code, isBackupCode)
        if (!isValid) {
            await logActivity({
                userId: user.id,
                userEmail: user.email,
                userRole: user.role,
                action: 'user.2fa_failed',
                category: 'auth',
                details: { isBackupCode },
                ipAddress,
                userAgent
            })

            return NextResponse.json(
                { error: isBackupCode ? 'Invalid backup code' : 'Invalid verification code' },
                { status: 401 }
            )
        }

        // Clear temp tokens
        cookieStore.delete('temp_2fa_token')
        cookieStore.delete('temp_2fa_user')

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

        // Log activity
        await logActivity({
            userId: user.id,
            userEmail: user.email,
            userRole: user.role,
            action: AuthActions.TWO_FA_VERIFIED,
            category: 'auth',
            details: { isBackupCode },
            ipAddress,
            userAgent,
            deviceType,
            browser
        })

        // Set auth cookie
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
        console.error('[2FA Verify] Error:', error)
        return NextResponse.json(
            { error: 'Verification failed. Please try again.' },
            { status: 500 }
        )
    }
}
