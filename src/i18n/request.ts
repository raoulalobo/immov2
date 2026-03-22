/**
 * Configuration next-intl côté serveur.
 * Charge les messages de traduction pour la locale active.
 *
 * Appelé automatiquement par next-intl pour chaque requête serveur.
 */
import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'

export default getRequestConfig(async ({ requestLocale }) => {
  // Récupère la locale depuis l'URL (ex: /fr/search → 'fr')
  let locale = await requestLocale

  // Fallback sur la locale par défaut si invalide
  if (!locale || !routing.locales.includes(locale as 'fr' | 'en')) {
    locale = routing.defaultLocale
  }

  return {
    locale,
    messages: (await import(`@/messages/${locale}.json`)).default,
  }
})
