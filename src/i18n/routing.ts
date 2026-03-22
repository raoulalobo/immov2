/**
 * Configuration du routage i18n.
 * Définit les locales supportées et la locale par défaut.
 *
 * Le préfixe de locale est ajouté à l'URL : /fr/search, /en/search
 * La locale par défaut (fr) utilise aussi le préfixe pour la cohérence.
 */
import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
})
