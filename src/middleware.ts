/**
 * Middleware Next.js — gère le routage i18n.
 * Redirige automatiquement les URLs sans locale vers la locale par défaut.
 * Ex: /search → /fr/search
 *
 * Les routes API (/api/*) et les fichiers statiques sont exclus.
 */
import createMiddleware from 'next-intl/middleware'
import { routing } from '@/i18n/routing'

export default createMiddleware(routing)

export const config = {
  // Matcher : toutes les routes sauf API, fichiers statiques, et _next
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
