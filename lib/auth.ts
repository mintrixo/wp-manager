/**
 * Authentication Utilities
 * Helpers for password hashing, 2FA, and session management
 */

import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { config } from './config';
import { encrypt, decrypt, generateBackupCodes, generateUUID, hashToken } from './encryption';
import { query, queryOne, execute, transaction } from './db';
import { RowDataPacket } from 'mysql2';

// ===========================================
// PASSWORD UTILITIES
// ===========================================

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, config.security.bcryptRounds);
}

/**
 * Verify a password against its hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

// ===========================================
// 2FA UTILITIES
// ===========================================

interface TOTPSecret {
    base32: string;
    otpauth_url: string;
}

/**
 * Generate TOTP secret for 2FA setup
 */
export function generateTOTPSecret(userEmail: string): TOTPSecret {
    const secret = speakeasy.generateSecret({
        name: `${config.app.name}:${userEmail}`,
        issuer: config.app.name,
        length: 32,
    });

    return {
        base32: secret.base32,
        otpauth_url: secret.otpauth_url || '',
    };
}

/**
 * Generate QR code data URL for 2FA setup
 */
export async function generateQRCode(otpauthUrl: string): Promise<string> {
    return QRCode.toDataURL(otpauthUrl);
}

/**
 * Verify a TOTP code
 */
export function verifyTOTP(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: config.totp.window,
    });
}

/**
 * Setup 2FA for a user
 * @returns QR code URL and backup codes
 */
export async function setup2FA(userId: string, userEmail: string): Promise<{
    qrCodeUrl: string;
    manualKey: string;
    backupCodes: string[];
}> {
    const secret = generateTOTPSecret(userEmail);
    const qrCodeUrl = await generateQRCode(secret.otpauth_url);
    const backupCodes = generateBackupCodes(config.totp.backupCodesCount);

    // Encrypt and store (but don't enable yet)
    const encryptedSecret = encrypt(secret.base32);
    const encryptedBackupCodes = encrypt(JSON.stringify(backupCodes));

    // Check if 2FA record exists
    const existing = await queryOne<RowDataPacket>(
        'SELECT id FROM user_2fa WHERE user_id = ?',
        [userId]
    );

    if (existing) {
        await execute(
            `UPDATE user_2fa SET secret_encrypted = ?, backup_codes_encrypted = ?, enabled = FALSE, updated_at = NOW() WHERE user_id = ?`,
            [encryptedSecret, encryptedBackupCodes, userId]
        );
    } else {
        await execute(
            `INSERT INTO user_2fa (id, user_id, secret_encrypted, backup_codes_encrypted, enabled) VALUES (?, ?, ?, ?, FALSE)`,
            [generateUUID(), userId, encryptedSecret, encryptedBackupCodes]
        );
    }

    return {
        qrCodeUrl,
        manualKey: secret.base32,
        backupCodes,
    };
}

/**
 * Enable 2FA after verification
 */
export async function enable2FA(userId: string, code: string): Promise<boolean> {
    const twoFA = await queryOne<RowDataPacket>(
        'SELECT secret_encrypted FROM user_2fa WHERE user_id = ?',
        [userId]
    );

    if (!twoFA) {
        return false;
    }

    const secret = decrypt(twoFA.secret_encrypted);
    const isValid = verifyTOTP(secret, code);

    if (isValid) {
        await execute(
            'UPDATE user_2fa SET enabled = TRUE, updated_at = NOW() WHERE user_id = ?',
            [userId]
        );
    }

    return isValid;
}

/**
 * Verify 2FA code (TOTP or backup code)
 */
export async function verify2FACode(
    userId: string,
    code: string,
    isBackupCode: boolean = false
): Promise<boolean> {
    const twoFA = await queryOne<RowDataPacket>(
        'SELECT secret_encrypted, backup_codes_encrypted, enabled FROM user_2fa WHERE user_id = ?',
        [userId]
    );

    if (!twoFA || !twoFA.enabled) {
        return false;
    }

    if (isBackupCode) {
        // Verify backup code
        const backupCodes: string[] = JSON.parse(decrypt(twoFA.backup_codes_encrypted));
        const codeIndex = backupCodes.indexOf(code.toUpperCase());

        if (codeIndex === -1) {
            return false;
        }

        // Remove used backup code
        backupCodes.splice(codeIndex, 1);
        const newEncryptedCodes = encrypt(JSON.stringify(backupCodes));
        await execute(
            'UPDATE user_2fa SET backup_codes_encrypted = ?, updated_at = NOW() WHERE user_id = ?',
            [newEncryptedCodes, userId]
        );

        return true;
    } else {
        // Verify TOTP
        const secret = decrypt(twoFA.secret_encrypted);
        return verifyTOTP(secret, code);
    }
}

/**
 * Disable 2FA
 */
export async function disable2FA(userId: string): Promise<void> {
    await execute('DELETE FROM user_2fa WHERE user_id = ?', [userId]);
}

/**
 * Check if user has 2FA enabled
 */
export async function has2FAEnabled(userId: string): Promise<boolean> {
    const result = await queryOne<RowDataPacket>(
        'SELECT enabled FROM user_2fa WHERE user_id = ?',
        [userId]
    );
    return result?.enabled === true || result?.enabled === 1;
}

// ===========================================
// SESSION UTILITIES
// ===========================================

export interface SessionData {
    id: string;
    userId: string;
    ipAddress: string;
    userAgent: string;
    location: string;
    deviceType: string;
    browser: string;
    lastActivity: Date;
    expiresAt: Date;
}

/**
 * Create a new session
 */
export async function createSession(
    userId: string,
    tokenHash: string,
    metadata: {
        ipAddress: string;
        userAgent: string;
        location?: string;
        deviceType?: string;
        browser?: string;
    }
): Promise<string> {
    const sessionId = generateUUID();
    const expiresAt = new Date(Date.now() + config.security.sessionTimeout);

    await execute(
        `INSERT INTO user_sessions (id, user_id, token_hash, ip_address, user_agent, location, device_type, browser, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            sessionId,
            userId,
            tokenHash,
            metadata.ipAddress,
            metadata.userAgent,
            metadata.location || null,
            metadata.deviceType || null,
            metadata.browser || null,
            expiresAt,
        ]
    );

    return sessionId;
}

/**
 * Update session last activity
 */
export async function updateSessionActivity(sessionId: string): Promise<void> {
    const newExpiry = new Date(Date.now() + config.security.sessionTimeout);
    await execute(
        'UPDATE user_sessions SET last_activity = NOW(), expires_at = ? WHERE id = ?',
        [newExpiry, sessionId]
    );
}

/**
 * Get active sessions for a user
 */
export async function getUserSessions(userId: string): Promise<SessionData[]> {
    const sessions = await query<RowDataPacket[]>(
        `SELECT id, user_id as userId, ip_address as ipAddress, user_agent as userAgent, 
            location, device_type as deviceType, browser, last_activity as lastActivity, expires_at as expiresAt
     FROM user_sessions 
     WHERE user_id = ? AND expires_at > NOW()
     ORDER BY last_activity DESC`,
        [userId]
    );
    return sessions as SessionData[];
}

/**
 * Invalidate a session
 */
export async function invalidateSession(sessionId: string): Promise<void> {
    await execute('DELETE FROM user_sessions WHERE id = ?', [sessionId]);
}

/**
 * Invalidate all sessions for a user (except current)
 */
export async function invalidateAllSessions(
    userId: string,
    exceptSessionId?: string
): Promise<void> {
    if (exceptSessionId) {
        await execute(
            'DELETE FROM user_sessions WHERE user_id = ? AND id != ?',
            [userId, exceptSessionId]
        );
    } else {
        await execute('DELETE FROM user_sessions WHERE user_id = ?', [userId]);
    }
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<number> {
    const result = await execute('DELETE FROM user_sessions WHERE expires_at < NOW()');
    return result;
}

// ===========================================
// BRUTE FORCE PROTECTION
// ===========================================

/**
 * Record a login attempt
 */
export async function recordLoginAttempt(
    email: string,
    ipAddress: string,
    success: boolean,
    userId?: string,
    reason?: string,
    metadata?: {
        userAgent?: string;
        location?: string;
        deviceType?: string;
        browser?: string;
    }
): Promise<void> {
    await execute(
        `INSERT INTO login_logs (id, user_id, email, ip_address, user_agent, location, device_type, browser, success, reason)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            generateUUID(),
            userId || null,
            email,
            ipAddress,
            metadata?.userAgent || null,
            metadata?.location || null,
            metadata?.deviceType || null,
            metadata?.browser || null,
            success,
            reason || null,
        ]
    );

    // Update user failed attempts if login failed
    if (!success && userId) {
        await execute(
            `UPDATE users SET failed_login_attempts = failed_login_attempts + 1, last_failed_login = NOW() WHERE id = ?`,
            [userId]
        );
    } else if (success && userId) {
        // Reset failed attempts on successful login
        await execute(
            'UPDATE users SET failed_login_attempts = 0, last_failed_login = NULL, locked_until = NULL WHERE id = ?',
            [userId]
        );
    }
}

/**
 * Check if account is locked
 */
export async function isAccountLocked(userId: string): Promise<{
    locked: boolean;
    lockedUntil?: Date;
    remainingAttempts?: number;
}> {
    const user = await queryOne<RowDataPacket>(
        'SELECT failed_login_attempts, locked_until FROM users WHERE id = ?',
        [userId]
    );

    if (!user) {
        return { locked: false };
    }

    // Check if currently locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
        return {
            locked: true,
            lockedUntil: new Date(user.locked_until),
        };
    }

    // Check if should be locked
    if (user.failed_login_attempts >= config.security.maxLoginAttempts) {
        const lockedUntil = new Date(Date.now() + config.security.lockoutDuration);
        await execute('UPDATE users SET locked_until = ? WHERE id = ?', [lockedUntil, userId]);
        return { locked: true, lockedUntil };
    }

    return {
        locked: false,
        remainingAttempts: config.security.maxLoginAttempts - user.failed_login_attempts,
    };
}

// ===========================================
// SECURITY LOGGING
// ===========================================

export type SecurityEventType =
    | 'login_success'
    | 'login_failed'
    | 'logout'
    | 'account_locked'
    | 'password_changed'
    | '2fa_enabled'
    | '2fa_disabled'
    | 'suspicious_activity'
    | 'sql_injection_attempt'
    | 'brute_force_detected';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Log a security event
 */
export async function logSecurityEvent(
    eventType: SecurityEventType,
    description: string,
    options: {
        userId?: string;
        ipAddress?: string;
        userAgent?: string;
        severity?: Severity;
    } = {}
): Promise<void> {
    await execute(
        `INSERT INTO security_events (id, user_id, event_type, event_description, ip_address, user_agent, severity)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            generateUUID(),
            options.userId || null,
            eventType,
            description,
            options.ipAddress || null,
            options.userAgent || null,
            options.severity || 'medium',
        ]
    );
}
