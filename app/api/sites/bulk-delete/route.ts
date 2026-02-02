import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(req: Request) {
  try {
    const { siteIds } = await req.json()
    
    if (!siteIds || !Array.isArray(siteIds)) {
      return NextResponse.json({ error: 'Site IDs required' }, { status: 400 })
    }

    await prisma.site.deleteMany({
      where: {
        id: { in: siteIds }
      }
    })

    return NextResponse.json({ success: true, count: siteIds.length })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
