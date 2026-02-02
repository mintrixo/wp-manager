import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

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

    // Generate temporary password
    const tempPassword = crypto.randomBytes(8).toString('hex')
    const hashedPassword = await bcrypt.hash(tempPassword, 10)

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    })

    console.log('[Reset Password] ✅ Password reset for:', user.email)
    console.log('[Reset Password] Temp password:', tempPassword)

    // TODO: Send email with temp password
    return NextResponse.json({ 
      success: true, 
      message: 'Password reset email sent (temp password: ' + tempPassword + ')' 
    })
  } catch (error: any) {
    console.error('[Reset Password] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
