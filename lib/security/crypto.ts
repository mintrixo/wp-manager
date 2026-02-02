import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || ''

// Skip validation during build time
if (process.env.NODE_ENV === 'production' && ENCRYPTION_KEY && ENCRYPTION_KEY.length !== 64) {
  throw new Error('ENCRYPTION_KEY must be a 64-character hex string (256-bit key). Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"')
}

export function encrypt(text: string): string {
  if (!ENCRYPTION_KEY) return text
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

export function decrypt(text: string): string {
  if (!ENCRYPTION_KEY) return text
  const parts = text.split(':')
  const iv = Buffer.from(parts.shift()!, 'hex')
  const encryptedText = parts.join(':')
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv)
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}
