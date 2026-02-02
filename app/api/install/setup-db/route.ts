/**
 * Setup Database API
 * Creates the database if it doesn't exist
 */

import { NextResponse } from 'next/server'
import { createDatabase } from '@/lib/db'

export async function POST() {
    try {
        const success = await createDatabase()

        if (success) {
            return NextResponse.json({
                success: true,
                message: 'Database created successfully'
            })
        } else {
            return NextResponse.json(
                { success: false, message: 'Failed to create database' },
                { status: 500 }
            )
        }
    } catch (error) {
        return NextResponse.json(
            { success: false, message: error instanceof Error ? error.message : 'Database creation failed' },
            { status: 500 }
        )
    }
}
