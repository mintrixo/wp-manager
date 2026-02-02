import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const MAX_ATTEMPTS = 3
const LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutes in milliseconds

export async function checkBruteForce(ip: string, email: string): Promise<{ blocked: boolean; remainingAttempts?: number; lockedUntil?: Date }> {
  try {
    // Check if IP is already blocked
    const existingAttempt = await prisma.loginAttempt.findFirst({
      where: {
        OR: [
          { ip },
          { email }
        ],
        lockedUntil: {
          gt: new Date()
        }
      }
    })

    if (existingAttempt) {
      return {
        blocked: true,
        lockedUntil: existingAttempt.lockedUntil || undefined
      }
    }

    // Count recent failed attempts
    const recentAttempts = await prisma.loginAttempt.findMany({
      where: {
        OR: [
          { ip },
          { email }
        ],
        createdAt: {
          gte: new Date(Date.now() - LOCKOUT_DURATION)
        }
      }
    })

    const failedCount = recentAttempts.filter(a => !a.success).length

    if (failedCount >= MAX_ATTEMPTS) {
      const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION)
      
      // Create lock record
      await prisma.loginAttempt.create({
        data: {
          ip,
          email,
          success: false,
          lockedUntil,
          createdAt: new Date()
        }
      })

      return {
        blocked: true,
        lockedUntil
      }
    }

    return {
      blocked: false,
      remainingAttempts: MAX_ATTEMPTS - failedCount
    }
  } catch (error) {
    console.error('[Brute Force Check] Error:', error)
    return { blocked: false }
  }
}

export async function recordLoginAttempt(ip: string, email: string, success: boolean) {
  try {
    await prisma.loginAttempt.create({
      data: {
        ip,
        email,
        success,
        createdAt: new Date()
      }
    })

    // Clean up old attempts (older than 1 hour)
    await prisma.loginAttempt.deleteMany({
      where: {
        createdAt: {
          lt: new Date(Date.now() - 60 * 60 * 1000)
        },
        lockedUntil: null
      }
    })
  } catch (error) {
    console.error('[Record Login Attempt] Error:', error)
  }
}
