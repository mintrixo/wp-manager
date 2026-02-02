/**
 * Zod Validation Schemas
 * Input validation for all API endpoints
 */

import { z } from 'zod';

// ===========================================
// COMMON PATTERNS
// ===========================================

// Email validation
export const emailSchema = z
    .string()
    .email('Invalid email address')
    .min(5, 'Email too short')
    .max(255, 'Email too long')
    .transform((email) => email.toLowerCase().trim());

// Password validation with security rules
export const passwordSchema = z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .max(128, 'Password too long')
    .refine(
        (password) => /[A-Z]/.test(password),
        'Password must contain at least one uppercase letter'
    )
    .refine(
        (password) => /[a-z]/.test(password),
        'Password must contain at least one lowercase letter'
    )
    .refine(
        (password) => /[0-9]/.test(password),
        'Password must contain at least one number'
    )
    .refine(
        (password) => /[!@#$%^&*(),.?":{}|<>]/.test(password),
        'Password must contain at least one special character'
    );

// Simple password (for login - don't reveal rules)
export const loginPasswordSchema = z.string().min(1, 'Password is required');

// Name validation
export const nameSchema = z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(255, 'Name too long')
    .transform((name) => name.trim());

// URL validation
export const urlSchema = z
    .string()
    .url('Invalid URL')
    .max(512, 'URL too long')
    .refine(
        (url) => url.startsWith('http://') || url.startsWith('https://'),
        'URL must start with http:// or https://'
    );

// Domain validation
export const domainSchema = z
    .string()
    .min(3, 'Domain too short')
    .max(255, 'Domain too long')
    .refine(
        (domain) => /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}$/.test(domain),
        'Invalid domain format'
    )
    .transform((domain) => domain.toLowerCase().trim());

// UUID validation
export const uuidSchema = z.string().uuid('Invalid ID format');

// OTP validation (6 digits)
export const otpSchema = z
    .string()
    .length(6, 'OTP must be 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain only numbers');

// ===========================================
// AUTH SCHEMAS
// ===========================================

export const loginSchema = z.object({
    email: emailSchema,
    password: loginPasswordSchema,
    recaptchaToken: z.string().optional(),
});

export const signupSchema = z.object({
    name: nameSchema,
    email: emailSchema,
    teamId: uuidSchema,
    recaptchaToken: z.string().optional(),
});

export const registerAdminSchema = z.object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
}).refine(
    (data) => data.password === data.confirmPassword,
    { message: 'Passwords do not match', path: ['confirmPassword'] }
);

export const setupPasswordSchema = z.object({
    token: z.string().min(1, 'Token is required'),
    password: passwordSchema,
    confirmPassword: z.string(),
}).refine(
    (data) => data.password === data.confirmPassword,
    { message: 'Passwords do not match', path: ['confirmPassword'] }
);

export const changePasswordSchema = z.object({
    currentPassword: loginPasswordSchema,
    newPassword: passwordSchema,
    confirmPassword: z.string(),
}).refine(
    (data) => data.newPassword === data.confirmPassword,
    { message: 'Passwords do not match', path: ['confirmPassword'] }
);

export const verify2FASchema = z.object({
    code: otpSchema,
    isBackupCode: z.boolean().optional(),
});

// ===========================================
// TEAM SCHEMAS
// ===========================================

export const createTeamSchema = z.object({
    name: z.string().min(2, 'Team name too short').max(255),
    email: emailSchema,
    description: z.string().max(1000).optional(),
    allowedEmailDomains: z.string().optional(), // Comma-separated domains
});

export const updateTeamSchema = createTeamSchema.partial();

export const teamMemberActionSchema = z.object({
    userId: uuidSchema,
    action: z.enum(['approve', 'deny', 'remove', 'change_role']),
    role: z.enum(['team_admin', 'team_member']).optional(),
    notes: z.string().max(500).optional(),
});

// ===========================================
// SITE SCHEMAS
// ===========================================

export const addSiteSchema = z.object({
    url: urlSchema,
    teamId: uuidSchema.optional(), // Optional for super admin
});

export const updateSiteSchema = z.object({
    status: z.enum(['healthy', 'warning', 'error', 'maintenance', 'offline']).optional(),
});

export const configureDomainMonitoringSchema = z.object({
    expectedNameservers: z.array(z.string()).optional(),
    expiryDate: z.string().datetime().optional(),
});

// ===========================================
// SETTINGS SCHEMAS
// ===========================================

export const emailSettingsSchema = z.object({
    smtpHost: z.string().min(1, 'SMTP host is required'),
    smtpPort: z.number().int().min(1).max(65535),
    smtpUser: z.string().optional(),
    smtpPass: z.string().optional(),
    fromEmail: emailSchema,
    fromName: z.string().max(255),
    useSsl: z.boolean().default(false),
    secure: z.boolean().default(true),
});

export const webhookSchema = z.object({
    name: z.string().min(1).max(255),
    url: urlSchema,
    events: z.array(z.string()),
    active: z.boolean().default(true),
});

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Validate and parse input
 * @returns Parsed data or throws ZodError
 */
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
    return schema.parse(data);
}

/**
 * Safe validate - returns result object instead of throwing
 */
export function safeValidateInput<T>(
    schema: z.ZodSchema<T>,
    data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
    const result = schema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, errors: result.error };
}

/**
 * Format Zod errors for API response
 */
export function formatZodErrors(error: z.ZodError): Record<string, string> {
    const formatted: Record<string, string> = {};
    for (const issue of error.issues) {
        const path = issue.path.join('.');
        formatted[path] = issue.message;
    }
    return formatted;
}

// ===========================================
// WEAK PASSWORD DETECTION
// ===========================================

const COMMON_PASSWORDS = [
    'password123', 'admin123456', '123456789012', 'qwerty123456',
    'letmein12345', 'welcome12345', 'password1234', 'admin1234567',
];

const SEQUENTIAL_PATTERNS = [
    '123456', 'abcdef', 'qwerty', '111111', 'aaaaaa',
];

/**
 * Check if password is weak or common
 */
export function isWeakPassword(password: string): { weak: boolean; reason?: string } {
    const lower = password.toLowerCase();

    // Check common passwords
    for (const common of COMMON_PASSWORDS) {
        if (lower.includes(common)) {
            return { weak: true, reason: 'Password contains common pattern' };
        }
    }

    // Check sequential patterns
    for (const pattern of SEQUENTIAL_PATTERNS) {
        if (lower.includes(pattern)) {
            return { weak: true, reason: 'Password contains sequential pattern' };
        }
    }

    // Check for repeated characters
    if (/(.)\1{4,}/.test(password)) {
        return { weak: true, reason: 'Password contains too many repeated characters' };
    }

    return { weak: false };
}

// Type exports
export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type RegisterAdminInput = z.infer<typeof registerAdminSchema>;
export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type AddSiteInput = z.infer<typeof addSiteSchema>;
export type EmailSettingsInput = z.infer<typeof emailSettingsSchema>;
