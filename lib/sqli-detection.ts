import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Common SQL injection patterns
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/gi,
  /(--|\#|\/\*|\*\/)/g,
  /(\bOR\b\s+\d+\s*=\s*\d+)/gi,
  /(\bAND\b\s+\d+\s*=\s*\d+)/gi,
  /(';|";|`)/g,
  /(\bOR\b.*\bLIKE\b)/gi,
  /(CONCAT\s*\(|CHAR\s*\(|0x[0-9a-fA-F]+)/gi,
  /(BENCHMARK|SLEEP|WAITFOR\s+DELAY)/gi,
  /(INFORMATION_SCHEMA|SYSOBJECTS|SYSCOLUMNS)/gi
]

export function detectSQLInjection(input: string): boolean {
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      return true
    }
  }
  return false
}

export async function logSQLInjectionAttempt(
  ip: string,
  email: string | null,
  input: string,
  endpoint: string
) {
  try {
    await prisma.securityLog.create({
      data: {
        type: 'SQL_INJECTION_ATTEMPT',
        ip,
        email,
        details: JSON.stringify({
          input: input.substring(0, 500), // Limit stored input
          endpoint,
          timestamp: new Date().toISOString()
        }),
        createdAt: new Date()
      }
    })

    console.error(`[SQL INJECTION DETECTED] IP: ${ip}, Email: ${email}, Endpoint: ${endpoint}`)
  } catch (error) {
    console.error('[Log SQL Injection] Error:', error)
  }
}
