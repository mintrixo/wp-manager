import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const teams = await prisma.team.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        sites: {
          select: {
            id: true,
            domain: true,
            status: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ teams })
  } catch (error: any) {
    console.error('[Teams Detailed API] Error:', error)
    return NextResponse.json({ error: error.message, teams: [] }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
