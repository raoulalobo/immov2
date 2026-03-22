/**
 * Route API catch-all pour Better Auth.
 * Toutes les requêtes /api/auth/* sont gérées par Better Auth :
 * - POST /api/auth/sign-up/email → inscription
 * - POST /api/auth/sign-in/email → connexion
 * - POST /api/auth/sign-out → déconnexion
 * - GET  /api/auth/get-session → session courante
 */
import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'

export const { GET, POST } = toNextJsHandler(auth)
