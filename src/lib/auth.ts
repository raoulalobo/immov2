/**
 * Configuration Better Auth — gestion de l'authentification.
 * Utilise Prisma comme adaptateur de base de données (décision eng review #5).
 *
 * Better Auth gère :
 * - Inscription email/password
 * - Sessions en base de données (table session)
 * - Vérification d'email
 *
 * Usage côté serveur :
 *   import { auth } from '@/lib/auth'
 *   const session = await auth.api.getSession({ headers: req.headers })
 */
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { db } from '@/lib/db'

export const auth = betterAuth({
  // Adaptateur Prisma — source unique pour le schéma (décision eng review #5)
  database: prismaAdapter(db, {
    provider: 'postgresql',
  }),

  // Configuration email/password
  emailAndPassword: {
    enabled: true,
    // Vérification d'email activée pour la confiance
    requireEmailVerification: false, // désactivé au MVP pour simplifier l'onboarding
  },

  // Champs custom sur le modèle User
  user: {
    additionalFields: {
      phone: { type: 'string', required: false },
      role: { type: 'string', defaultValue: 'user' },
      isVendor: { type: 'boolean', defaultValue: false },
      isVerified: { type: 'boolean', defaultValue: false },
      status: { type: 'string', defaultValue: 'active' },
    },
  },

  // Configuration des sessions
  session: {
    // Durée de session : 30 jours (les utilisateurs camerounais
    // ne veulent pas se reconnecter fréquemment)
    expiresIn: 60 * 60 * 24 * 30, // 30 jours en secondes
    updateAge: 60 * 60 * 24,      // rafraîchir le token chaque jour
  },
})

// Type exporté pour usage dans les composants et API Routes
export type Session = typeof auth.$Infer.Session
