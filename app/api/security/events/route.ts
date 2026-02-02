/**
 * Security Events API
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/jwt'
import { query } from '@/lib/db'
import { RowDataPacket } from 'mysql2'

interface SecurityEventRow extends RowDataPacket {
    id: string
    event_type: string
    event_description: string
    user_id: string | null
    user_email: string | null
    ip_address: string | null
    user_agent: string | null
    severity: string
    created_at: Date
}

export async function GET(req: Request) {
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

        // Only super admins can view security events
        if (payload.role !== 'super_admin') {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
        }

        const { searchParams } = new URL(req.url)
        const severity = searchParams.get('severity')
        const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)

        let sql = `
      SELECT 
        id, event_type, event_description, user_id, user_email,
        ip_address, user_agent, severity, created_at
      FROM security_events
      WHERE 1=1
    `
        const params: unknown[] = []

        if (severity && ['low', 'medium', 'high', 'critical'].includes(severity)) {
            sql += ` AND severity = ?`
            params.push(severity)
        }

        sql += ` ORDER BY created_at DESC LIMIT ?`
        params.push(limit)

        const events = await query<SecurityEventRow[]>(sql, params)

        return NextResponse.json({
            events: events.map(event => ({
                id: event.id,
                eventType: event.event_type,
                eventDescription: event.event_description,
                userEmail: event.user_email,
                ipAddress: event.ip_address,
                userAgent: event.user_agent,
                severity: event.severity,
                createdAt: event.created_at
            }))
        })

    } catch (error) {
        console.error('[Security Events] Error:', error)
        return NextResponse.json({ error: 'Failed to fetch security events' }, { status: 500 })
    }
}
