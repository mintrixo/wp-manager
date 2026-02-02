import crypto from 'crypto'

const MASTER_SECRET = process.env.MASTER_SECRET || crypto.randomBytes(64).toString('hex')

export class AdvancedSecurity {
  // Generate HMAC signature for request
  static generateHMAC(data: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(data).digest('hex')
  }

  // Verify HMAC signature
  static verifyHMAC(data: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateHMAC(data, secret)
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  }

  // Generate nonce (number used once)
  static generateNonce(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  // Create signed request payload
  static createSignedRequest(payload: any, apiSecret: string): {
    payload: any
    signature: string
    nonce: string
    timestamp: number
  } {
    const nonce = this.generateNonce()
    const timestamp = Date.now()
    
    const dataToSign = JSON.stringify({
      ...payload,
      nonce,
      timestamp
    })
    
    const signature = this.generateHMAC(dataToSign, apiSecret)
    
    return {
      payload,
      signature,
      nonce,
      timestamp
    }
  }

  // Verify signed request
  static verifySignedRequest(
    payload: any,
    signature: string,
    nonce: string,
    timestamp: number,
    apiSecret: string
  ): { valid: boolean; reason?: string } {
    // Check timestamp (5 minutes max)
    const age = Date.now() - timestamp
    if (age > 300000) {
      return { valid: false, reason: 'Request expired' }
    }

    // Reconstruct data
    const dataToVerify = JSON.stringify({
      ...payload,
      nonce,
      timestamp
    })

    // Verify signature
    if (!this.verifyHMAC(dataToVerify, signature, apiSecret)) {
      return { valid: false, reason: 'Invalid signature' }
    }

    return { valid: true }
  }

  // Generate site-specific encryption key
  static generateSiteKey(siteId: number, apiSecret: string): string {
    return this.generateHMAC(`site_${siteId}`, apiSecret + MASTER_SECRET)
  }

  // IP Whitelist check
  static isIPWhitelisted(ip: string, whitelist: string[]): boolean {
    if (whitelist.length === 0) return true // No whitelist = allow all
    return whitelist.includes(ip)
  }
}
