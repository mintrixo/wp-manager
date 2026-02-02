/**
 * Activity Logger
 * Immutable audit trail for all user actions
 */

import { generateUUID } from './encryption';
import { execute } from './db';

export type ActionCategory =
  | 'auth'
  | 'user'
  | 'team'
  | 'site'
  | 'plugin'
  | 'theme'
  | 'settings'
  | 'security'
  | 'api';

export interface LogActivityOptions {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  teamId?: string;
  siteId?: string;
  action: string;
  category: ActionCategory;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  deviceType?: string;
  browser?: string;
}

/**
 * Log an activity
 */
export async function logActivity(options: LogActivityOptions): Promise<void> {
  try {
    await execute(
      `INSERT INTO activity_logs 
       (id, user_id, user_email, user_role, team_id, site_id, action, action_category, 
        target_type, target_id, details, ip_address, user_agent, location, device_type, browser)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        generateUUID(),
        options.userId || null,
        options.userEmail || null,
        options.userRole || null,
        options.teamId || null,
        options.siteId || null,
        options.action,
        options.category,
        options.targetType || null,
        options.targetId || null,
        options.details ? JSON.stringify(options.details) : null,
        options.ipAddress || null,
        options.userAgent || null,
        options.location || null,
        options.deviceType || null,
        options.browser || null,
      ]
    );
  } catch (error) {
    // Log to console but don't throw - logging should never break the app
    console.error('[ActivityLog] Failed to log activity:', error);
  }
}

// ===========================================
// COMMON ACTIVITY ACTIONS
// ===========================================

// Auth actions
export const AuthActions = {
  LOGIN: 'user.login',
  LOGOUT: 'user.logout',
  LOGIN_FAILED: 'user.login_failed',
  PASSWORD_CHANGED: 'user.password_changed',
  PASSWORD_RESET_REQUESTED: 'user.password_reset_requested',
  PASSWORD_RESET_COMPLETED: 'user.password_reset_completed',
  ACCOUNT_LOCKED: 'user.account_locked',
  ACCOUNT_UNLOCKED: 'user.account_unlocked',
  TWO_FA_ENABLED: 'user.2fa_enabled',
  TWO_FA_DISABLED: 'user.2fa_disabled',
  TWO_FA_VERIFIED: 'user.2fa_verified',
} as const;

// User actions
export const UserActions = {
  CREATED: 'user.created',
  UPDATED: 'user.updated',
  DELETED: 'user.deleted',
  ROLE_CHANGED: 'user.role_changed',
  STATUS_CHANGED: 'user.status_changed',
  PROFILE_UPDATED: 'user.profile_updated',
} as const;

// Team actions
export const TeamActions = {
  CREATED: 'team.created',
  UPDATED: 'team.updated',
  DELETED: 'team.deleted',
  MEMBER_ADDED: 'team.member_added',
  MEMBER_REMOVED: 'team.member_removed',
  MEMBER_APPROVED: 'team.member_approved',
  MEMBER_DENIED: 'team.member_denied',
  MEMBER_ROLE_CHANGED: 'team.member_role_changed',
} as const;

// Site actions
export const SiteActions = {
  CREATED: 'site.created',
  UPDATED: 'site.updated',
  DELETED: 'site.deleted',
  API_KEY_GENERATED: 'site.api_key_generated',
  API_KEY_REVOKED: 'site.api_key_revoked',
  MAGIC_LOGIN: 'site.magic_login',
  SYNCED: 'site.synced',
  HEALTH_CHECKED: 'site.health_checked',
} as const;

// Plugin actions
export const PluginActions = {
  UPDATED: 'plugin.updated',
  ACTIVATED: 'plugin.activated',
  DEACTIVATED: 'plugin.deactivated',
} as const;

// Theme actions
export const ThemeActions = {
  UPDATED: 'theme.updated',
  ACTIVATED: 'theme.activated',
} as const;

// Settings actions
export const SettingsActions = {
  EMAIL_UPDATED: 'settings.email_updated',
  SECURITY_UPDATED: 'settings.security_updated',
  GENERAL_UPDATED: 'settings.general_updated',
  WEBHOOK_CREATED: 'settings.webhook_created',
  WEBHOOK_UPDATED: 'settings.webhook_updated',
  WEBHOOK_DELETED: 'settings.webhook_deleted',
  DOMAIN_ADDED: 'settings.allowed_domain_added',
  DOMAIN_REMOVED: 'settings.allowed_domain_removed',
} as const;

// Installation actions
export const InstallActions = {
  STARTED: 'install.started',
  DATABASE_CREATED: 'install.database_created',
  TABLES_CREATED: 'install.tables_created',
  ADMIN_CREATED: 'install.admin_created',
  COMPLETED: 'install.completed',
} as const;

/**
 * Helper to extract request metadata
 */
export function extractRequestMetadata(req: Request): {
  ipAddress: string;
  userAgent: string;
} {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const ipAddress = forwarded?.split(',')[0]?.trim() || realIp || '0.0.0.0';
  const userAgent = req.headers.get('user-agent') || '';

  return { ipAddress, userAgent };
}

/**
 * Parse user agent to extract device and browser info
 */
export function parseUserAgent(userAgent: string): {
  deviceType: string;
  browser: string;
} {
  let deviceType = 'desktop';
  let browser = 'unknown';

  // Detect device type
  if (/mobile/i.test(userAgent)) {
    deviceType = 'mobile';
  } else if (/tablet|ipad/i.test(userAgent)) {
    deviceType = 'tablet';
  }

  // Detect browser
  if (/chrome/i.test(userAgent) && !/edge/i.test(userAgent)) {
    browser = 'Chrome';
  } else if (/firefox/i.test(userAgent)) {
    browser = 'Firefox';
  } else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) {
    browser = 'Safari';
  } else if (/edge/i.test(userAgent)) {
    browser = 'Edge';
  } else if (/opera|opr/i.test(userAgent)) {
    browser = 'Opera';
  }

  return { deviceType, browser };
}
