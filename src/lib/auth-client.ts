/**
 * Client Better Auth — utilisé côté navigateur pour login/register/logout.
 *
 * Usage dans un composant React :
 *   import { authClient } from '@/lib/auth-client'
 *   await authClient.signIn.email({ email, password })
 *   await authClient.signUp.email({ email, password, name })
 *   await authClient.signOut()
 */
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3000',
})
