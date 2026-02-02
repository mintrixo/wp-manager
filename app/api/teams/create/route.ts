import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is SUPERADMIN
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: { role: true }
    })

    if (!user || user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden - Only Super Admins can create teams' }, { status: 403 })
    }

    const { name } = await req.json()

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 })
    }

    const team = await prisma.team.create({
      data: {
        name: name.trim()
      }
    })

    return NextResponse.json({ team })
  } catch (error: any) {
    console.error('[Create Team] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
