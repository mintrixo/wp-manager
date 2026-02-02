import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex')
const ALGORITHM = 'aes-256-gcm'

export function encryptToken(token: string): { encrypted: string; iv: string; tag: string } {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv)
  
  let encrypted = cipher.update(token, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const authTag = cipher.getAuthTag()
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: authTag.toString('hex')
  }
}

export function decryptToken(encrypted: string, iv: string, tag: string): string {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    Buffer.from(iv, 'hex')
  )
  
  decipher.setAuthTag(Buffer.from(tag, 'hex'))
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}

export function generateSecureToken(): string {
  const timestamp = Date.now()
  const randomPart = crypto.randomBytes(16).toString('hex')
  const hash = crypto.createHash('sha256').update(`${timestamp}_${randomPart}`).digest('hex')
  return `${timestamp}_${hash.substring(0, 12)}`
}

export function isTokenExpired(token: string, expiryMinutes: number = 30): boolean {
  const timestamp = parseInt(token.split('_')[0])
  const expiryTime = timestamp + (expiryMinutes * 60 * 1000)
  return Date.now() > expiryTime
}
