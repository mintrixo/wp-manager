/**
 * Test Database Connection API
 */

import { NextResponse } from 'next/server'
import { testConnection } from '@/lib/db'

async function handleTestDb() {
    try {
        const result = await testConnection()
        return NextResponse.json(result)
    } catch (error) {
        return NextResponse.json(
            { success: false, message: error instanceof Error ? error.message : 'Connection failed' },
            { status: 500 }
        )
    }
}

export async function GET() {
    return handleTestDb()
}

export async function POST() {
    return handleTestDb()
}
