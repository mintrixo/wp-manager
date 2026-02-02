/**
 * Database Utilities
 * MySQL connection pool and query helpers using mysql2
 */

import mysql, { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { config } from './config';

let pool: Pool | null = null;

/**
 * Initialize database connection pool
 */
export async function initDB(): Promise<Pool> {
  if (pool) {
    return pool;
  }

  try {
    pool = mysql.createPool({
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.name,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });

    // Test connection
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();

    console.log('[DB] Connection pool initialized successfully');
    return pool;
  } catch (error) {
    console.error('[DB] Failed to initialize connection pool:', error);
    throw new Error(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get database pool (initialize if needed)
 */
export async function getDB(): Promise<Pool> {
  if (!pool) {
    return initDB();
  }
  return pool;
}

/**
 * Execute a query and return results
 * Always use parameterized queries to prevent SQL injection
 */
export async function query<T extends RowDataPacket[]>(
  sql: string,
  values?: unknown[]
): Promise<T> {
  const db = await getDB();
  const [results] = await db.execute<T>(sql, values);
  return results;
}

/**
 * Execute a query and return single row
 */
export async function queryOne<T extends RowDataPacket>(
  sql: string,
  values?: unknown[]
): Promise<T | null> {
  const results = await query<T[]>(sql, values);
  return results.length > 0 ? results[0] : null;
}

/**
 * Execute an INSERT and return the insert ID
 */
export async function insert(
  sql: string,
  values?: unknown[]
): Promise<string | number> {
  const db = await getDB();
  const [result] = await db.execute<ResultSetHeader>(sql, values);
  return result.insertId;
}

/**
 * Execute an UPDATE/DELETE and return affected rows
 */
export async function execute(
  sql: string,
  values?: unknown[]
): Promise<number> {
  const db = await getDB();
  const [result] = await db.execute<ResultSetHeader>(sql, values);
  return result.affectedRows;
}

/**
 * Run a transaction with multiple queries
 */
export async function transaction<T>(
  callback: (connection: PoolConnection) => Promise<T>
): Promise<T> {
  const db = await getDB();
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<{
  success: boolean;
  message: string;
  version?: string;
}> {
  try {
    const db = await initDB();
    const [rows] = await db.execute<RowDataPacket[]>('SELECT VERSION() as version');
    return {
      success: true,
      message: 'Database connection successful',
      version: rows[0]?.version,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

/**
 * Create database if not exists (for installation)
 */
export async function createDatabase(): Promise<boolean> {
  try {
    const tempPool = mysql.createPool({
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      waitForConnections: true,
      connectionLimit: 1,
    });

    await tempPool.execute(
      `CREATE DATABASE IF NOT EXISTS \`${config.database.name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await tempPool.end();

    console.log(`[DB] Database '${config.database.name}' created/verified`);
    return true;
  } catch (error) {
    console.error('[DB] Failed to create database:', error);
    return false;
  }
}

/**
 * Run migration SQL
 */
export async function runMigration(migrationSQL: string): Promise<{
  success: boolean;
  message: string;
  tablesCreated?: number;
}> {
  try {
    const db = await getDB();

    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    let tablesCreated = 0;

    for (const statement of statements) {
      try {
        await db.execute(statement);
        if (statement.toUpperCase().includes('CREATE TABLE')) {
          tablesCreated++;
        }
      } catch (error) {
        // Ignore "table already exists" errors
        if (!(error instanceof Error && error.message.includes('already exists'))) {
          throw error;
        }
      }
    }

    console.log(`[DB] Migration completed: ${tablesCreated} tables created/verified`);
    return {
      success: true,
      message: 'Migration completed successfully',
      tablesCreated,
    };
  } catch (error) {
    console.error('[DB] Migration failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Migration failed',
    };
  }
}

/**
 * Check if installation is complete
 */
export async function checkInstallationStatus(): Promise<{
  installed: boolean;
  hasAdmin: boolean;
  tablesExist: boolean;
}> {
  try {
    const db = await getDB();

    // Check if users table exists
    const [tables] = await db.execute<RowDataPacket[]>(
      `SELECT TABLE_NAME FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'`,
      [config.database.name]
    );

    if (tables.length === 0) {
      return { installed: false, hasAdmin: false, tablesExist: false };
    }

    // Check if super admin exists
    const [admins] = await db.execute<RowDataPacket[]>(
      `SELECT id FROM users WHERE role = 'super_admin' LIMIT 1`
    );

    // Check system setting
    const [settings] = await db.execute<RowDataPacket[]>(
      `SELECT setting_value FROM system_settings WHERE setting_key = 'installation_complete'`
    );

    const isComplete = settings.length > 0 && settings[0].setting_value === 'true';

    return {
      installed: isComplete,
      hasAdmin: admins.length > 0,
      tablesExist: true,
    };
  } catch (error) {
    // Database not configured yet
    return { installed: false, hasAdmin: false, tablesExist: false };
  }
}

/**
 * Close database connection pool
 */
export async function closeDB(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('[DB] Connection pool closed');
  }
}

// Export pool for advanced use cases
export { pool };
