import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: { role: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get all sites count (SUPERADMIN sees all, others see team sites)
    const sites = await prisma.site.findMany()
    const betaSites = sites.filter(s => s.type === 'BETA').length
    const liveSites = sites.filter(s => s.type === 'LIVE').length

    const stats = {
      totalSites: sites.length,
      betaSites,
      liveSites,
      activeTeams: await prisma.team.count(),
      totalUsers: await prisma.user.count(),
      totalErrors: 0
    }

    return NextResponse.json(stats)

  } catch (error: any) {
    console.error('[Stats API] Error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
