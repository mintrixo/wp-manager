/**
 * Teams API Route
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/jwt'
import { query, execute, queryOne } from '@/lib/db'
import { createTeamSchema } from '@/lib/validation'
import { generateUUID } from '@/lib/encryption'
import { logActivity, TeamActions, extractRequestMetadata, parseUserAgent } from '@/lib/activity-logger'
import { RowDataPacket } from 'mysql2'

interface TeamRow extends RowDataPacket {
  id: string
  name: string
  email: string
  description: string
  status: string
  allowed_email_domains: string
  created_at: Date
  member_count: number
  site_count: number
}

// GET - List teams
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

    let sql = `
      SELECT 
        t.id, t.name, t.email, t.description, t.status, t.allowed_email_domains, t.created_at,
        (SELECT COUNT(*) FROM user_teams WHERE team_id = t.id AND approved = TRUE) as member_count,
        (SELECT COUNT(*) FROM sites WHERE team_id = t.id) as site_count
      FROM teams t
    `
    const params: unknown[] = []

    if (payload.role !== 'super_admin') {
      sql += ` WHERE t.id IN (SELECT team_id FROM user_teams WHERE user_id = ? AND approved = TRUE)`
      params.push(payload.userId)
    }

    sql += ` ORDER BY t.created_at DESC`

    const teams = await query<TeamRow[]>(sql, params)

    return NextResponse.json({
      teams: teams.map(team => ({
        id: team.id,
        name: team.name,
        email: team.email,
        description: team.description,
        status: team.status,
        allowedEmailDomains: team.allowed_email_domains?.split(',').filter(Boolean) || [],
        memberCount: team.member_count,
        siteCount: team.site_count,
        createdAt: team.created_at
      }))
    })

  } catch (error) {
    console.error('[Teams GET] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 })
  }
}

// POST - Create team
export async function POST(req: Request) {
  const { ipAddress, userAgent } = extractRequestMetadata(req)
  const { deviceType, browser } = parseUserAgent(userAgent)

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

    if (payload.role !== 'super_admin') {
      return NextResponse.json({ error: 'Only super admins can create teams' }, { status: 403 })
    }

    const body = await req.json()
    const validation = createTeamSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { name, email, description, allowedEmailDomains } = validation.data

    // Check if team name already exists
    const existing = await queryOne<RowDataPacket>(
      'SELECT id FROM teams WHERE name = ?',
      [name]
    )

    if (existing) {
      return NextResponse.json({ error: 'A team with this name already exists' }, { status: 400 })
    }

    const teamId = generateUUID()
    await execute(
      `INSERT INTO teams (id, name, email, description, created_by, allowed_email_domains)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [teamId, name, email.toLowerCase(), description || null, payload.userId, allowedEmailDomains || null]
    )

    await logActivity({
      userId: payload.userId,
      userEmail: payload.email,
      userRole: payload.role,
      teamId,
      action: TeamActions.CREATED,
      category: 'team',
      targetType: 'team',
      targetId: teamId,
      details: { name, email },
      ipAddress,
      userAgent,
      deviceType,
      browser
    })

    return NextResponse.json({
      success: true,
      team: { id: teamId, name, email }
    })

  } catch (error) {
    console.error('[Teams POST] Error:', error)
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 })
  }
}
