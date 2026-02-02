import { NextResponse } from "next/server"
import speakeasy from "speakeasy"
import QRCode from "qrcode"
import { prisma } from "@/lib/db/prisma"
import { encrypt } from "@/lib/encryption/crypto"

export async function POST(req: Request) {
  try {
    const { userId } = await req.json()

    const secret = speakeasy.generateSecret({ name: "WP Dashboard" })
    const qrCode = await QRCode.toDataURL(secret.otpauth_url!)

    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () =>
      Math.random().toString(36).substring(2, 10).toUpperCase()
    )

    await prisma.user2FA.create({
      data: {
        userId,
        secret: encrypt(secret.base32),
        enabled: false,
        backupCodes: encrypt(JSON.stringify(backupCodes)),
      },
    })

    return NextResponse.json({ qrCode, secret: secret.base32, backupCodes })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
