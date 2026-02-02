import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { cookies } from 'next/headers'

const prisma = new PrismaClient()

export async function DELETE() {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) }
    })

    if (!user || user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // Delete all activity logs
    const result = await prisma.activityLog.deleteMany({})

    console.log(`[Logs] SUPERADMIN ${user.email} deleted all ${result.count} activity logs`)

    return NextResponse.json({ 
      success: true, 
      deletedCount: result.count 
    })

  } catch (error: any) {
    console.error('[Delete All Logs] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
