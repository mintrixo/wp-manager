/**
 * JWT Token Utilities
 * Secure session management with HTTP-only cookies
 */

import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import { config } from './config';
import { hashToken } from './encryption';

export interface TokenPayload {
  userId: string;
  email: string;
  role: 'super_admin' | 'team_admin' | 'team_user';
  sessionId: string;
  iat?: number;
  exp?: number;
}

const JWT_OPTIONS: SignOptions = {
  algorithm: 'HS256',
  expiresIn: '24h',
};

/**
 * Get JWT secret with validation
 */
function getJwtSecret(): string {
  const secret = config.security.jwtSecret;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET is not properly configured');
  }
  return secret;
}

/**
 * Generate a JWT token
 * @param payload - Token payload
 * @returns Signed JWT token
 */
export function generateToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  const secret = getJwtSecret();
  return jwt.sign(payload, secret, JWT_OPTIONS);
}

/**
 * Verify and decode a JWT token
 * @param token - JWT token to verify
 * @returns Decoded payload or null if invalid
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret, {
      algorithms: ['HS256'],
    }) as TokenPayload;
    return decoded;
  } catch (error) {
    console.error('[JWT] Token verification failed:', error);
    return null;
  }
}

/**
 * Decode a token without verification (for debugging)
 * @param token - JWT token
 * @returns Decoded payload or null
 */
export function decodeToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.decode(token) as TokenPayload;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Check if a token is expired
 * @param token - JWT token
 * @returns True if expired
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  return Date.now() >= decoded.exp * 1000;
}

/**
 * Get remaining time until token expiry
 * @param token - JWT token
 * @returns Remaining time in milliseconds, or 0 if expired
 */
export function getTokenExpiryTime(token: string): number {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return 0;
  const remaining = decoded.exp * 1000 - Date.now();
  return remaining > 0 ? remaining : 0;
}

/**
 * Refresh a token (generate new token with same payload)
 * @param token - Current JWT token
 * @returns New token or null if current token is invalid
 */
export function refreshToken(token: string): string | null {
  const decoded = verifyToken(token);
  if (!decoded) return null;

  const { exp, iat, ...payload } = decoded;
  return generateToken(payload);
}

/**
 * Generate session token hash for database storage
 * We store hash of token, not the raw token
 * @param token - JWT token
 * @returns Hash of the token
 */
export function hashSessionToken(token: string): string {
  return hashToken(token);
}

/**
 * Cookie configuration for auth token
 */
export const AUTH_COOKIE_OPTIONS = {
  name: 'auth_token',
  httpOnly: true,
  secure: config.app.isProd,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24, // 24 hours in seconds
};

/**
 * Session cookie configuration
 */
export const SESSION_COOKIE_OPTIONS = {
  name: 'session_id',
  httpOnly: true,
  secure: config.app.isProd,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60, // 1 hour in seconds (session timeout)
};
