/**
 * Dashboard Activity API
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/jwt'
import { query } from '@/lib/db'
import { RowDataPacket } from 'mysql2'

interface ActivityRow extends RowDataPacket {
    id: string
    action: string
    user_email: string
    target_type: string
    target_id: string
    details: string
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
        const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)

        let sql = `
      SELECT id, action, user_email, target_type, target_id, details, created_at
      FROM activity_logs
    `
        const params: unknown[] = []

        // Filter by team for non-super-admins
        if (payload.role !== 'super_admin') {
            sql += ` WHERE (user_id = ? OR team_id IN (SELECT team_id FROM user_teams WHERE user_id = ? AND approved = TRUE))`
            params.push(payload.userId, payload.userId)
        }

        sql += ` ORDER BY created_at DESC LIMIT ?`
        params.push(limit)

        const activities = await query<ActivityRow[]>(sql, params)

        // Format activities
        const formattedActivities = activities.map(activity => {
            const details = activity.details ? JSON.parse(activity.details) : {}
            let type: 'success' | 'warning' | 'error' | 'info' = 'info'

            if (activity.action.includes('created') || activity.action.includes('success') || activity.action.includes('enabled')) {
                type = 'success'
            } else if (activity.action.includes('warning') || activity.action.includes('update')) {
                type = 'warning'
            } else if (activity.action.includes('error') || activity.action.includes('failed') || activity.action.includes('locked')) {
                type = 'error'
            }

            // Format time ago
            const now = new Date()
            const activityTime = new Date(activity.created_at)
            const diffMs = now.getTime() - activityTime.getTime()
            const diffMins = Math.floor(diffMs / 60000)
            const diffHours = Math.floor(diffMs / 3600000)
            const diffDays = Math.floor(diffMs / 86400000)

            let time = ''
            if (diffMins < 1) time = 'Just now'
            else if (diffMins < 60) time = `${diffMins} min ago`
            else if (diffHours < 24) time = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
            else time = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`

            // Format action
            const actionParts = activity.action.split('.')
            const formattedAction = actionParts[actionParts.length - 1]
                .replace(/_/g, ' ')
                .replace(/\b\w/g, l => l.toUpperCase())

            return {
                id: activity.id,
                action: formattedAction,
                user: activity.user_email || 'System',
                target: details.domain || details.name || details.email || null,
                time,
                type
            }
        })

        return NextResponse.json({ activities: formattedActivities })

    } catch (error) {
        console.error('[Dashboard Activity] Error:', error)
        return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 })
    }
}
