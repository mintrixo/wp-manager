import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Checking for existing admin...')
  
  const existingUser = await prisma.user.findUnique({
    where: { email: 'devopsthreads@gmail.com' }
  })

  if (existingUser) {
    console.log('✅ Admin user already exists!')
    console.log('Email:', existingUser.email)
    console.log('Role:', existingUser.role)
    return
  }

  console.log('❌ No admin found. Creating new admin...')

  const hashedPassword = await bcrypt.hash('Admin@123', 10)

  const user = await prisma.user.create({
    data: {
      name: 'Sunil Kumar',
      email: 'devopsthreads@gmail.com',
      password: hashedPassword,
      role: 'SUPERADMIN',
      status: 'ACTIVE'
    }
  })

  console.log('\n✅ Admin user created successfully!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Email:    devopsthreads@gmail.com')
  console.log('Password: Admin@123')
  console.log('Role:     SUPERADMIN')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('\n⚠️  IMPORTANT: Change this password after first login!')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
