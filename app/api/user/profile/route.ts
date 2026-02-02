/**
 * User Profile API
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/jwt'
import { execute, queryOne } from '@/lib/db'
import { logActivity, UserActions, extractRequestMetadata } from '@/lib/activity-logger'
import { updateProfileSchema } from '@/lib/validation'
import { RowDataPacket } from 'mysql2'

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
        const validation = updateProfileSchema.safeParse(body)

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
                { status: 400 }
            )
        }

        const { name, email } = validation.data

        // Check if email is already used by another user
        if (email && email.toLowerCase() !== payload.email.toLowerCase()) {
            const existing = await queryOne<RowDataPacket>(
                'SELECT id FROM users WHERE email = ? AND id != ?',
                [email.toLowerCase(), payload.userId]
            )
            if (existing) {
                return NextResponse.json({ error: 'Email already in use' }, { status: 400 })
            }
        }

        // Update profile
        const updates: string[] = []
        const params: unknown[] = []

        if (name) {
            updates.push('name = ?')
            params.push(name)
        }
        if (email) {
            updates.push('email = ?')
            params.push(email.toLowerCase())
        }

        if (updates.length > 0) {
            updates.push('updated_at = NOW()')
            params.push(payload.userId)

            await execute(
                `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
                params
            )

            await logActivity({
                userId: payload.userId,
                userEmail: payload.email,
                userRole: payload.role,
                action: UserActions.PROFILE_UPDATED,
                category: 'user',
                targetType: 'user',
                targetId: payload.userId,
                details: { name, email },
                ipAddress,
                userAgent
            })
        }

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('[Profile Update] Error:', error)
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }
}
