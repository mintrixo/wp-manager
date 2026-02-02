import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'
import { sendEmail } from '@/lib/email/mailer'

const prisma = new PrismaClient()

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

async function sendOTPEmail(email: string, otp: string, siteDomain: string) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .otp-box { background: white; border: 3px solid #667eea; border-radius: 8px; padding: 30px; margin: 20px 0; text-align: center; }
        .otp-code { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #667eea; font-family: monospace; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Magic Login OTP</h1>
        </div>
        <div class="content">
          <h2>Login Verification Code</h2>
          <p>A magic login request was initiated for <strong>${siteDomain}</strong></p>
          
          <div class="otp-box">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Your One-Time Password</p>
            <div class="otp-code">${otp}</div>
          </div>

          <div class="warning">
            <strong>⚠️ Security Notice:</strong>
            <ul style="margin: 10px 0;">
              <li>This OTP is valid for <strong>2 minutes only</strong></li>
              <li>Do not share this code with anyone</li>
              <li>If you didn't request this login, please ignore this email</li>
            </ul>
          </div>

          <p style="margin-top: 30px; font-size: 14px; color: #666;">
            This is an automated security email from WP-System Magic Login.
          </p>
        </div>
        <div class="footer">
          <p>WP-System - Secure WordPress Management</p>
          <p>This email was sent because someone attempted to login to ${siteDomain}</p>
        </div>
      </div>
    </body>
    </html>
  `

  await sendEmail(email, `Magic Login OTP: ${otp} (Valid for 2 minutes)`, html)
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const siteId = parseInt(params.id)

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      include: {
        team: {
          include: {
            users: {
              where: {
                role: { in: ['ADMIN', 'SUPERADMIN'] }
              },
              select: {
                email: true,
                name: true
              }
            }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get site details
    const site = await prisma.site.findUnique({
      where: { id: siteId }
    })

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    // Generate OTP (6 digits)
    const otp = generateOTP()
    
    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex')
    
    // OTP expires in 2 minutes
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000)

    // Store OTP in database
    await prisma.magicLoginOTP.create({
      data: {
        token,
        otp,
        siteId,
        userEmail: user.email,
        expiresAt
      }
    })

    // Send OTP to user's email
    try {
      await sendOTPEmail(user.email, otp, site.domain)
      console.log(`[Magic Login OTP] Sent to user: ${user.email}`)
    } catch (emailError) {
      console.error('[Magic Login OTP] Failed to send to user:', emailError)
    }

    // Send OTP to team admin emails if user is in a team
    if (user.team && user.team.users.length > 0) {
      for (const teamAdmin of user.team.users) {
        if (teamAdmin.email !== user.email) {
          try {
            const adminHtml = `
              <!DOCTYPE html>
              <html>
              <head>
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: #dc2626; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                  .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                  .info-box { background: white; border: 2px solid #dc2626; border-radius: 8px; padding: 20px; margin: 20px 0; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>🔔 Team Member Login Alert</h1>
                  </div>
                  <div class="content">
                    <h2>Magic Login Notification</h2>
                    <p>Your team member <strong>${user.name}</strong> (${user.email}) is attempting to login to:</p>
                    
                    <div class="info-box">
                      <p><strong>Site:</strong> ${site.domain}</p>
                      <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                      <p><strong>OTP Code:</strong> <span style="font-size: 24px; font-weight: bold; color: #dc2626;">${otp}</span></p>
                    </div>

                    <p style="color: #666; font-size: 14px;">
                      This is a security notification. The OTP is valid for 2 minutes.
                    </p>
                  </div>
                </div>
              </body>
              </html>
            `
            await sendEmail(teamAdmin.email, `Team Login Alert: ${user.name} - ${site.domain}`, adminHtml)
            console.log(`[Magic Login OTP] Sent to team admin: ${teamAdmin.email}`)
          } catch (err) {
            console.error(`[Magic Login OTP] Failed to send to team admin ${teamAdmin.email}:`, err)
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      token,
      message: 'OTP sent to your email and team admins',
      expiresIn: 120 // seconds
    })
  } catch (error: any) {
    console.error('[Magic Login] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
