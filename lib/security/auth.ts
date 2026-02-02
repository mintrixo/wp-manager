import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db/prisma"

const loginAttempts: Record<string, { count: number; lastAttempt: number }> = {}

export async function login(email: string, password: string, ip: string) {
  const now = Date.now()
  
  if (loginAttempts[ip]) {
    if (loginAttempts[ip].count >= 3 && now - loginAttempts[ip].lastAttempt < 900000) {
      throw new Error("IP blocked for 15 minutes")
    }
    if (now - loginAttempts[ip].lastAttempt > 900000) {
      delete loginAttempts[ip]
    }
  }

  const user = await prisma.user.findUnique({ where: { email } })

  if (!user || !user.password) {
    loginAttempts[ip] = { count: (loginAttempts[ip]?.count || 0) + 1, lastAttempt: now }
    throw new Error("Invalid credentials")
  }

  const valid = await bcrypt.compare(password, user.password)

  if (!valid) {
    loginAttempts[ip] = { count: (loginAttempts[ip]?.count || 0) + 1, lastAttempt: now }
    throw new Error("Invalid credentials")
  }

  delete loginAttempts[ip]

  await prisma.loginLog.create({
    data: {
      userId: user.id,
      ip,
      location: "Unknown",
      userAgent: "Unknown",
      success: true,
    },
  })

  return user
}

export async function verifySession(userId: number) {
  const session = await prisma.userSession.findFirst({
    where: { userId, expiresAt: { gt: new Date() } },
  })
  
  if (!session) return null

  const inactive = Date.now() - session.lastActivity.getTime() > 3600000
  if (inactive) {
    await prisma.userSession.delete({ where: { id: session.id } })
    return null
  }

  await prisma.userSession.update({
    where: { id: session.id },
    data: { lastActivity: new Date() },
  })

  return session
}
