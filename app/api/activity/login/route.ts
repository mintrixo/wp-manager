import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(req: Request) {
  try {
    const { siteId, siteDomain, userId, userEmail, userName, ipAddress, userAgent } = await req.json()

    console.log('[Activity Login] Received:', { siteId, siteDomain, userEmail })

    // Find the site
    const site = await prisma.site.findFirst({
      where: siteId ? { id: parseInt(siteId) } : { domain: siteDomain }
    })

    if (!site) {
      console.log('[Activity Login] Site not found:', { siteId, siteDomain })
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    // Find or get the user who owns this site (for logging purposes)
    const siteOwner = await prisma.user.findFirst({
      where: { 
        teams: {
          some: {
            id: site.teamId
          }
        }
      }
    })

    if (!siteOwner) {
      console.log('[Activity Login] No owner found for site')
      return NextResponse.json({ error: 'Site owner not found' }, { status: 404 })
    }

    // Create activity log
    await prisma.activityLog.create({
      data: {
        userId: siteOwner.id,
        action: 'MAGIC_LOGIN',
        details: `Logged into ${site.domain}`,
        ipAddress: ipAddress || 'unknown',
        userAgent: userAgent || 'unknown',
        siteId: site.id
      }
    })

    console.log('[Activity Login] ✅ Activity logged for', site.domain)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Activity Login] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
