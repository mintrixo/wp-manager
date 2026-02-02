/**
 * Site Errors API
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/jwt'
import { query, execute } from '@/lib/db'
import { RowDataPacket } from 'mysql2'

interface ErrorRow extends RowDataPacket {
    id: string
    site_id: string
    domain: string
    severity: string
    error_type: string
    message: string
    source_file: string | null
    line_number: number | null
    stack_trace: string | null
    resolved: boolean
    created_at: Date
}

// GET - List errors
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
        const siteId = searchParams.get('siteId')
        const severity = searchParams.get('severity')
        const resolved = searchParams.get('resolved')
        const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)

        let sql = `
      SELECT 
        e.id, e.site_id, s.domain, e.severity, e.error_type, e.message,
        e.source_file, e.line_number, e.stack_trace, e.resolved, e.created_at
      FROM site_errors e
      JOIN sites s ON e.site_id = s.id
      WHERE 1=1
    `
        const params: unknown[] = []

        // Filter by team for non-super-admins
        if (payload.role !== 'super_admin') {
            sql += ` AND s.team_id IN (SELECT team_id FROM user_teams WHERE user_id = ? AND approved = TRUE)`
            params.push(payload.userId)
        }

        if (siteId) {
            sql += ` AND e.site_id = ?`
            params.push(siteId)
        }

        if (severity && ['notice', 'warning', 'error', 'critical', 'fatal'].includes(severity)) {
            sql += ` AND e.severity = ?`
            params.push(severity)
        }

        if (resolved !== null) {
            sql += ` AND e.resolved = ?`
            params.push(resolved === 'true')
        }

        sql += ` ORDER BY e.created_at DESC LIMIT ?`
        params.push(limit)

        const errors = await query<ErrorRow[]>(sql, params)

        return NextResponse.json({
            errors: errors.map(err => ({
                id: err.id,
                siteId: err.site_id,
                siteDomain: err.domain,
                severity: err.severity,
                errorType: err.error_type,
                message: err.message,
                sourceFile: err.source_file,
                lineNumber: err.line_number,
                stackTrace: err.stack_trace,
                resolved: err.resolved,
                createdAt: err.created_at
            }))
        })

    } catch (error) {
        console.error('[Errors GET] Error:', error)
        return NextResponse.json({ error: 'Failed to fetch errors' }, { status: 500 })
    }
}

// PATCH - Mark error as resolved
export async function PATCH(req: Request) {
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
        const { errorId, resolved } = body

        if (!errorId) {
            return NextResponse.json({ error: 'Error ID required' }, { status: 400 })
        }

        await execute(
            'UPDATE site_errors SET resolved = ?, resolved_at = ?, resolved_by = ? WHERE id = ?',
            [resolved ?? true, new Date(), payload.userId, errorId]
        )

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('[Errors PATCH] Error:', error)
        return NextResponse.json({ error: 'Failed to update error' }, { status: 500 })
    }
}
