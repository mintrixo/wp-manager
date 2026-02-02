import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { PrismaClient } from '@prisma/client'
import { sendEmail } from '@/lib/email/mailer'

const prisma = new PrismaClient()

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } })
    if (!user || user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const testEmail = body.email || user.email

    const html = `
      <h1>✅ Test Email Successful!</h1>
      <p>Your SMTP configuration is working correctly.</p>
      <p>Sent at: ${new Date().toLocaleString()}</p>
    `

    await sendEmail(testEmail, 'WP-System - Test Email', html)

    return NextResponse.json({ success: true, message: 'Test email sent successfully!' })
  } catch (error: any) {
    console.error('[Email Test] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to send test email', 
      details: error.message 
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
