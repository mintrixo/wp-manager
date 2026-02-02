import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { isEmailAllowed } from '@/lib/check-allowed-domain'
import { detectSQLInjection, logSQLInjectionAttempt } from '@/lib/sqli-detection'
import { sendEmail, getWelcomeEmail } from '@/lib/email'

const prisma = new PrismaClient()

export async function POST(req: Request) {
  let ip = '0.0.0.0'
  
  try {
    // Get client IP
    const forwarded = req.headers.get('x-forwarded-for')
    const realIp = req.headers.get('x-real-ip')
    ip = forwarded?.split(',')[0] || realIp || '0.0.0.0'

    const { email, password, name } = await req.json()

    // SQL Injection Detection
    if (detectSQLInjection(email) || detectSQLInjection(password) || (name && detectSQLInjection(name))) {
      await logSQLInjectionAttempt(ip, email, `${email} | ${name}`, '/api/auth/signup')
      return NextResponse.json({ error: 'Invalid input detected' }, { status: 400 })
    }

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    // Check if domain is allowed
    const emailLower = email.toLowerCase()
    const allowed = await isEmailAllowed(emailLower)

    if (!allowed) {
      return NextResponse.json({ 
        error: 'Registration is restricted. Your email domain is not in the allowed list.' 
      }, { status: 403 })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: emailLower }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        email: emailLower,
        password: hashedPassword,
        name: name || null,
        role: 'USER'
      }
    })

    // Send welcome email
    try {
      await sendEmail(
        user.email,
        'Welcome to DevOps System!',
        getWelcomeEmail(user.name || 'User', user.email)
      )
    } catch (emailError) {
      console.error('[Signup] Failed to send welcome email:', emailError)
      // Don't fail signup if email fails
    }

    console.log(`[Signup Success] User: ${emailLower}, IP: ${ip}`)

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    })

  } catch (error: any) {
    console.error('[Signup Error]', error)
    return NextResponse.json({ error: 'Signup failed. Please try again.' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
