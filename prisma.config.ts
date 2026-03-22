/**
 * Configuration Prisma 7 — définit la connexion à la base de données.
 * L'URL est lue depuis la variable d'environnement DATABASE_URL.
 */
import path from 'node:path'
import { defineConfig } from 'prisma/config'
import 'dotenv/config'

export default defineConfig({
  // Chemin vers le schéma Prisma
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  // URL de connexion pour toutes les commandes CLI (db push, pull, studio)
  datasource: {
    url: process.env.DIRECT_URL!,
  },
  // URL spécifique pour les migrations
  migrate: {
    url: process.env.DIRECT_URL!,
  },
})
