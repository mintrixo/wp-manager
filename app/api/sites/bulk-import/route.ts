import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const { domains } = await req.json()
    if (!domains || !Array.isArray(domains)) {
      return NextResponse.json({ error: 'Domains array required' }, { status: 400 })
    }

    const results = { success: [], failed: [] }

    for (const domain of domains) {
      try {
        let cleanDomain = domain.trim().toLowerCase()
        cleanDomain = cleanDomain.replace(/^https?:\/\//, '').replace(/\/$/, '')
        
        const exists = await prisma.site.findUnique({ where: { domain: cleanDomain } })
        if (exists) {
          results.failed.push({ domain: cleanDomain, error: 'Already exists' })
          continue
        }

        const apiKey = 'wpsk_' + crypto.randomBytes(32).toString('hex')
        const apiSecret = 'wpss_' + crypto.randomBytes(48).toString('hex')
        const siteType = cleanDomain.includes('beta') || cleanDomain.includes('staging') ? 'BETA' : 'LIVE'

        await prisma.site.create({
          data: { domain: cleanDomain, type: siteType, status: 'ACTIVE', apiKey, apiSecret, teamId: user.teamId }
        })
        
        results.success.push(cleanDomain)
      } catch (error: any) {
        results.failed.push({ domain, error: error.message })
      }
    }

    return NextResponse.json({ results })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
