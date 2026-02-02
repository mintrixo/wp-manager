/**
 * Create Admin API
 * Creates the super admin account during installation
 */

import { NextResponse } from 'next/server'
import { hashPassword } from '@/lib/auth'
import { generateUUID } from '@/lib/encryption'
import { execute, query } from '@/lib/db'
import { registerAdminSchema, isWeakPassword } from '@/lib/validation'
import { logActivity, InstallActions } from '@/lib/activity-logger'
import { RowDataPacket } from 'mysql2'

export async function POST(req: Request) {
    try {
        const body = await req.json()

        // Validate input
        const validation = registerAdminSchema.safeParse({
            ...body,
            confirmPassword: body.password // Skip confirm for this check
        })

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
                { status: 400 }
            )
        }

        const { name, email, password } = body

        // Check for weak password
        const weakCheck = isWeakPassword(password)
        if (weakCheck.weak) {
            return NextResponse.json(
                { error: weakCheck.reason },
                { status: 400 }
            )
        }

        // Check if admin already exists
        const existingAdmin = await query<RowDataPacket[]>(
            `SELECT id FROM users WHERE role = 'super_admin' LIMIT 1`
        )

        if (existingAdmin.length > 0) {
            return NextResponse.json(
                { error: 'Installation already completed' },
                { status: 400 }
            )
        }

        // Check if email already exists
        const existingUser = await query<RowDataPacket[]>(
            `SELECT id FROM users WHERE email = ? LIMIT 1`,
            [email.toLowerCase()]
        )

        if (existingUser.length > 0) {
            return NextResponse.json(
                { error: 'Email already registered' },
                { status: 400 }
            )
        }

        // Hash password
        const passwordHash = await hashPassword(password)

        // Create admin user
        const userId = generateUUID()
        await execute(
            `INSERT INTO users (id, name, email, password_hash, role, status, email_verified) 
       VALUES (?, ?, ?, ?, 'super_admin', 'active', TRUE)`,
            [userId, name, email.toLowerCase(), passwordHash]
        )

        // Mark installation as complete
        await execute(
            `UPDATE system_settings SET setting_value = 'true' WHERE setting_key = 'installation_complete'`
        )

        // Log activity
        await logActivity({
            userId,
            userEmail: email.toLowerCase(),
            userRole: 'super_admin',
            action: InstallActions.ADMIN_CREATED,
            category: 'auth',
            details: { name, email: email.toLowerCase() }
        })

        await logActivity({
            userId,
            userEmail: email.toLowerCase(),
            userRole: 'super_admin',
            action: InstallActions.COMPLETED,
            category: 'auth',
            details: { installedAt: new Date().toISOString() }
        })

        // Insert installation log
        await execute(
            `INSERT INTO installation_log (status, step, admin_id) VALUES ('completed', 'admin_created', ?)`,
            [userId]
        )

        return NextResponse.json({
            success: true,
            message: 'Admin account created successfully',
            userId
        })
    } catch (error) {
        console.error('[Install] Create admin error:', error)
        return NextResponse.json(
            { error: 'Failed to create admin account' },
            { status: 500 }
        )
    }
}
