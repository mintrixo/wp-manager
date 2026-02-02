import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const sites = await prisma.site.findMany({
    select: {
      id: true,
      domain: true,
      apiKey: true,
      apiSecret: true
    }
  })

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Sites API Credentials')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  sites.forEach(site => {
    console.log(`Site ID: ${site.id}`)
    console.log(`Domain: ${site.domain}`)
    console.log(`API Key: ${site.apiKey || 'NOT SET'}`)
    console.log(`API Secret: ${site.apiSecret || 'NOT SET'}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  })
}

main()
  .then(() => process.exit(0))
  .catch(console.error)
