/**
 * Page d'accueil admin — redirige automatiquement vers /admin/reports.
 *
 * Rôle :
 *   Point d'entrée du panneau d'administration. Redirige immédiatement
 *   vers la file de modération des signalements, qui est la vue par
 *   défaut de l'admin.
 *
 * Interactions :
 *   - @/i18n/navigation (redirect) : redirection i18n-aware
 *
 * URL : /[locale]/admin → redirige vers /[locale]/admin/reports
 */
import { redirect } from '@/i18n/navigation'

/**
 * AdminPage — Redirection vers la page des signalements.
 *
 * Cette page ne rend aucun contenu. Elle sert uniquement de point
 * d'entrée qui redirige vers la première section admin (reports).
 * La vérification d'authentification est déjà faite par le layout admin.
 */
export default function AdminPage() {
  redirect({ href: '/admin/reports', locale: 'fr' })
}
