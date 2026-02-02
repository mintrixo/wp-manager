import { PrismaClient } from "@prisma/client"
import { createPool } from "mysql2/promise"

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

const connectionString = process.env.DATABASE_URL!

// Create mysql2 connection pool
const pool = createPool(connectionString)

export const prisma =
  global.prisma ??
  new PrismaClient({
    log: ["error", "warn"],
  })

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma
}
