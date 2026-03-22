/**
 * Client Prisma singleton — évite les connexions multiples en dev (hot reload).
 * Utilise l'adapter PostgreSQL (@prisma/adapter-pg) requis par Prisma 7.
 *
 * Usage :
 *   import { db } from '@/lib/db'
 *   const listings = await db.listing.findMany()
 */
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Lazy init — ne crée le client que lors du premier appel
function getDb(): PrismaClient {
  if (!globalForPrisma.prisma) {
    // Adapter pg — se connecte au pooler Supabase via DATABASE_URL
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
    globalForPrisma.prisma = new PrismaClient({ adapter })
  }
  return globalForPrisma.prisma
}

// Proxy qui délègue au client Prisma lazily
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return Reflect.get(getDb(), prop)
  },
})
