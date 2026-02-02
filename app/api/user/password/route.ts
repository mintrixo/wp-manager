/**
 * Change Password API
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/jwt'
import { queryOne, execute } from '@/lib/db'
import { verifyPassword, hashPassword } from '@/lib/auth'
import { logActivity, UserActions, extractRequestMetadata } from '@/lib/activity-logger'
import { changePasswordSchema } from '@/lib/validation'
import { RowDataPacket } from 'mysql2'

interface UserRow extends RowDataPacket {
    id: string
    password: string
}

export async function PUT(req: Request) {
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
        const validation = changePasswordSchema.safeParse(body)

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
                { status: 400 }
            )
        }

        const { currentPassword, newPassword } = validation.data

        // Get current password hash
        const user = await queryOne<UserRow>(
            'SELECT id, password FROM users WHERE id = ?',
            [payload.userId]
        )

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Verify current password
        const isValid = await verifyPassword(currentPassword, user.password)
        if (!isValid) {
            return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
        }

        // Hash new password
        const newPasswordHash = await hashPassword(newPassword)

        // Update password
        await execute(
            'UPDATE users SET password = ?, password_changed_at = NOW(), updated_at = NOW() WHERE id = ?',
            [newPasswordHash, payload.userId]
        )

        await logActivity({
            userId: payload.userId,
            userEmail: payload.email,
            userRole: payload.role,
            action: UserActions.PASSWORD_CHANGED,
            category: 'user',
            targetType: 'user',
            targetId: payload.userId,
            ipAddress,
            userAgent
        })

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('[Password Change] Error:', error)
        return NextResponse.json({ error: 'Failed to change password' }, { status: 500 })
    }
}
