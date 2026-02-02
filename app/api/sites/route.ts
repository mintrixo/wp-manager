/**
 * Sites API Route
 * List and manage sites
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/jwt'
import { query, execute, queryOne } from '@/lib/db'
import { addSiteSchema } from '@/lib/validation'
import { generateApiKey, encrypt, generateUUID } from '@/lib/encryption'
import { logActivity, SiteActions, extractRequestMetadata, parseUserAgent } from '@/lib/activity-logger'
import { config } from '@/lib/config'
import { RowDataPacket } from 'mysql2'

interface SiteRow extends RowDataPacket {
  id: string
  domain: string
  url: string
  environment: 'beta' | 'live'
  status: string
  team_id: string
  team_name: string
  last_sync: Date | null
  plugin_count: number
  theme_count: number
  user_count: number
}

// GET - List sites
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
    const teamId = searchParams.get('teamId')
    const environment = searchParams.get('environment')

    let sql = `
      SELECT 
        s.id, s.domain, s.url, s.environment, s.status, s.last_sync,
        s.team_id, t.name as team_name,
        (SELECT COUNT(*) FROM site_plugins WHERE site_id = s.id) as plugin_count,
        (SELECT COUNT(*) FROM site_themes WHERE site_id = s.id) as theme_count,
        (SELECT COUNT(*) FROM site_users WHERE site_id = s.id) as user_count
      FROM sites s
      LEFT JOIN teams t ON s.team_id = t.id
      WHERE 1=1
    `
    const params: unknown[] = []

    // Filter by team for non-super-admins
    if (payload.role !== 'super_admin') {
      sql += ` AND s.team_id IN (SELECT team_id FROM user_teams WHERE user_id = ? AND approved = TRUE)`
      params.push(payload.userId)
    }

    if (teamId) {
      sql += ` AND s.team_id = ?`
      params.push(teamId)
    }

    if (environment && ['beta', 'live'].includes(environment)) {
      sql += ` AND s.environment = ?`
      params.push(environment)
    }

    sql += ` ORDER BY s.created_at DESC`

    const sites = await query<SiteRow[]>(sql, params)

    return NextResponse.json({
      sites: sites.map(site => ({
        id: site.id,
        domain: site.domain,
        url: site.url,
        environment: site.environment,
        status: site.status,
        lastSync: site.last_sync,
        team: {
          id: site.team_id,
          name: site.team_name
        },
        pluginCount: site.plugin_count,
        themeCount: site.theme_count,
        userCount: site.user_count
      }))
    })

  } catch (error) {
    console.error('[Sites GET] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch sites' }, { status: 500 })
  }
}

// POST - Add new site
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

    // Only super admin can add sites directly
    if (payload.role !== 'super_admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await req.json()
    const validation = addSiteSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { url, teamId } = validation.data

    // Extract domain from URL
    const urlObj = new URL(url)
    const domain = urlObj.hostname

    // Check if domain already exists
    const existing = await queryOne<RowDataPacket>(
      'SELECT id FROM sites WHERE domain = ?',
      [domain]
    )

    if (existing) {
      return NextResponse.json({ error: 'Site already registered' }, { status: 400 })
    }

    // Determine environment based on domain pattern
    const isBeta = config.betaSitePattern.test(domain)
    const environment = isBeta ? 'beta' : 'live'

    // Get or create team
    let siteTeamId = teamId
    if (!siteTeamId) {
      // Find default team or use first available
      const defaultTeam = await queryOne<RowDataPacket>(
        `SELECT id FROM teams WHERE created_by = ? ORDER BY created_at LIMIT 1`,
        [payload.userId]
      )
      if (defaultTeam) {
        siteTeamId = defaultTeam.id
      } else {
        return NextResponse.json({ error: 'No team available. Create a team first.' }, { status: 400 })
      }
    }

    // Generate API key
    const apiKey = generateApiKey('wpsite_')
    const apiKeyPrefix = apiKey.substring(0, 10)
    const encryptedApiKey = encrypt(apiKey)

    // Create site
    const siteId = generateUUID()
    await execute(
      `INSERT INTO sites (id, team_id, domain, url, environment, status, api_key_encrypted, api_key_prefix)
       VALUES (?, ?, ?, ?, ?, 'healthy', ?, ?)`,
      [siteId, siteTeamId, domain, url, environment, encryptedApiKey, apiKeyPrefix]
    )

    // Log activity
    await logActivity({
      userId: payload.userId,
      userEmail: payload.email,
      userRole: payload.role,
      siteId,
      action: SiteActions.CREATED,
      category: 'site',
      targetType: 'site',
      targetId: siteId,
      details: { domain, environment },
      ipAddress,
      userAgent,
      deviceType,
      browser
    })

    return NextResponse.json({
      success: true,
      site: {
        id: siteId,
        domain,
        url,
        environment,
        apiKey // Return API key only on creation
      }
    })

  } catch (error) {
    console.error('[Sites POST] Error:', error)
    return NextResponse.json({ error: 'Failed to add site' }, { status: 500 })
  }
}
