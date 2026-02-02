/**
 * Check Requirements API
 * Validates all system requirements for installation
 */

import { NextResponse } from 'next/server'
import { config } from '@/lib/config'
import { testConnection } from '@/lib/db'

export async function GET() {
    const requirements: Array<{
        name: string
        description: string
        status: 'pass' | 'fail' | 'warning'
        message?: string
    }> = []

    // Encryption Key
    if (config.security.encryptionKey && config.security.encryptionKey.length === 64) {
        requirements.push({
            name: 'Encryption Key',
            description: 'AES-256 encryption key is valid',
            status: 'pass',
            message: 'Configured'
        })
    } else {
        requirements.push({
            name: 'Encryption Key',
            description: 'ENCRYPTION_KEY must be 64 hex characters',
            status: 'fail',
            message: 'Invalid or missing'
        })
    }

    // JWT Secret
    if (config.security.jwtSecret && config.security.jwtSecret.length >= 32) {
        requirements.push({
            name: 'JWT Secret',
            description: 'JWT_SECRET is configured',
            status: 'pass',
            message: 'Configured'
        })
    } else {
        requirements.push({
            name: 'JWT Secret',
            description: 'JWT_SECRET must be at least 32 characters',
            status: 'fail',
            message: 'Invalid or missing'
        })
    }

    // Session Secret
    if (config.security.sessionSecret && config.security.sessionSecret.length >= 32) {
        requirements.push({
            name: 'Session Secret',
            description: 'SESSION_SECRET is configured',
            status: 'pass',
            message: 'Configured'
        })
    } else {
        requirements.push({
            name: 'Session Secret',
            description: 'SESSION_SECRET must be at least 32 characters',
            status: 'fail',
            message: 'Invalid or missing'
        })
    }

    // reCAPTCHA
    if (config.recaptcha.siteKey && config.recaptcha.secretKey) {
        requirements.push({
            name: 'reCAPTCHA Config',
            description: 'Both site key and secret key are set',
            status: 'pass',
            message: 'Configured'
        })
    } else {
        requirements.push({
            name: 'reCAPTCHA Config',
            description: 'reCAPTCHA is disabled - recommended for production',
            status: 'warning',
            message: 'Not configured'
        })
    }

    // Database Configuration
    if (config.database.host && config.database.user && config.database.name) {
        requirements.push({
            name: 'Database Config',
            description: `${config.database.user}@${config.database.host}:${config.database.port}/${config.database.name}`,
            status: 'pass',
            message: 'Configured'
        })
    } else {
        requirements.push({
            name: 'Database Config',
            description: 'DB_HOST, DB_USER, and DB_NAME are required',
            status: 'fail',
            message: 'Missing configuration'
        })
    }

    // Database Connection Test
    try {
        const dbTest = await testConnection()
        if (dbTest.success) {
            requirements.push({
                name: 'Database Connection',
                description: `MySQL version: ${dbTest.version}`,
                status: 'pass',
                message: 'Connected'
            })
        } else {
            requirements.push({
                name: 'Database Connection',
                description: dbTest.message || 'Connection failed',
                status: 'fail',
                message: 'Connection failed'
            })
        }
    } catch (error) {
        requirements.push({
            name: 'Database Connection',
            description: error instanceof Error ? error.message : 'Unknown error',
            status: 'fail',
            message: 'Connection error'
        })
    }

    // SMTP (optional)
    if (config.email.enabled) {
        requirements.push({
            name: 'Email (SMTP)',
            description: `SMTP: ${config.email.host}:${config.email.port}`,
            status: 'pass',
            message: 'Configured'
        })
    } else {
        requirements.push({
            name: 'Email (SMTP)',
            description: 'Email notifications will be disabled',
            status: 'warning',
            message: 'Not configured'
        })
    }

    return NextResponse.json({ requirements })
}
