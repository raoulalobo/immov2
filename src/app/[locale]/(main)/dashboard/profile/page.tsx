/**
 * Page Profil vendeur — composant SERVER avec parties CLIENT.
 *
 * Role :
 *   Affiche les informations de l'utilisateur connecte, son statut de
 *   verification et une section pour supprimer son compte.
 *
 * Interactions :
 *   - Better Auth (auth) : verification de session cote serveur
 *   - Prisma (db) : lecture du profil et de la derniere demande de verification
 *   - DeleteAccountButton (client) : composant interactif pour la suppression
 *   - next-intl : traductions i18n (namespace "dashboard", "verification")
 *   - Navigation i18n : Link et redirect avec locale automatique
 *
 * Securite :
 *   - Redirect vers /login si pas de session
 *   - La suppression passe par l'API /api/account (DELETE) cote client
 *
 * Exemple d'URL :
 *   /fr/dashboard/profile — profil en francais
 *   /en/dashboard/profile — profil en anglais
 */
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { Link, redirect } from '@/i18n/navigation'
import { getTranslations, getLocale } from 'next-intl/server'
import { DeleteAccountButton } from './delete-account-button'

export default async function ProfilePage() {
  // --- 1. Verifier l'authentification ---
  const session = await auth.api.getSession({ headers: await headers() })

  // Recuperer la locale courante pour les redirections i18n
  const locale = await getLocale()

  if (!session?.user) {
    redirect({ href: '/login', locale })
    return null
  }

  // --- 2. Charger les traductions ---
  const t = await getTranslations('dashboard')
  const tVerif = await getTranslations('verification')

  // --- 3. Recuperer les informations de l'utilisateur ---
  // On relit depuis la DB pour avoir les donnees les plus fraiches
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      phone: true,
      isVerified: true,
    },
  })

  if (!user) {
    redirect({ href: '/login', locale })
    return null
  }

  // --- 4. Recuperer la derniere demande de verification ---
  const verificationRequest = await db.verificationRequest.findFirst({
    where: { vendorId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: { status: true, rejectionReason: true },
  })

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      {/* --- Lien retour vers le tableau de bord --- */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm font-medium text-[#2D6A4F] hover:underline"
      >
        {/* Icone fleche gauche */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
          <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
        </svg>
        {t('title')}
      </Link>

      {/* --- Titre de la page --- */}
      <h1 className="mt-6 font-[var(--font-display)] text-2xl font-bold text-gray-900">
        Mon profil
      </h1>

      {/* ========================================== */}
      {/* Section 1 : Informations personnelles      */}
      {/* ========================================== */}
      <section className="mt-8 rounded-xl border border-[#E8E0D5] bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">
          Informations personnelles
        </h2>

        <dl className="mt-4 space-y-4">
          {/* Nom complet */}
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Nom</dt>
            <dd className="mt-1 text-sm text-gray-900">{user.name}</dd>
          </div>

          {/* Adresse email */}
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Email</dt>
            <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
          </div>

          {/* Numero de telephone (optionnel) */}
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Telephone
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {user.phone || (
                <span className="italic text-gray-400">Non renseigne</span>
              )}
            </dd>
          </div>
        </dl>
      </section>

      {/* ========================================== */}
      {/* Section 2 : Statut de verification          */}
      {/* ========================================== */}
      <section className="mt-6 rounded-xl border border-[#E8E0D5] bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">
          {t('verificationStatus')}
        </h2>

        <div className="mt-4">
          {user.isVerified ? (
            /* --- Vendeur verifie : badge vert avec icone --- */
            <div className="flex items-center gap-3 rounded-lg bg-[#2D6A4F]/5 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2D6A4F]/10">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-[#2D6A4F]" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.403 12.652a3 3 0 0 0 0-5.304 3 3 0 0 0-3.75-3.751 3 3 0 0 0-5.305 0 3 3 0 0 0-3.751 3.75 3 3 0 0 0 0 5.305 3 3 0 0 0 3.75 3.751 3 3 0 0 0 5.305 0 3 3 0 0 0 3.751-3.75Zm-2.546-4.46a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-[#2D6A4F]">{t('verificationApproved')}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Votre badge est visible sur toutes vos annonces.
                </p>
              </div>
            </div>
          ) : verificationRequest?.status === 'pending' ? (
            /* --- Verification en cours : badge jaune --- */
            <div className="flex items-center gap-3 rounded-lg bg-[#E9C46A]/5 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E9C46A]/10">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-[#E9C46A]" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-[#E9C46A]">{t('verificationPending')}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {tVerif('sla')}
                </p>
              </div>
            </div>
          ) : verificationRequest?.status === 'rejected' ? (
            /* --- Verification refusee : badge rouge avec motif --- */
            <div className="rounded-lg bg-[#E63946]/5 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E63946]/10">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-[#E63946]" aria-hidden="true">
                    <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-[#E63946]">{t('verificationRejected')}</p>
                  {verificationRequest.rejectionReason && (
                    <p className="mt-0.5 text-xs text-gray-500">
                      Motif : {verificationRequest.rejectionReason}
                    </p>
                  )}
                </div>
              </div>
              {/* Bouton pour reessayer la verification */}
              <Link
                href="/verification"
                className="mt-3 inline-flex items-center text-sm font-medium text-[#2D6A4F] hover:underline"
              >
                Soumettre une nouvelle demande
              </Link>
            </div>
          ) : (
            /* --- Pas encore de verification : CTA pour se faire verifier --- */
            <div className="flex flex-col items-start gap-3 rounded-lg bg-[#FAF7F2] p-4">
              <p className="text-sm text-gray-600">
                {tVerif('subtitle')}
              </p>
              <Link
                href="/verification"
                className="inline-flex items-center gap-2 rounded-lg bg-[#2D6A4F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2D6A4F]/90"
              >
                {t('getVerified')}
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ========================================== */}
      {/* Section 3 : Suppression de compte           */}
      {/* ========================================== */}
      <section className="mt-6 rounded-xl border border-[#E63946]/20 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-[#E63946]">
          {t('deleteAccount')}
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          {t('deleteAccountWarning')}
        </p>

        {/* Composant client interactif pour la confirmation et l'appel API */}
        <DeleteAccountButton />
      </section>
    </div>
  )
}
