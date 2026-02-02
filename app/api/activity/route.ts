/**
 * Activity Logs API
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/jwt'
import { query } from '@/lib/db'
import { RowDataPacket } from 'mysql2'

interface ActivityRow extends RowDataPacket {
    id: string
    action: string
    category: string
    user_email: string
    user_id: string
    target_type: string | null
    target_id: string | null
    details: string | null
    ip_address: string | null
    browser: string | null
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

        const { searchParams } = new URL(req.url)
        const category = searchParams.get('category')
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)

        let sql = `
      SELECT 
        a.id, a.action, a.category, a.user_email, a.user_id,
        a.target_type, a.target_id, a.details, a.ip_address, a.browser, a.created_at
      FROM activity_logs a
      WHERE 1=1
    `
        const params: unknown[] = []

        // Filter by team for non-super-admins
        if (payload.role !== 'super_admin') {
            sql += ` AND (a.user_id = ? OR a.team_id IN (SELECT team_id FROM user_teams WHERE user_id = ? AND approved = TRUE))`
            params.push(payload.userId, payload.userId)
        }

        if (category && ['auth', 'user', 'team', 'site', 'settings', 'security'].includes(category)) {
            sql += ` AND a.category = ?`
            params.push(category)
        }

        sql += ` ORDER BY a.created_at DESC LIMIT ?`
        params.push(limit)

        const activities = await query<ActivityRow[]>(sql, params)

        return NextResponse.json({
            activities: activities.map(activity => {
                const details = activity.details ? JSON.parse(activity.details) : {}
                return {
                    id: activity.id,
                    action: activity.action,
                    category: activity.category,
                    userEmail: activity.user_email,
                    userName: details.userName,
                    targetType: activity.target_type,
                    targetName: details.domain || details.name || details.email,
                    details,
                    ipAddress: activity.ip_address,
                    browser: activity.browser,
                    createdAt: activity.created_at
                }
            })
        })

    } catch (error) {
        console.error('[Activity GET] Error:', error)
        return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 })
    }
}
