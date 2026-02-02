import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const userId = parseInt(params.id)

    console.log('[Toggle Status] User ID:', userId)

    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'

    await prisma.user.update({
      where: { id: userId },
      data: { status: newStatus }
    })

    console.log('[Toggle Status] ✅ Status changed:', user.email, '->', newStatus)

    return NextResponse.json({ success: true, status: newStatus })
  } catch (error: any) {
    console.error('[Toggle Status] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
