import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { verifySession } from "@/lib/security/auth"

export async function GET(req: Request) {
  try {
    // Get user from session (implement your session logic)
    const userId = 1 // Replace with actual session extraction

    const session = await verifySession(userId)
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })

    return NextResponse.json({ user: { id: user?.id, name: user?.name, email: user?.email, role: user?.role } })
  } catch (e: any) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
