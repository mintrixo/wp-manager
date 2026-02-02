/**
 * Dashboard Stats API
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/jwt'
import { query, queryOne } from '@/lib/db'
import { RowDataPacket } from 'mysql2'

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

        // Build base query condition based on role
        let siteCondition = ''
        let teamCondition = ''
        const params: unknown[] = []

        if (payload.role !== 'super_admin') {
            siteCondition = `WHERE team_id IN (SELECT team_id FROM user_teams WHERE user_id = ? AND approved = TRUE)`
            teamCondition = `WHERE id IN (SELECT team_id FROM user_teams WHERE user_id = ? AND approved = TRUE)`
            params.push(payload.userId)
        }

        // Total sites
        const totalSitesResult = await queryOne<RowDataPacket>(
            `SELECT COUNT(*) as count FROM sites ${siteCondition}`,
            params
        )
        const totalSites = totalSitesResult?.count || 0

        // Live sites
        const liveSitesResult = await queryOne<RowDataPacket>(
            `SELECT COUNT(*) as count FROM sites ${siteCondition ? siteCondition + ' AND' : 'WHERE'} environment = 'live'`,
            params
        )
        const liveSites = liveSitesResult?.count || 0

        // Beta sites
        const betaSites = totalSites - liveSites

        // Health status counts
        const healthyResult = await queryOne<RowDataPacket>(
            `SELECT COUNT(*) as count FROM sites ${siteCondition ? siteCondition + ' AND' : 'WHERE'} status = 'healthy'`,
            params
        )
        const healthySites = healthyResult?.count || 0

        const warningResult = await queryOne<RowDataPacket>(
            `SELECT COUNT(*) as count FROM sites ${siteCondition ? siteCondition + ' AND' : 'WHERE'} status = 'warning'`,
            params
        )
        const warningSites = warningResult?.count || 0

        const errorResult = await queryOne<RowDataPacket>(
            `SELECT COUNT(*) as count FROM sites ${siteCondition ? siteCondition + ' AND' : 'WHERE'} status = 'error'`,
            params
        )
        const errorSites = errorResult?.count || 0

        // Teams count
        const teamsParams = payload.role !== 'super_admin' ? [payload.userId] : []
        const teamsResult = await queryOne<RowDataPacket>(
            `SELECT COUNT(*) as count FROM teams ${teamCondition}`,
            teamsParams
        )
        const totalTeams = teamsResult?.count || 0

        // Users count
        let totalUsers = 0
        if (payload.role === 'super_admin') {
            const usersResult = await queryOne<RowDataPacket>(
                `SELECT COUNT(*) as count FROM users`
            )
            totalUsers = usersResult?.count || 0
        } else {
            const usersResult = await queryOne<RowDataPacket>(
                `SELECT COUNT(DISTINCT user_id) as count FROM user_teams WHERE team_id IN (SELECT team_id FROM user_teams WHERE user_id = ?)`,
                [payload.userId]
            )
            totalUsers = usersResult?.count || 0
        }

        // Recent errors (last 24 hours)
        const errorsParams = payload.role !== 'super_admin'
            ? [...params, payload.userId]
            : []
        const errorsResult = await queryOne<RowDataPacket>(
            `SELECT COUNT(*) as count FROM site_errors 
       WHERE created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
       ${payload.role !== 'super_admin' ? 'AND site_id IN (SELECT id FROM sites WHERE team_id IN (SELECT team_id FROM user_teams WHERE user_id = ?))' : ''}`,
            errorsParams
        )
        const recentErrors = errorsResult?.count || 0

        // Active alerts (unresolved errors)
        const alertsResult = await queryOne<RowDataPacket>(
            `SELECT COUNT(*) as count FROM site_errors 
       WHERE resolved = FALSE AND severity IN ('error', 'critical', 'fatal')
       ${payload.role !== 'super_admin' ? 'AND site_id IN (SELECT id FROM sites WHERE team_id IN (SELECT team_id FROM user_teams WHERE user_id = ?))' : ''}`,
            errorsParams
        )
        const activeAlerts = alertsResult?.count || 0

        return NextResponse.json({
            totalSites,
            liveSites,
            betaSites,
            healthySites,
            warningSites,
            errorSites,
            totalTeams,
            totalUsers,
            recentErrors,
            activeAlerts
        })

    } catch (error) {
        console.error('[Dashboard Stats] Error:', error)
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }
}
