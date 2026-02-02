import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Check if default team exists
  const existing = await prisma.team.findFirst()
  
  if (!existing) {
    // Get the first admin user
    const admin = await prisma.user.findFirst({
      where: { role: 'SUPERADMIN' }
    })
    
    if (admin) {
      await prisma.team.create({
        data: {
          name: 'Default Team',
          email: admin.email,
          createdBy: admin.id
        }
      })
      console.log('✅ Default team created')
    }
  } else {
    console.log('✅ Team already exists')
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
