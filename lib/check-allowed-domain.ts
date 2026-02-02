import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function isEmailAllowed(email: string): Promise<boolean> {
  try {
    const domain = email.split('@')[1]?.toLowerCase()
    
    if (!domain) return false

    const allowedDomain = await prisma.allowedDomain.findFirst({
      where: {
        domain,
        active: true
      }
    })

    return allowedDomain !== null
  } catch (error) {
    console.error('[Check Allowed Domain] Error:', error)
    return false
  } finally {
    await prisma.$disconnect()
  }
}
