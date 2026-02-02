import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { domains, type, teamId } = await req.json()
    
    if (!domains || !Array.isArray(domains)) {
      return NextResponse.json({ error: 'Domains required' }, { status: 400 })
    }

    const sites = await Promise.all(
      domains.map(domain =>
        prisma.site.create({
          data: {
            domain: domain.trim(),
            type: type || 'BETA',
            userId: parseInt(userId),
            teamId: teamId || null
          }
        })
      )
    )

    return NextResponse.json({ success: true, count: sites.length })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
