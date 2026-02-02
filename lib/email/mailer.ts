import nodemailer from 'nodemailer'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function getEmailTransporter() {
  try {
    const settings = await prisma.emailSettings.findFirst()
    
    if (!settings) {
      console.log('[Email] No SMTP settings configured')
      return null
    }

    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: settings.secure,
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPass,
      },
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2'
      }
    })

    return { transporter, settings }
  } catch (error) {
    console.error('[Email] Failed to create transporter:', error)
    return null
  } finally {
    await prisma.$disconnect()
  }
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string
) {
  const emailConfig = await getEmailTransporter()
  
  if (!emailConfig) {
    throw new Error('Email not configured')
  }

  const { transporter, settings } = emailConfig

  try {
    const info = await transporter.sendMail({
      from: `"${settings.fromName}" <${settings.fromEmail}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    })

    console.log('[Email] Sent successfully:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error: any) {
    console.error('[Email] Send failed:', error)
    throw error
  }
}

// New User Welcome Email with Credentials
export async function sendNewUserEmail(email: string, name: string, tempPassword: string) {
  const loginUrl = 'http://5.252.54.159:3000/login'
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .credentials { background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .credential-item { margin: 10px 0; padding: 10px; background: #f0f4ff; border-radius: 5px; }
        .credential-label { font-weight: bold; color: #667eea; display: block; margin-bottom: 5px; }
        .credential-value { font-family: monospace; font-size: 16px; color: #333; }
        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Welcome to WP-System!</h1>
        </div>
        <div class="content">
          <h2>Hello ${name}!</h2>
          <p>An administrator has created an account for you on WP-System. Here are your login credentials:</p>
          
          <div class="credentials">
            <div class="credential-item">
              <span class="credential-label">📧 Email / Username:</span>
              <span class="credential-value">${email}</span>
            </div>
            <div class="credential-item">
              <span class="credential-label">🔐 Temporary Password:</span>
              <span class="credential-value">${tempPassword}</span>
            </div>
          </div>

          <div class="warning">
            <strong>⚠️ Important:</strong> Please change your password after your first login for security purposes.
          </div>

          <p style="text-align: center;">
            <a href="${loginUrl}" class="button">Login to Your Account</a>
          </p>

          <h3>What you can do with WP-System:</h3>
          <ul>
            <li>✅ Manage multiple WordPress sites from one dashboard</li>
            <li>✅ Magic login to your sites without entering credentials</li>
            <li>✅ Monitor site security and activity</li>
            <li>✅ Collaborate with your team members</li>
          </ul>

          <p>If you have any questions, please contact your administrator.</p>
        </div>
        <div class="footer">
          <p>WP-System - WordPress Management Dashboard</p>
          <p>This is an automated email. Please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return await sendEmail(email, 'Welcome to WP-System - Your Account Details', html)
}

// Password Reset Email by Admin
export async function sendAdminPasswordResetEmail(email: string, name: string, newPassword: string) {
  const loginUrl = 'http://5.252.54.159:3000/login'
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .credentials { background: white; border: 2px solid #dc2626; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .credential-item { margin: 10px 0; padding: 10px; background: #fee; border-radius: 5px; }
        .credential-label { font-weight: bold; color: #dc2626; display: block; margin-bottom: 5px; }
        .credential-value { font-family: monospace; font-size: 16px; color: #333; }
        .button { display: inline-block; padding: 12px 30px; background: #dc2626; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Password Reset</h1>
        </div>
        <div class="content">
          <h2>Hello ${name},</h2>
          <p>An administrator has reset your password for WP-System. Here is your new temporary password:</p>
          
          <div class="credentials">
            <div class="credential-item">
              <span class="credential-label">📧 Email / Username:</span>
              <span class="credential-value">${email}</span>
            </div>
            <div class="credential-item">
              <span class="credential-label">🔐 New Temporary Password:</span>
              <span class="credential-value">${newPassword}</span>
            </div>
          </div>

          <div class="warning">
            <strong>⚠️ Important Security Notice:</strong>
            <ul style="margin: 10px 0;">
              <li>Please change this password immediately after logging in</li>
              <li>If you didn't request this password reset, contact your administrator immediately</li>
              <li>Keep your password secure and don't share it with anyone</li>
            </ul>
          </div>

          <p style="text-align: center;">
            <a href="${loginUrl}" class="button">Login Now</a>
          </p>

          <p style="margin-top: 30px; font-size: 14px; color: #666;">
            This password reset was performed by an administrator. If you have any concerns, please contact your system administrator.
          </p>
        </div>
        <div class="footer">
          <p>WP-System - WordPress Management Dashboard</p>
          <p>This is an automated email. Please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return await sendEmail(email, 'Your WP-System Password Has Been Reset', html)
}

// Welcome Email (original)
export async function sendWelcomeEmail(email: string, name: string) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Welcome to WP-System!</h1>
        </div>
        <div class="content">
          <h2>Hello ${name}!</h2>
          <p>Your account has been successfully created. You can now log in and start managing your WordPress sites.</p>
          <p>
            <a href="http://5.252.54.159:3000/login" class="button">Login to Dashboard</a>
          </p>
          <h3>What you can do:</h3>
          <ul>
            <li>✅ Manage multiple WordPress sites</li>
            <li>✅ Magic login to your sites</li>
            <li>✅ Monitor site security</li>
            <li>✅ Collaborate with teams</li>
          </ul>
        </div>
        <div class="footer">
          <p>WP-System - WordPress Management Dashboard</p>
        </div>
      </div>
    </body>
    </html>
  `

  return await sendEmail(email, 'Welcome to WP-System! 🚀', html)
}

// Password Reset with Token (user-initiated)
export async function sendPasswordResetEmail(email: string, resetToken: string) {
  const resetUrl = `http://5.252.54.159:3000/reset-password?token=${resetToken}`
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 30px; background: #dc2626; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .code { background: #fff; border: 2px dashed #dc2626; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 3px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Password Reset Request</h1>
        </div>
        <div class="content">
          <p>You requested to reset your password. Click the button below to proceed:</p>
          <p style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </p>
          <p>Or copy this link:</p>
          <div class="code">${resetUrl}</div>
          <p><strong>This link will expire in 1 hour.</strong></p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return await sendEmail(email, 'Password Reset Request - WP-System', html)
}
