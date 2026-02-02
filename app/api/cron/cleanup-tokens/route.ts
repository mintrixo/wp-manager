import { NextResponse } from 'next/server'
import { TokenManager } from '@/lib/tokenManager'

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key'
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const deletedCount = await TokenManager.cleanupExpiredTokens()

    console.log(`[Cron] Cleaned up ${deletedCount} expired tokens`)

    return NextResponse.json({
      success: true,
      deletedCount,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[Cron] Cleanup error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
