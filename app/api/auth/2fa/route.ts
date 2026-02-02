/**
 * Setup 2FA API Route
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/jwt'
import { setup2FA, enable2FA, disable2FA, has2FAEnabled } from '@/lib/auth'
import { queryOne } from '@/lib/db'
import { logActivity, AuthActions, extractRequestMetadata } from '@/lib/activity-logger'
import { RowDataPacket } from 'mysql2'

interface UserRow extends RowDataPacket {
    id: string
    email: string
    role: string
}

// GET - Get 2FA setup data (QR code, manual key, backup codes)
export async function GET() {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('auth_token')?.value

        if (!token) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const payload = verifyToken(token)
        if (!payload) {
            return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
        }

        // Get user
        const user = await queryOne<UserRow>(
            'SELECT id, email, role FROM users WHERE id = ?',
            [payload.userId]
        )

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Check if already enabled
        const has2FA = await has2FAEnabled(user.id)

        // Setup 2FA (generates new secret)
        const setup = await setup2FA(user.id, user.email)

        return NextResponse.json({
            enabled: has2FA,
            qrCodeUrl: setup.qrCodeUrl,
            manualKey: setup.manualKey,
            backupCodes: setup.backupCodes
        })

    } catch (error) {
        console.error('[2FA Setup GET] Error:', error)
        return NextResponse.json({ error: 'Failed to setup 2FA' }, { status: 500 })
    }
}

// POST - Enable 2FA after verification
export async function POST(req: Request) {
    const { ipAddress, userAgent } = extractRequestMetadata(req)

    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('auth_token')?.value

        if (!token) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const payload = verifyToken(token)
        if (!payload) {
            return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
        }

        const body = await req.json()
        const { code } = body

        if (!code || code.length !== 6) {
            return NextResponse.json({ error: 'Valid 6-digit code required' }, { status: 400 })
        }

        const success = await enable2FA(payload.userId, code)

        if (!success) {
            return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 })
        }

        await logActivity({
            userId: payload.userId,
            userEmail: payload.email,
            userRole: payload.role,
            action: AuthActions.TWO_FA_ENABLED,
            category: 'auth',
            ipAddress,
            userAgent
        })

        return NextResponse.json({ success: true, message: '2FA enabled successfully' })

    } catch (error) {
        console.error('[2FA Enable] Error:', error)
        return NextResponse.json({ error: 'Failed to enable 2FA' }, { status: 500 })
    }
}

// DELETE - Disable 2FA
export async function DELETE(req: Request) {
    const { ipAddress, userAgent } = extractRequestMetadata(req)

    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('auth_token')?.value

        if (!token) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const payload = verifyToken(token)
        if (!payload) {
            return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
        }

        // Super admins and team admins cannot disable 2FA
        if (payload.role === 'super_admin' || payload.role === 'team_admin') {
            return NextResponse.json(
                { error: '2FA is mandatory for administrators' },
                { status: 403 }
            )
        }

        await disable2FA(payload.userId)

        await logActivity({
            userId: payload.userId,
            userEmail: payload.email,
            userRole: payload.role,
            action: AuthActions.TWO_FA_DISABLED,
            category: 'auth',
            ipAddress,
            userAgent
        })

        return NextResponse.json({ success: true, message: '2FA disabled' })

    } catch (error) {
        console.error('[2FA Disable] Error:', error)
        return NextResponse.json({ error: 'Failed to disable 2FA' }, { status: 500 })
    }
}
