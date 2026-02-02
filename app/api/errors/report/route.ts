import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { decrypt } from "@/lib/encryption/crypto"

export async function POST(req: Request) {
  try {
    const { apiKey, severity, message, stack } = await req.json()

    const sites = await prisma.site.findMany()
    const site = sites.find((s) => {
      try {
        return decrypt(s.apiKey) === apiKey
      } catch {
        return false
      }
    })

    if (!site) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 })
    }

    await prisma.siteError.create({
      data: {
        siteId: site.id,
        severity,
        message,
        stack,
      },
    })

    if (severity === "FATAL" || severity === "CRITICAL") {
      await prisma.site.update({
        where: { id: site.id },
        data: { status: "ERROR" },
      })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
