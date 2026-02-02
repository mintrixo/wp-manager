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
