import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const siteId = parseInt(params.id)

    const site = await prisma.site.findUnique({
      where: { id: siteId },
      include: {
        team: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    return NextResponse.json({ site })
  } catch (error: any) {
    console.error('[Site Detail API] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to load site details',
      details: error.message 
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const siteId = parseInt(params.id)
    const body = await req.json()

    const updatedSite = await prisma.site.update({
      where: { id: siteId },
      data: {
        name: body.name,
        url: body.url,
        wpAdminUrl: body.wpAdminUrl,
        status: body.status,
        teamId: body.teamId ? parseInt(body.teamId) : null
      },
      include: {
        team: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json({ site: updatedSite })
  } catch (error: any) {
    console.error('[Update Site] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const siteId = parseInt(params.id)

    await prisma.site.delete({
      where: { id: siteId }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Delete Site] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
