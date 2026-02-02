import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    
    // Forward to global plugin endpoint
    return fetch(`${url.origin}/api/mu-plugin/global`, {
      method: 'GET'
    })
  } catch (error: any) {
    console.error('[Download MU Plugin] Error:', error)
    return new NextResponse(error.message, { status: 500 })
  }
}
