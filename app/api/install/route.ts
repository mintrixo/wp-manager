import { NextResponse } from 'next/server'
import fs from 'fs'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db/prisma'
import { execSync } from 'child_process'

export async function POST(req: Request) {
  const data = await req.formData()

  const DATABASE_URL = `mysql://${data.get('db_user')}:${data.get('db_pass')}@${data.get('db_host')}:${data.get('db_port')}/${data.get('db_name')}`

  fs.writeFileSync('.env', `DATABASE_URL="${DATABASE_URL}"\nAPP_INSTALLED="true"\n`)

  execSync('npx prisma migrate deploy', { stdio: 'inherit' })

  const hash = await bcrypt.hash(String(data.get('admin_password')), 12)

  await prisma.user.create({
    data: {
      name: String(data.get('admin_name')),
      email: String(data.get('admin_email')),
      password: hash,
      role: 'SUPERADMIN',
      status: 'ACTIVE'
    }
  })

  return NextResponse.json({ ok: true })
}
