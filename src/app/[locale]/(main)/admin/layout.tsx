/**
 * Layout du panneau d'administration — protège toutes les pages admin.
 *
 * Rôle :
 *   - Vérifier l'authentification et le rôle 'admin' côté serveur
 *   - Rediriger vers la page d'accueil si l'utilisateur n'est pas admin
 *   - Afficher une barre latérale de navigation avec 4 liens :
 *     Signalements, Vérification, Annonces, Utilisateurs
 *   - Responsive : la sidebar devient une barre de navigation horizontale sur mobile
 *
 * Interactions :
 *   - Better Auth (auth) : récupération de la session serveur via les headers
 *   - next-intl : traductions pour les labels de navigation
 *   - next/headers : accès aux headers de la requête pour l'auth côté serveur
 *   - @/i18n/navigation : Link et redirect i18n-aware
 *
 * Ce layout enveloppe toutes les pages sous /[locale]/(main)/admin/*
 */
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { redirect } from '@/i18n/navigation'
import { getTranslations } from 'next-intl/server'
import { AdminSidebar } from './admin-sidebar'

/**
 * AdminLayout — Layout serveur pour l'espace d'administration.
 *
 * Flux :
 *   1. Récupérer les headers de la requête (nécessaire pour l'auth côté serveur)
 *   2. Vérifier la session Better Auth
 *   3. Si pas de session ou rôle != 'admin', rediriger vers /
 *   4. Afficher la sidebar + le contenu enfant
 *
 * @param children - Pages admin rendues dans la zone de contenu principale
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // --- 1. Récupérer la session côté serveur ---
  // On utilise les headers de la requête pour que Better Auth identifie l'utilisateur
  const requestHeaders = await headers()
  const session = await auth.api.getSession({ headers: requestHeaders })

  // --- 2. Vérifier l'authentification et le rôle admin ---
  // Si l'utilisateur n'est pas connecté ou n'est pas admin, on le redirige
  // vers la page d'accueil. C'est la couche de sécurité principale côté serveur.
  if (!session?.user || session.user.role !== 'admin') {
    redirect({ href: '/', locale: 'fr' })
  }

  // --- 3. Récupérer les traductions pour la sidebar ---
  const t = await getTranslations('admin')

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1280px] flex-col md:flex-row">
      {/* Sidebar de navigation admin — composant client pour la gestion du lien actif */}
      <AdminSidebar
        labels={{
          title: t('title'),
          reports: t('sidebar.reports'),
          verification: t('sidebar.verification'),
          listings: t('sidebar.listings'),
          users: t('sidebar.users'),
        }}
      />

      {/* Zone de contenu principal — les pages admin s'affichent ici */}
      <main className="flex-1 bg-[#FAF7F2] p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  )
}
