/**
 * Check Requirements API
 * Validates all system requirements for installation
 */

import { NextResponse } from 'next/server'
import { config, validateConfig } from '@/lib/config'
import { testConnection } from '@/lib/db'

export async function GET() {
    const checks: Array<{
        name: string
        status: 'passed' | 'failed' | 'warning'
        message: string
        details?: string
    }> = []

    // Check environment variables
    const configValidation = validateConfig()

    // Encryption Key
    if (config.security.encryptionKey && config.security.encryptionKey.length === 64) {
        checks.push({
            name: 'Encryption Key',
            status: 'passed',
            message: 'Configured',
            details: 'AES-256 encryption key is valid'
        })
    } else {
        checks.push({
            name: 'Encryption Key',
            status: 'failed',
            message: 'Invalid or missing',
            details: 'ENCRYPTION_KEY must be 64 hex characters'
        })
    }

    // JWT Secret
    if (config.security.jwtSecret && config.security.jwtSecret.length >= 32) {
        checks.push({
            name: 'JWT Secret',
            status: 'passed',
            message: 'Configured',
            details: 'JWT_SECRET is configured'
        })
    } else {
        checks.push({
            name: 'JWT Secret',
            status: 'failed',
            message: 'Invalid or missing',
            details: 'JWT_SECRET must be at least 32 characters'
        })
    }

    // Session Secret
    if (config.security.sessionSecret && config.security.sessionSecret.length >= 32) {
        checks.push({
            name: 'Session Secret',
            status: 'passed',
            message: 'Configured',
            details: 'SESSION_SECRET is configured'
        })
    } else {
        checks.push({
            name: 'Session Secret',
            status: 'failed',
            message: 'Invalid or missing',
            details: 'SESSION_SECRET must be at least 32 characters'
        })
    }

    // reCAPTCHA
    if (config.recaptcha.siteKey && config.recaptcha.secretKey) {
        checks.push({
            name: 'reCAPTCHA Config',
            status: 'passed',
            message: 'Configured',
            details: 'Both site key and secret key are set'
        })
    } else {
        checks.push({
            name: 'reCAPTCHA Config',
            status: 'warning',
            message: 'Not configured',
            details: 'reCAPTCHA is disabled - recommended for production'
        })
    }

    // Database Configuration
    if (config.database.host && config.database.user && config.database.name) {
        checks.push({
            name: 'Database Config',
            status: 'passed',
            message: 'Configured',
            details: `${config.database.user}@${config.database.host}:${config.database.port}/${config.database.name}`
        })
    } else {
        checks.push({
            name: 'Database Config',
            status: 'failed',
            message: 'Missing configuration',
            details: 'DB_HOST, DB_USER, and DB_NAME are required'
        })
    }

    // Database Connection Test
    try {
        const dbTest = await testConnection()
        if (dbTest.success) {
            checks.push({
                name: 'Database Connection',
                status: 'passed',
                message: 'Connected',
                details: `MySQL version: ${dbTest.version}`
            })
        } else {
            checks.push({
                name: 'Database Connection',
                status: 'failed',
                message: 'Connection failed',
                details: dbTest.message
            })
        }
    } catch (error) {
        checks.push({
            name: 'Database Connection',
            status: 'failed',
            message: 'Connection error',
            details: error instanceof Error ? error.message : 'Unknown error'
        })
    }

    // SMTP (optional)
    if (config.email.enabled) {
        checks.push({
            name: 'Email (SMTP)',
            status: 'passed',
            message: 'Configured',
            details: `SMTP: ${config.email.host}:${config.email.port}`
        })
    } else {
        checks.push({
            name: 'Email (SMTP)',
            status: 'warning',
            message: 'Not configured',
            details: 'Email notifications will be disabled'
        })
    }

    return NextResponse.json({ checks })
}
