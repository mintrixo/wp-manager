import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { decrypt } from "@/lib/encryption/crypto"

export async function POST(req: Request) {
  try {
    const { apiKey, plugins, themes } = await req.json()

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

    // Clear existing
    await prisma.sitePlugin.deleteMany({ where: { siteId: site.id } })
    await prisma.siteTheme.deleteMany({ where: { siteId: site.id } })

    // Add new plugins
    for (const [key, plugin] of Object.entries(plugins as any)) {
      await prisma.sitePlugin.create({
        data: {
          siteId: site.id,
          name: plugin.Name,
          version: plugin.Version,
          active: true,
        },
      })
    }

    // Add themes
    for (const [key, theme] of Object.entries(themes as any)) {
      await prisma.siteTheme.create({
        data: {
          siteId: site.id,
          name: key,
          version: theme.get('Version') || '1.0',
          active: false,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
