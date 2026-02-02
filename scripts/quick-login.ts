import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Find the first SUPERADMIN user
  const admin = await prisma.user.findFirst({
    where: { role: 'SUPERADMIN' }
  })

  if (admin) {
    console.log('\n✅ Admin user found:')
    console.log('Email:', admin.email)
    console.log('Name:', admin.name)
    console.log('Role:', admin.role)
    console.log('\n🔑 Use these credentials to login at:')
    console.log('http://5.252.54.159:3000/login')
  } else {
    console.log('❌ No admin user found. Creating one...')
    
    const bcrypt = require('bcryptjs')
    const hashedPassword = await bcrypt.hash('Admin@123', 12)
    
    const newAdmin = await prisma.user.create({
      data: {
        name: 'Admin User',
        email: 'admin@wpsystem.com',
        password: hashedPassword,
        role: 'SUPERADMIN',
        status: 'ACTIVE',
        emailVerified: true,
        twoFAEnabled: false
      }
    })
    
    console.log('\n✅ Admin user created:')
    console.log('Email: admin@wpsystem.com')
    console.log('Password: Admin@123')
    console.log('\n🔑 Login at: http://5.252.54.159:3000/login')
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
