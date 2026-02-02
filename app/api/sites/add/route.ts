import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

function generateApiKey(): string {
  return 'wpsk_' + crypto.randomBytes(32).toString('hex')
}

function generateApiSecret(): string {
  return 'wpss_' + crypto.randomBytes(48).toString('hex')
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { domain } = await req.json()

    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
    }

    // Clean domain
    let cleanDomain = domain.trim().toLowerCase()
    cleanDomain = cleanDomain.replace(/^https?:\/\//, '')
    cleanDomain = cleanDomain.replace(/\/$/, '')

    // Check if site already exists
    const existingSite = await prisma.site.findUnique({
      where: { domain: cleanDomain }
    })

    if (existingSite) {
      return NextResponse.json({ error: 'Site already exists' }, { status: 400 })
    }

    // Generate API credentials
    const apiKey = generateApiKey()
    const apiSecret = generateApiSecret()

    // Determine default type based on domain
    const siteType = cleanDomain.includes('beta') || cleanDomain.includes('staging') || cleanDomain.includes('test')
      ? 'BETA'
      : 'LIVE'

    // Create site
    const site = await prisma.site.create({
      data: {
        domain: cleanDomain,
        type: siteType,
        status: 'ACTIVE',
        apiKey,
        apiSecret,
        teamId: user.teamId
      }
    })

    console.log(`[Site Created] Domain: ${cleanDomain}, User: ${user.email}`)

    return NextResponse.json({ 
      site: {
        id: site.id,
        domain: site.domain,
        type: site.type,
        status: site.status,
        apiKey: site.apiKey,
        createdAt: site.createdAt
      }
    })

  } catch (error: any) {
    console.error('[Add Site Error]', error)
    return NextResponse.json({ error: 'Failed to add site. Please try again.' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
