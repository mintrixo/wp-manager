import { query, queryOne, createDatabase, testConnection, runMigration, initDB } from './db';
import { config } from './config';
import fs from 'fs';
import path from 'path';

export interface InstallationStatus {
  isInstalled: boolean;
  hasAdmin: boolean;
  databaseReady: boolean;
  allTablesExist: boolean;
}

/**
 * Check if system is already installed
 */
export async function checkInstallationStatus(): Promise<InstallationStatus> {
  try {
    // Try to check if installation_log table exists and has completed entries
    try {
      const result = await queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM installation_log WHERE status = "completed" LIMIT 1'
      );
      const isInstalled = (result?.count ?? 0) > 0;

      // Check if admin user exists
      const adminExists = await queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM users WHERE role = "super_admin"'
      );

      return {
        isInstalled,
        hasAdmin: (adminExists?.count ?? 0) > 0,
        databaseReady: true,
        allTablesExist: true,
      };
    } catch (error) {
      // Database likely not initialized yet
      return {
        isInstalled: false,
        hasAdmin: false,
        databaseReady: false,
        allTablesExist: false,
      };
    }
  } catch (error) {
    console.error('[INSTALLATION] Error checking status:', error);
    return {
      isInstalled: false,
      hasAdmin: false,
      databaseReady: false,
      allTablesExist: false,
    };
  }
}

/**
 * Setup database connection and run migrations
 */
export async function setupDatabase(): Promise<{ success: boolean; message: string }> {
  try {
    // Test connection
    const connectionOk = await testConnection(config.database);
    if (!connectionOk) {
      return { success: false, message: 'Failed to connect to database' };
    }

    // Create database if needed
    const dbCreated = await createDatabase(config.database);
    if (!dbCreated) {
      return { success: false, message: 'Failed to create database' };
    }

    // Initialize connection pool
    await initDB(config.database);

    // Read migration file
    const migrationPath = path.join(process.cwd(), 'scripts', 'init-db.sql');
    if (!fs.existsSync(migrationPath)) {
      return { success: false, message: 'Migration file not found' };
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Run migration
    const migrationOk = await runMigration(config.database, migrationSQL);
    if (!migrationOk) {
      return { success: false, message: 'Failed to run migration' };
    }

    // Mark installation as in progress
    await query(
      'INSERT INTO installation_log (status, installed_at) VALUES ("in_progress", NOW()) ON DUPLICATE KEY UPDATE status = "in_progress"'
    );

    return { success: true, message: 'Database setup completed' };
  } catch (error) {
    return {
      success: false,
      message: `Database setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Mark installation as complete
 */
export async function completeInstallation(adminId: string): Promise<boolean> {
  try {
    await query('UPDATE installation_log SET status = "completed", admin_id = ? WHERE status = "in_progress"', [
      adminId,
    ]);
    return true;
  } catch (error) {
    console.error('[INSTALLATION] Failed to mark installation complete:', error);
    return false;
  }
}

/**
 * Validate configuration
 */
export function validateInstallationConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check environment variables
  if (!process.env.ENCRYPTION_KEY) {
    errors.push('ENCRYPTION_KEY environment variable is not set');
  }

  if (!process.env.JWT_SECRET) {
    errors.push('JWT_SECRET environment variable is not set');
  }

  if (!process.env.SESSION_SECRET) {
    errors.push('SESSION_SECRET environment variable is not set');
  }

  if (!process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
    errors.push('NEXT_PUBLIC_RECAPTCHA_SITE_KEY environment variable is not set');
  }

  if (!process.env.RECAPTCHA_SECRET_KEY) {
    errors.push('RECAPTCHA_SECRET_KEY environment variable is not set');
  }

  // Check database config
  if (!config.database.host) {
    errors.push('DB_HOST is not configured');
  }

  if (!config.database.user) {
    errors.push('DB_USER is not configured');
  }

  if (!config.database.database) {
    errors.push('DB_NAME is not configured');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get installation requirements
 */
export async function getInstallationRequirements(): Promise<{
  nodeVersion: string;
  databaseVersion?: string;
  canConnect: boolean;
  requirements: Array<{ name: string; status: 'ok' | 'warning' | 'error'; message: string }>;
}> {
  const requirements: Array<{ name: string; status: 'ok' | 'warning' | 'error'; message: string }> = [];

  // Node.js version
  const nodeVersion = process.version;
  requirements.push({
    name: 'Node.js',
    status: 'ok',
    message: `Version: ${nodeVersion}`,
  });

  // Environment variables
  const envVars = ['ENCRYPTION_KEY', 'JWT_SECRET', 'SESSION_SECRET', 'NEXT_PUBLIC_RECAPTCHA_SITE_KEY'];
  for (const envVar of envVars) {
    const status = process.env[envVar] ? 'ok' : 'error';
    requirements.push({
      name: `Environment: ${envVar}`,
      status: status as 'ok' | 'error',
      message: status === 'ok' ? 'Set' : 'Missing',
    });
  }

  // Database connection
  let canConnect = false;
  let databaseVersion: string | undefined;

  try {
    const connectionOk = await testConnection(config.database);
    if (connectionOk) {
      canConnect = true;
      requirements.push({
        name: 'Database Connection',
        status: 'ok',
        message: `Connected to ${config.database.host}:${config.database.port}`,
      });

      // Try to get MySQL version
      try {
        const result = await queryOne<{ version: string }>('SELECT VERSION() as version');
        databaseVersion = result?.version;
      } catch {}
    } else {
      requirements.push({
        name: 'Database Connection',
        status: 'error',
        message: 'Cannot connect to database',
      });
    }
  } catch (error) {
    requirements.push({
      name: 'Database Connection',
      status: 'error',
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }

  // Writable directories
  try {
    const dirs = [process.cwd()];
    for (const dir of dirs) {
      try {
        const testFile = path.join(dir, '.write-test');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
      } catch {
        requirements.push({
          name: 'File System Permissions',
          status: 'error',
          message: `Cannot write to ${dir}`,
        });
      }
    }

    if (!requirements.some((r) => r.name === 'File System Permissions')) {
      requirements.push({
        name: 'File System Permissions',
        status: 'ok',
        message: 'Writable directories confirmed',
      });
    }
  } catch {}

  return {
    nodeVersion,
    databaseVersion,
    canConnect,
    requirements,
  };
}
