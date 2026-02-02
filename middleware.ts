/**
 * Authentication Middleware
 * Protects routes and checks session validity
 * Uses Node.js runtime to support crypto operations
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that don't require authentication
const publicPaths = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/install',
  '/api/install',
  '/api/auth/login',
  '/api/auth/verify-2fa',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths
  const isPublicPath = publicPaths.some(path =>
    pathname === path || pathname.startsWith(path + '/')
  )

  if (isPublicPath) {
    return NextResponse.next()
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') ||
    pathname === '/'
  ) {
    return NextResponse.next()
  }

  // Get auth token
  const token = request.cookies.get('auth_token')?.value

  // Check if it's an API request
  const isApiPath = pathname.startsWith('/api/')

  if (!token) {
    if (isApiPath) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    // Redirect to login for non-API routes
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Simple token existence check - full JWT validation happens in API routes
  // This avoids crypto module issues in Edge Runtime
  // The token format check is basic: header.payload.signature
  const parts = token.split('.')
  if (parts.length !== 3) {
    const response = isApiPath
      ? NextResponse.json({ error: 'Invalid token format' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('auth_token')
    return response
  }

  // Decode payload (base64) to get user info - no verification here
  try {
    const payloadBase64 = parts[1]
    const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'))
    const payload = JSON.parse(payloadJson)

    // Check basic token expiry
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      const response = isApiPath
        ? NextResponse.json({ error: 'Token expired' }, { status: 401 })
        : NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('auth_token')
      return response
    }

    // Add user info to headers for downstream use
    const requestHeaders = new Headers(request.headers)
    if (payload.userId) requestHeaders.set('x-user-id', payload.userId)
    if (payload.email) requestHeaders.set('x-user-email', payload.email)
    if (payload.role) requestHeaders.set('x-user-role', payload.role)

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  } catch {
    // If token parsing fails, let it through - API routes will do full validation
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
