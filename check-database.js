const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Check all users and their roles
  const users = await prisma.user.findMany({
    include: { teams: true }
  })
  
  console.log('\n👥 All Users:')
  users.forEach(user => {
    console.log(`  - ${user.email}`)
    console.log(`    Role: ${user.role}`)
    console.log(`    Teams: ${user.teams.length}`)
  })
  
  // Check all sites
  const sites = await prisma.site.findMany()
  console.log(`\n🌐 Total Sites in Database: ${sites.length}`)
  sites.forEach(site => {
    console.log(`  - ${site.domain || 'Unnamed'} (ID: ${site.id}, Team: ${site.teamId})`)
  })
  
  // Check schema for Role enum values
  console.log('\n📋 Checking Prisma schema for Role enum...')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
