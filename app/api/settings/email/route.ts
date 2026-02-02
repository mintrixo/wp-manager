import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only SUPERADMIN can access email settings
    const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } })
    if (!user || user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const settings = await prisma.emailSettings.findFirst()

    // Don't expose the password
    if (settings) {
      return NextResponse.json({
        settings: {
          ...settings,
          smtpPass: '********'
        }
      })
    }

    return NextResponse.json({ settings: null })
  } catch (error: any) {
    console.error('[Email Settings GET] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only SUPERADMIN can modify email settings
    const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } })
    if (!user || user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()

    // Check if settings already exist
    const existing = await prisma.emailSettings.findFirst()

    let settings
    if (existing) {
      // Update existing settings
      const updateData: any = {
        smtpHost: body.smtpHost,
        smtpPort: parseInt(body.smtpPort),
        smtpUser: body.smtpUser,
        fromEmail: body.fromEmail,
        fromName: body.fromName,
        secure: body.secure === true || body.secure === 'true',
      }

      // Only update password if provided and not masked
      if (body.smtpPass && body.smtpPass !== '********') {
        updateData.smtpPass = body.smtpPass
      }

      settings = await prisma.emailSettings.update({
        where: { id: existing.id },
        data: updateData
      })
    } else {
      // Create new settings
      settings = await prisma.emailSettings.create({
        data: {
          smtpHost: body.smtpHost,
          smtpPort: parseInt(body.smtpPort),
          smtpUser: body.smtpUser,
          smtpPass: body.smtpPass,
          fromEmail: body.fromEmail,
          fromName: body.fromName,
          secure: body.secure === true || body.secure === 'true',
        }
      })
    }

    return NextResponse.json({
      settings: {
        ...settings,
        smtpPass: '********'
      }
    })
  } catch (error: any) {
    console.error('[Email Settings POST] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
