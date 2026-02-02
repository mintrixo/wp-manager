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
