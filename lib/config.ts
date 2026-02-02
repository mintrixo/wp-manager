/**
 * Application Configuration
 * Centralized configuration management with validation
 */

export const config = {
  // Application
  app: {
    name: process.env.NEXT_PUBLIC_APP_NAME || 'WordPress Site Manager',
    version: '1.0.0',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    env: process.env.NODE_ENV || 'development',
    isDev: process.env.NODE_ENV === 'development',
    isProd: process.env.NODE_ENV === 'production',
  },

  // Database
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'wordpress_manager',
    url: process.env.DATABASE_URL,
  },

  // Security
  security: {
    encryptionKey: process.env.ENCRYPTION_KEY || '',
    jwtSecret: process.env.JWT_SECRET || '',
    sessionSecret: process.env.SESSION_SECRET || '',
    bcryptRounds: 10,
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '3', 10),
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION_MINUTES || '15', 10) * 60 * 1000,
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT_MINUTES || '60', 10) * 60 * 1000,
    sessionWarning: parseInt(process.env.SESSION_WARNING_MINUTES || '59', 10) * 60 * 1000,
  },

  // reCAPTCHA
  recaptcha: {
    siteKey: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '',
    secretKey: process.env.RECAPTCHA_SECRET_KEY || '',
    minScore: 0.3,
  },

  // 2FA TOTP
  totp: {
    window: 2,
    step: 30,
    digits: 6,
    backupCodesCount: 10,
  },

  // Email (SMTP)
  email: {
    enabled: !!process.env.SMTP_HOST,
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.SMTP_FROM || 'noreply@wordpress-manager.local',
    fromName: process.env.SMTP_FROM_NAME || 'WordPress Site Manager',
  },

  // Rate Limiting
  rateLimit: {
    auth: parseInt(process.env.RATE_LIMIT_AUTH || '5', 10),
    windowMinutes: parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES || '15', 10),
    general: 100,
  },

  // WordPress
  wordpress: {
    apiTimeout: 30000,
    maxRetries: 3,
    retryDelay: 1000,
  },

  // Beta site detection pattern
  betaSitePattern: /\.gogroth\.com$/i,
};

/**
 * Validate required configuration
 */
export function validateConfig(): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required environment variables
  if (!process.env.ENCRYPTION_KEY) {
    errors.push('ENCRYPTION_KEY is required');
  } else if (process.env.ENCRYPTION_KEY.length !== 64) {
    errors.push('ENCRYPTION_KEY must be a 64-character hex string (256-bit)');
  }

  if (!process.env.JWT_SECRET) {
    errors.push('JWT_SECRET is required');
  } else if (process.env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters');
  }

  if (!process.env.SESSION_SECRET) {
    errors.push('SESSION_SECRET is required');
  } else if (process.env.SESSION_SECRET.length < 32) {
    errors.push('SESSION_SECRET must be at least 32 characters');
  }

  if (!process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
    warnings.push('NEXT_PUBLIC_RECAPTCHA_SITE_KEY not set - reCAPTCHA disabled');
  }

  if (!process.env.RECAPTCHA_SECRET_KEY) {
    warnings.push('RECAPTCHA_SECRET_KEY not set - reCAPTCHA disabled');
  }

  // Database
  if (!config.database.host) {
    errors.push('DB_HOST is required');
  }

  if (!config.database.user) {
    errors.push('DB_USER is required');
  }

  if (!config.database.name) {
    errors.push('DB_NAME is required');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check if installation is complete
 */
export function isInstallationComplete(): boolean {
  // This will be checked against the database in the actual implementation
  return false;
}

/**
 * Get safe configuration for client-side use
 */
export function getClientSafeConfig() {
  return {
    app: config.app,
    recaptcha: {
      siteKey: config.recaptcha.siteKey,
    },
  };
}

export type Config = typeof config;
