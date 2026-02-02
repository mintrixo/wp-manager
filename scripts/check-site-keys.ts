import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const site = await prisma.site.findFirst({
    where: { domain: { contains: 'stackspectra' } }
  })

  console.log('\nSite in Database:')
  console.log('API Key:', site?.apiKey)
  console.log('API Secret:', site?.apiSecret)
}

main().then(() => process.exit(0)).catch(console.error)
