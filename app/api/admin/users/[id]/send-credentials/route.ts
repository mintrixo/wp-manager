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

    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // TODO: Send actual email with credentials
    console.log('[Send Credentials] Would send email to:', user.email)

    return NextResponse.json({ 
      success: true, 
      message: 'Credentials sent successfully (placeholder)' 
    })
  } catch (error: any) {
    console.error('[Send Credentials] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
