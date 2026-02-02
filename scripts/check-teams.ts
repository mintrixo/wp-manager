import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const teams = await prisma.team.findMany()
  
  console.log('\n📊 Teams in database:', teams.length)
  
  if (teams.length > 0) {
    console.log('\n✅ Teams:')
    teams.forEach(team => {
      console.log(`  - ${team.name} (${team.email}) - ID: ${team.id}`)
    })
  } else {
    console.log('\n❌ No teams found in database')
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
