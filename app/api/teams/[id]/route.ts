import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({ 
      where: { id: parseInt(userId) },
      select: { id: true, role: true, teamId: true }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const params = await context.params
    const requestedTeamId = parseInt(params.id)

    // SUPERADMIN can see any team
    // ADMIN role users can only see their own team
    if (currentUser.role === 'ADMIN' && currentUser.teamId !== requestedTeamId) {
      return NextResponse.json({ error: 'Forbidden - You can only manage your own team' }, { status: 403 })
    }

    const team = await prisma.team.findUnique({
      where: { id: requestedTeamId },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Transform to match frontend expectation (members instead of users)
    const transformedTeam = {
      ...team,
      members: team.users
    }

    return NextResponse.json({ team: transformedTeam })
  } catch (error: any) {
    console.error('[Team API] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only SUPERADMIN can delete teams
    const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } })
    if (!user || user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden - Only Super Admins can delete teams' }, { status: 403 })
    }

    const params = await context.params
    const teamId = parseInt(params.id)

    // Remove all users from this team first
    await prisma.user.updateMany({
      where: { teamId },
      data: { teamId: null }
    })

    // Delete the team
    await prisma.team.delete({
      where: { id: teamId }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Delete Team] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
