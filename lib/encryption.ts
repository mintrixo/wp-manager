/**
 * AES-256-GCM Encryption Utilities
 * Secure encryption for sensitive data (API keys, 2FA secrets, etc.)
 */

import crypto from 'crypto';
import { config } from './config';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * Get encryption key from environment
 */
function getEncryptionKey(): Buffer {
  const key = config.security.encryptionKey;
  if (!key || key.length !== 64) {
    throw new Error('Invalid ENCRYPTION_KEY: must be 64-character hex string');
  }
  return Buffer.from(key, 'hex');
}

/**
 * Encrypt a string using AES-256-GCM
 * @param plaintext - The text to encrypt
 * @returns Encrypted string in format: iv:authTag:ciphertext (all base64)
 */
export function encrypt(plaintext: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:ciphertext
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  } catch (error) {
    console.error('[Encryption] Failed to encrypt:', error);
    throw new Error('Encryption failed');
  }
}

/**
 * Decrypt a string encrypted with AES-256-GCM
 * @param encryptedText - The encrypted string in format: iv:authTag:ciphertext
 * @returns Decrypted plaintext
 */
export function decrypt(encryptedText: string): string {
  try {
    const key = getEncryptionKey();
    const parts = encryptedText.split(':');

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format');
    }

    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const ciphertext = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('[Encryption] Failed to decrypt:', error);
    throw new Error('Decryption failed');
  }
}

/**
 * Generate a secure random string
 * @param length - Length of the random string
 * @returns Random hex string
 */
export function generateRandomString(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
}

/**
 * Generate an API key with prefix
 * @param prefix - Prefix for the API key (e.g., 'sk_')
 * @returns API key like 'sk_abc123...'
 */
export function generateApiKey(prefix: string = 'sk_'): string {
  const randomPart = crypto.randomBytes(24).toString('base64url');
  return `${prefix}${randomPart}`;
}

/**
 * Generate a secure token for password reset, etc.
 * @returns 64-character hex token
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a token for secure storage
 * @param token - Plain token
 * @returns SHA-256 hash of the token
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Verify a token against its hash
 * @param token - Plain token to verify
 * @param hash - Stored hash
 * @returns True if token matches hash
 */
export function verifyToken(token: string, hash: string): boolean {
  const tokenHash = hashToken(token);
  return crypto.timingSafeEqual(
    Buffer.from(tokenHash, 'hex'),
    Buffer.from(hash, 'hex')
  );
}

/**
 * Generate backup codes for 2FA
 * @param count - Number of backup codes to generate
 * @returns Array of backup codes
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric codes
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(code);
  }
  return codes;
}

/**
 * Generate a 6-digit OTP
 * @returns 6-digit OTP string
 */
export function generateOTP(): string {
  const otp = crypto.randomInt(100000, 999999);
  return otp.toString().padStart(6, '0');
}

/**
 * Derive a key from a password (for future use)
 * @param password - User password
 * @param salt - Salt for key derivation
 * @returns Derived key
 */
export function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
}

/**
 * Generate a UUID v4
 * @returns UUID string
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}
