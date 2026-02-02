import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies()
    const adminId = cookieStore.get('userId')?.value

    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({ 
      where: { id: parseInt(adminId) },
      select: { role: true, teamId: true }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const params = await context.params
    const requestedTeamId = parseInt(params.id)

    // ADMIN users can only remove from their own team
    if (currentUser.role === 'ADMIN' && currentUser.teamId !== requestedTeamId) {
      return NextResponse.json({ error: 'Forbidden - You can only remove users from your own team' }, { status: 403 })
    }

    const { userId } = await req.json()

    await prisma.user.update({
      where: { id: userId },
      data: { teamId: null }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Remove User from Team] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
