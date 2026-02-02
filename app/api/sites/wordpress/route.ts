import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const domain = url.searchParams.get('domain')

    if (!domain) {
      return NextResponse.json({ 
        error: 'Domain parameter is required' 
      }, { status: 400 })
    }

    console.log('[WordPress API] Looking up site:', domain)

    // Find site by domain
    const site = await prisma.site.findFirst({
      where: { domain },
      select: {
        id: true,
        domain: true,
        type: true,
        status: true,
        teamId: true,
        createdAt: true
      }
    })

    if (!site) {
      console.log('[WordPress API] Site not found:', domain)
      return NextResponse.json({ 
        error: 'Site not found in WP-System. Please add it first in the dashboard.',
        domain: domain
      }, { status: 404 })
    }

    console.log('[WordPress API] ✅ Site found:', { id: site.id, domain: site.domain })

    return NextResponse.json({
      success: true,
      site: {
        id: site.id,
        domain: site.domain,
        type: site.type,
        status: site.status,
        teamId: site.teamId
      }
    })
  } catch (error: any) {
    console.error('[WordPress API] Error:', error)
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
