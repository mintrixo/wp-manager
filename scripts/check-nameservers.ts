import { PrismaClient } from '@prisma/client'
import { exec } from 'child_process'
import { promisify } from 'util'
import { sendEmail, getDomainNSChangeEmail } from '../lib/email'

const execAsync = promisify(exec)
const prisma = new PrismaClient()

async function getNameservers(domain: string): Promise<string[]> {
  try {
    const { stdout } = await execAsync(`dig +short NS ${domain}`)
    return stdout.trim().split('\n').filter(ns => ns.length > 0).sort()
  } catch (error) {
    console.error(`Failed to get NS for ${domain}:`, error)
    return []
  }
}

async function checkDomainNameservers() {
  console.log('[NS Monitor] Starting nameserver check...')
  
  const domains = await prisma.domainMonitor.findMany()
  
  for (const domain of domains) {
    const currentNS = await getNameservers(domain.domain)
    
    if (currentNS.length === 0) {
      console.log(`[NS Monitor] Failed to retrieve NS for ${domain.domain}`)
      continue
    }
    
    const currentNSStr = JSON.stringify(currentNS)
    const expectedNSStr = domain.expectedNS
    
    if (currentNSStr !== expectedNSStr && !domain.nsChanged) {
      console.log(`[NS Monitor] ⚠️ NS CHANGE DETECTED for ${domain.domain}`)
      console.log(`Expected: ${expectedNSStr}`)
      console.log(`Current: ${currentNSStr}`)
      
      // Update database
      await prisma.domainMonitor.update({
        where: { id: domain.id },
        data: {
          currentNS: currentNSStr,
          nsChanged: true,
          lastChecked: new Date()
        }
      })
      
      // Send email notification
      if (!domain.notificationSent) {
        try {
          const expectedNS = JSON.parse(expectedNSStr)
          
          // Get site owner email
          const site = await prisma.site.findFirst({
            where: { domain: domain.domain },
            include: { team: { include: { users: true } } }
          })
          
          if (site?.team?.users && site.team.users.length > 0) {
            const adminEmails = site.team.users
              .filter(u => u.role === 'SUPERADMIN' || u.role === 'ADMIN')
              .map(u => u.email)
            
            for (const email of adminEmails) {
              await sendEmail(
                email,
                `⚠️ Nameserver Change Detected: ${domain.domain}`,
                getDomainNSChangeEmail(domain.domain, expectedNS, currentNS)
              )
            }
            
            await prisma.domainMonitor.update({
              where: { id: domain.id },
              data: { notificationSent: true }
            })
          }
        } catch (error) {
          console.error(`[NS Monitor] Failed to send notification:`, error)
        }
      }
    } else if (currentNSStr === expectedNSStr && domain.nsChanged) {
      // NS restored to expected values
      console.log(`[NS Monitor] ✅ NS restored for ${domain.domain}`)
      
      await prisma.domainMonitor.update({
        where: { id: domain.id },
        data: {
          nsChanged: false,
          notificationSent: false,
          lastChecked: new Date()
        }
      })
    } else {
      // No change
      await prisma.domainMonitor.update({
        where: { id: domain.id },
        data: { lastChecked: new Date() }
      })
    }
  }
  
  console.log('[NS Monitor] Check completed')
  await prisma.$disconnect()
}

checkDomainNameservers()
