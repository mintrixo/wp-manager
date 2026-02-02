import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(req: Request) {
  try {
    const { requestId, approve } = await req.json()
    
    const request = await prisma.teamRequest.update({
      where: { id: requestId },
      data: {
        status: approve ? 'APPROVED' : 'REJECTED',
        reviewedBy: 1 // Admin user
      }
    })
    
    if (approve) {
      await prisma.userTeam.create({
        data: {
          userId: request.userId,
          teamId: request.teamId,
          role: 'MEMBER',
          approved: true,
          joinedAt: new Date()
        }
      })
      
      // Update user status
      await prisma.user.update({
        where: { id: request.userId },
        data: { status: 'ACTIVE' }
      })
    }
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
