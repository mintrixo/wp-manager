import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendEmail(to: string, subject: string, html: string) {
  try {
    await transporter.sendMail({
      from: `"DevOps System" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    })
    console.log(`[Email Sent] To: ${to}, Subject: ${subject}`)
  } catch (error) {
    console.error('[Email Error]', error)
    throw error
  }
}

// Template 1: Welcome Email
export function getWelcomeEmail(name: string, email: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; }
        .button { display: inline-block; padding: 12px 30px; background: #3b82f6; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to DevOps System! 🎉</h1>
        </div>
        <div class="content">
          <h2>Hello ${name}!</h2>
          <p>Welcome aboard! Your account has been successfully created.</p>
          <p><strong>Email:</strong> ${email}</p>
          <p>You can now manage your WordPress sites, monitor performance, and deploy with ease.</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" class="button">Login to Dashboard</a>
          <p>If you have any questions, feel free to reach out to our support team.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} DevOps System. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

// Template 2: Security Alert Email
export function getSecurityAlertEmail(type: string, ip: string, timestamp: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #ef4444; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #fef2f2; padding: 30px; border: 2px solid #fee2e2; }
        .alert-box { background: white; padding: 15px; border-left: 4px solid #ef4444; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚨 Security Alert</h1>
        </div>
        <div class="content">
          <h2>Security Event Detected</h2>
          <div class="alert-box">
            <p><strong>Type:</strong> ${type}</p>
            <p><strong>IP Address:</strong> ${ip}</p>
            <p><strong>Timestamp:</strong> ${timestamp}</p>
          </div>
          <p>This is an automated security notification. If this wasn't you, please secure your account immediately.</p>
          <p><strong>Recommended Actions:</strong></p>
          <ul>
            <li>Change your password</li>
            <li>Review recent login activity</li>
            <li>Enable two-factor authentication</li>
          </ul>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} DevOps System. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

// Template 3: Password Reset Email
export function getPasswordResetEmail(name: string, resetLink: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; }
        .button { display: inline-block; padding: 12px 30px; background: #3b82f6; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Request</h1>
        </div>
        <div class="content">
          <h2>Hello ${name},</h2>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <a href="${resetLink}" class="button">Reset Password</a>
          <p><strong>This link will expire in 1 hour.</strong></p>
          <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} DevOps System. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

// Template 4: Domain NS Change Alert
export function getDomainNSChangeEmail(domain: string, oldNS: string[], newNS: string[]): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f59e0b; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #fffbeb; padding: 30px; border: 2px solid #fef3c7; }
        .ns-box { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Domain Nameserver Change Detected</h1>
        </div>
        <div class="content">
          <h2>Domain: ${domain}</h2>
          <p>We detected a change in your domain's nameservers.</p>
          
          <div class="ns-box">
            <h3>Previous Nameservers:</h3>
            <ul>
              ${oldNS.map(ns => `<li>${ns}</li>`).join('')}
            </ul>
          </div>
          
          <div class="ns-box">
            <h3>New Nameservers:</h3>
            <ul>
              ${newNS.map(ns => `<li>${ns}</li>`).join('')}
            </ul>
          </div>
          
          <p><strong>If you didn't make this change, please contact support immediately.</strong></p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} DevOps System. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `
}
