import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { sendNewUserEmail } from '@/lib/email/mailer'

const prisma = new PrismaClient()

function generateRandomPassword(length = 12) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  return password
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: parseInt(userId) }
    })

    if (!currentUser || (currentUser.role !== 'SUPERADMIN' && currentUser.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { name, email, password, role, teamId, sendEmail: shouldSendEmail } = body

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 })
    }

    // Use provided password or generate random one
    const tempPassword = password || generateRandomPassword()
    const hashedPassword = await bcrypt.hash(tempPassword, 10)

    // Create user
    const newUser = await prisma.user.create({
      data: {
        name: name,
        email: email,
        password: hashedPassword,
        role: role || 'USER',
        teamId: teamId ? parseInt(teamId) : null,
        status: 'ACTIVE'
      },
      include: {
        team: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Send welcome email if requested (default: true)
    let emailSent = false
    let emailError = null

    if (shouldSendEmail !== false) {
      try {
        await sendNewUserEmail(email, name, tempPassword)
        console.log(`[Create User] Welcome email sent to ${email}`)
        emailSent = true
      } catch (err: any) {
        console.error('[Create User] Failed to send welcome email:', err)
        emailError = err.message
      }
    }

    return NextResponse.json({
      user: newUser,
      tempPassword: !emailSent ? tempPassword : undefined,
      emailSent,
      emailError: emailError || undefined
    })
  } catch (error: any) {
    console.error('[Create User] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
