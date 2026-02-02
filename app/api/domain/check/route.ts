import { NextResponse } from "next/server"
import dns from "dns/promises"

export async function POST(req: Request) {
  try {
    const { domain, expectedNS } = await req.json()

    const records = await dns.resolveNs(domain)
    const mismatch = !records.some(ns => expectedNS.includes(ns))

    return NextResponse.json({ records, mismatch })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
