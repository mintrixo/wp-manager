import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - Verify magic login token (called by WordPress MU-Plugin)
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const token = url.searchParams.get('token')
    const domain = url.searchParams.get('domain')

    console.log('[Magic Login Verify] Request:', { 
      token: token?.substring(0, 15) + '...', 
      domain 
    })

    if (!token) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Token is required' 
      }, { status: 400 })
    }

    // Find the magic login token in database
    const magicToken = await prisma.magicLoginToken.findUnique({
      where: { token },
      include: {
        site: true
      }
    })

    if (!magicToken) {
      console.log('[Magic Login Verify] Token not found in database')
      return NextResponse.json({ 
        valid: false, 
        error: 'Invalid token' 
      }, { status: 404 })
    }

    // Check if token is expired
    if (new Date() > magicToken.expiresAt) {
      console.log('[Magic Login Verify] Token expired at', magicToken.expiresAt)
      return NextResponse.json({ 
        valid: false, 
        error: 'Token has expired' 
      }, { status: 401 })
    }

    // Check if token has already been used
    if (magicToken.used) {
      console.log('[Magic Login Verify] Token already used')
      return NextResponse.json({ 
        valid: false, 
        error: 'Token has already been used' 
      }, { status: 401 })
    }

    // Optionally verify domain matches
    if (domain && magicToken.site.domain !== domain) {
      console.log('[Magic Login Verify] Domain mismatch:', { 
        expected: magicToken.site.domain, 
        received: domain 
      })
      return NextResponse.json({ 
        valid: false, 
        error: 'Token is not valid for this domain' 
      }, { status: 403 })
    }

    // Mark token as used
    await prisma.magicLoginToken.update({
      where: { token },
      data: { used: true }
    })

    console.log('[Magic Login Verify] ✅ Token valid for site:', magicToken.site.domain)

    // Return success
    return NextResponse.json({
      valid: true,
      site: {
        id: magicToken.site.id,
        domain: magicToken.site.domain
      }
    })
  } catch (error: any) {
    console.error('[Magic Login Verify] Error:', error)
    return NextResponse.json({ 
      valid: false, 
      error: error.message 
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

// POST - This is handled by the [id]/magic-login route for OTP generation
// Keeping this here for reference
export async function POST(req: Request) {
  return NextResponse.json({ 
    error: 'Use /api/sites/[id]/magic-login for OTP generation' 
  }, { status: 400 })
}
