import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

export class TokenManager {
  // Generate a new secure token
  static generateToken(): string {
    const timestamp = Date.now()
    const random = crypto.randomBytes(16).toString('hex')
    const hash = crypto.createHash('sha256').update(`${timestamp}_${random}`).digest('hex')
    return `${timestamp}_${hash.substring(0, 24)}`
  }

  // Check if token has been used
  static async isTokenUsed(token: string): Promise<boolean> {
    const usedToken = await prisma.usedToken.findUnique({
      where: { token }
    })
    return !!usedToken
  }

  // Mark token as used
  static async markTokenUsed(token: string, siteId: number, userId: number): Promise<void> {
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes

    await prisma.usedToken.create({
      data: {
        token,
        siteId,
        userId,
        expiresAt
      }
    })
  }

  // Check if token is expired
  static isTokenExpired(token: string, maxAgeMinutes: number = 30): boolean {
    const timestamp = parseInt(token.split('_')[0])
    if (isNaN(timestamp)) return true
    
    const expiryTime = timestamp + (maxAgeMinutes * 60 * 1000)
    return Date.now() > expiryTime
  }

  // Clean up expired tokens (run this periodically)
  static async cleanupExpiredTokens(): Promise<number> {
    const result = await prisma.usedToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    })
    return result.count
  }

  // Validate token (check if valid, not used, not expired)
  static async validateToken(token: string): Promise<{
    valid: boolean
    reason?: string
  }> {
    // Check if expired
    if (this.isTokenExpired(token)) {
      return { valid: false, reason: 'Token expired' }
    }

    // Check if already used
    const used = await this.isTokenUsed(token)
    if (used) {
      return { valid: false, reason: 'Token already used' }
    }

    return { valid: true }
  }
}
