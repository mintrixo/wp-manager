/**
 * Migrate Database API
 * Runs the database migration script
 */

import { NextResponse } from 'next/server'
import { runMigration } from '@/lib/db'
import fs from 'fs'
import path from 'path'

export async function POST() {
    try {
        // Read migration SQL file
        const migrationPath = path.join(process.cwd(), 'scripts', 'init-db.sql')

        if (!fs.existsSync(migrationPath)) {
            return NextResponse.json(
                { success: false, message: 'Migration file not found' },
                { status: 500 }
            )
        }

        const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

        const result = await runMigration(migrationSQL)

        return NextResponse.json(result)
    } catch (error) {
        return NextResponse.json(
            { success: false, message: error instanceof Error ? error.message : 'Migration failed' },
            { status: 500 }
        )
    }
}
