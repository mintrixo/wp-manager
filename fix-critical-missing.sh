#!/bin/bash

echo "🔧 Fixing Critical Missing Components..."

# 1. Admin User Management Routes
echo "1️⃣ Creating admin user management routes..."

# Toggle User Status
mkdir -p app/api/admin/users/\[id\]/toggle-status
cat > app/api/admin/users/\[id\]/toggle-status/route.ts << 'EOF'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const admin = await prisma.user.findUnique({ where: { id: parseInt(userId) } })
    
    if (admin?.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id: parseInt(params.id) }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const newStatus = user.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE'

    await prisma.user.update({
      where: { id: parseInt(params.id) },
      data: { status: newStatus }
    })

    await prisma.securityEvent.create({
      data: {
        userId: user.id,
        event: `User ${newStatus.toLowerCase()} by admin`,
        ip: req.headers.get('x-forwarded-for') || 'unknown'
      }
    })

    return NextResponse.json({ success: true, status: newStatus })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
EOF

# Reset Password
mkdir -p app/api/admin/users/\[id\]/reset-password
cat > app/api/admin/users/\[id\]/reset-password/route.ts << 'EOF'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const prisma = new PrismaClient()

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const admin = await prisma.user.findUnique({ where: { id: parseInt(userId) } })
    
    if (admin?.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id: parseInt(params.id) }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Generate temporary password
    const tempPassword = crypto.randomBytes(8).toString('hex')
    const hashedPassword = await bcrypt.hash(tempPassword, 12)

    await prisma.user.update({
      where: { id: parseInt(params.id) },
      data: { password: hashedPassword }
    })

    // TODO: Send email with temporary password

    return NextResponse.json({ 
      success: true, 
      tempPassword,
      message: 'Password reset. User should change it on first login.'
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
EOF

# Enforce 2FA
mkdir -p app/api/admin/users/\[id\]/enforce-2fa
cat > app/api/admin/users/\[id\]/enforce-2fa/route.ts << 'EOF'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const admin = await prisma.user.findUnique({ where: { id: parseInt(userId) } })
    
    if (admin?.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Mark user as requiring 2FA setup on next login
    await prisma.user.update({
      where: { id: parseInt(params.id) },
      data: { status: 'PENDING' } // Will force 2FA setup
    })

    return NextResponse.json({ success: true })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
EOF

# 2. Session Timeout Warning System
echo "2️⃣ Creating session timeout warning..."

cat > lib/session-timeout.ts << 'EOF'
export const SESSION_TIMEOUT = 3600000 // 1 hour
export const WARNING_TIME = 60000 // 1 minute before timeout

export function setupSessionTimeout(onWarning: () => void, onTimeout: () => void) {
  let warningTimeout: NodeJS.Timeout
  let logoutTimeout: NodeJS.Timeout
  let lastActivity = Date.now()

  function resetTimers() {
    clearTimeout(warningTimeout)
    clearTimeout(logoutTimeout)
    
    lastActivity = Date.now()
    
    warningTimeout = setTimeout(() => {
      onWarning()
    }, SESSION_TIMEOUT - WARNING_TIME)
    
    logoutTimeout = setTimeout(() => {
      onTimeout()
    }, SESSION_TIMEOUT)
  }

  // Track user activity
  const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
  events.forEach(event => {
    document.addEventListener(event, resetTimers)
  })

  resetTimers()

  return () => {
    clearTimeout(warningTimeout)
    clearTimeout(logoutTimeout)
    events.forEach(event => {
      document.removeEventListener(event, resetTimers)
    })
  }
}
EOF

# 3. Security Middleware
echo "3️⃣ Creating security middleware..."

mkdir -p lib/security
cat > lib/security/ip-blocker.ts << 'EOF'
type BlockedIP = {
  ip: string
  attempts: number
  blockedUntil: number
}

const blockedIPs = new Map<string, BlockedIP>()

export function checkIPBlocked(ip: string): boolean {
  const blocked = blockedIPs.get(ip)
  
  if (!blocked) return false
  
  if (Date.now() > blocked.blockedUntil) {
    blockedIPs.delete(ip)
    return false
  }
  
  return true
}

export function recordFailedAttempt(ip: string) {
  const existing = blockedIPs.get(ip) || { ip, attempts: 0, blockedUntil: 0 }
  
  existing.attempts++
  
  if (existing.attempts >= 3) {
    existing.blockedUntil = Date.now() + 900000 // Block for 15 minutes
  }
  
  blockedIPs.set(ip, existing)
}

export function clearAttempts(ip: string) {
  blockedIPs.delete(ip)
}
EOF

cat > lib/security/sql-detector.ts << 'EOF'
const SQL_PATTERNS = [
  /(\bOR\b.*=.*)/i,
  /(\bUNION\b.*\bSELECT\b)/i,
  /(DROP\s+TABLE)/i,
  /(INSERT\s+INTO)/i,
  /(DELETE\s+FROM)/i,
  /('--)/,
  /('OR'1'='1)/i
]

export function detectSQLInjection(input: string): boolean {
  return SQL_PATTERNS.some(pattern => pattern.test(input))
}
EOF

# 4. Allowed Domains System
echo "4️⃣ Creating allowed domains API..."

mkdir -p app/api/admin/domains
cat > app/api/admin/domains/route.ts << 'EOF'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const domains = await prisma.allowedDomain.findMany()
    return NextResponse.json({ domains })
  } catch (error: any) {
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
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } })
    
    if (user?.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { domain } = await req.json()

    await prisma.allowedDomain.create({
      data: { domain }
    })

    return NextResponse.json({ success: true })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
EOF

echo "✅ Critical components created!"
echo ""
echo "📋 Next steps:"
echo "   1. Run: chmod +x fix-critical-missing.sh"
echo "   2. Run: rm -rf .next && pnpm build"
echo "   3. Run: pm2 restart wpsystem"
