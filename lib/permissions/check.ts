import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function canManageSites(userId: number): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })
  
  return user?.role === 'SUPERADMIN'
}

export async function canViewSite(userId: number, siteId: number): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      teams: {
        select: {
          teamId: true,
          approved: true
        }
      }
    }
  })

  if (!user) return false
  if (user.role === 'SUPERADMIN') return true

  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { teamId: true }
  })

  if (!site) return false

  const approvedTeamIds = user.teams
    .filter(ut => ut.approved)
    .map(ut => ut.teamId)

  return site.teamId ? approvedTeamIds.includes(site.teamId) : false
}

export async function canManageTeam(userId: number, teamId: number): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      teams: {
        where: {
          teamId,
          approved: true
        },
        select: {
          role: true
        }
      }
    }
  })

  if (!user) return false
  if (user.role === 'SUPERADMIN') return true

  return user.teams.some(ut => ut.role === 'TEAMADMIN')
}
