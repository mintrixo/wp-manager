import { NextResponse } from "next/server"
import speakeasy from "speakeasy"
import { prisma } from "@/lib/db/prisma"
import { decrypt } from "@/lib/encryption/crypto"

export async function POST(req: Request) {
  try {
    const { userId, token } = await req.json()

    const twoFA = await prisma.user2FA.findUnique({ where: { userId } })

    if (!twoFA) {
      return NextResponse.json({ error: "2FA not setup" }, { status: 400 })
    }

    const secret = decrypt(twoFA.secret)

    const verified = speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token,
    })

    if (!verified) {
      return NextResponse.json({ error: "Invalid code" }, { status: 401 })
    }

    await prisma.user2FA.update({
      where: { userId },
      data: { enabled: true },
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
