import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const userId = parseInt(params.id)

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        team: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error: any) {
    console.error('[Admin] Error fetching user:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const userId = parseInt(params.id)
    const { name, email, role, password, teamId } = await req.json()

    const updateData: any = {
      name,
      email,
      role
    }

    // Handle team assignment
    if (teamId) {
      updateData.teamId = parseInt(teamId)
    } else if (teamId === '' || teamId === null) {
      updateData.teamId = null
    }

    // Only update password if provided
    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10)
      updateData.password = hashedPassword
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        team: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    console.log('[Admin] User updated:', user.email)

    return NextResponse.json({ success: true, user })
  } catch (error: any) {
    console.error('[Admin] Error updating user:', error)
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
    const params = await context.params
    const userId = parseInt(params.id)

    console.log('[Admin] Deleting user ID:', userId)

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent deleting SUPERADMIN
    if (user.role === 'SUPERADMIN') {
      return NextResponse.json({ error: 'Cannot delete SUPERADMIN user' }, { status: 403 })
    }

    // Delete user
    await prisma.user.delete({
      where: { id: userId }
    })

    console.log('[Admin] User deleted:', user.email)

    return NextResponse.json({ success: true, message: 'User deleted successfully' })
  } catch (error: any) {
    console.error('[Admin] Error deleting user:', error)
    
    if (error.code === 'P2003') {
      return NextResponse.json({ 
        error: 'Cannot delete user: User has associated data. Please remove associations first.' 
      }, { status: 400 })
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
