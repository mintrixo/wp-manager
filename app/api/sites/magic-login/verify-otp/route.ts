import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { token, otp } = body

    console.log('[Verify OTP] ===== NEW REQUEST =====')
    console.log('[Verify OTP] Received:', { 
      token: token ? token.substring(0, 15) + '...' : 'missing', 
      otp: otp || 'missing' 
    })

    if (!token || !otp) {
      console.log('[Verify OTP] ERROR: Missing token or OTP')
      return NextResponse.json({ error: 'Token and OTP required' }, { status: 400 })
    }

    // Find OTP record
    console.log('[Verify OTP] Searching for OTP record...')
    const otpRecord = await prisma.magicLoginOTP.findUnique({
      where: { token }
    })

    if (!otpRecord) {
      console.log('[Verify OTP] ERROR: Token not found in database')
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
    }

    console.log('[Verify OTP] OTP Record found:', {
      otp: otpRecord.otp,
      verified: otpRecord.verified,
      expiresAt: otpRecord.expiresAt,
      siteId: otpRecord.siteId
    })

    // Check if already verified
    if (otpRecord.verified) {
      console.log('[Verify OTP] ERROR: OTP already used')
      return NextResponse.json({ error: 'OTP already used' }, { status: 400 })
    }

    // Check if expired
    const now = new Date()
    if (now > otpRecord.expiresAt) {
      console.log('[Verify OTP] ERROR: OTP expired', {
        now: now.toISOString(),
        expiresAt: otpRecord.expiresAt.toISOString()
      })
      return NextResponse.json({ error: 'OTP expired' }, { status: 400 })
    }

    // Verify OTP - compare as strings
    const providedOTP = String(otp).trim()
    const storedOTP = String(otpRecord.otp).trim()
    
    console.log('[Verify OTP] Comparing OTPs:', { 
      provided: providedOTP, 
      stored: storedOTP,
      match: providedOTP === storedOTP
    })

    if (providedOTP !== storedOTP) {
      console.log('[Verify OTP] ERROR: OTP mismatch')
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 })
    }

    // Mark as verified
    console.log('[Verify OTP] Marking OTP as verified...')
    await prisma.magicLoginOTP.update({
      where: { token },
      data: { verified: true }
    })

    // Get site details
    console.log('[Verify OTP] Getting site details...')
    const site = await prisma.site.findUnique({
      where: { id: otpRecord.siteId }
    })

    if (!site) {
      console.log('[Verify OTP] ERROR: Site not found')
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    console.log('[Verify OTP] Site found:', site.domain)

    // Create actual magic login token
    const magicToken = crypto.randomBytes(32).toString('hex')
    const magicExpiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

    console.log('[Verify OTP] Creating magic login token...')
    await prisma.magicLoginToken.create({
      data: {
        token: magicToken,
        siteId: site.id,
        expiresAt: magicExpiresAt,
        used: false
      }
    })

    // Generate login URL
    const loginUrl = `https://${site.domain}/wp-json/wpmanager/v1/verify-login?token=${magicToken}`

    console.log('[Verify OTP] ✅ SUCCESS! Login URL generated:', loginUrl)

    return NextResponse.json({
      success: true,
      loginUrl,
      domain: site.domain
    })
  } catch (error: any) {
    console.error('[Verify OTP] EXCEPTION:', error)
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
