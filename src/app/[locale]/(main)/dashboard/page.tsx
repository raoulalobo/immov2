/**
 * Page Tableau de bord vendeur — composant SERVER.
 *
 * Role :
 *   Affiche un resume de l'activite du vendeur connecte :
 *   - Statistiques : annonces actives, contacts totaux, contacts du jour
 *   - Statut de verification (badge vendeur verifie)
 *   - Liste de toutes les annonces du vendeur (tous statuts)
 *   - Etat vide avec CTA pour publier la premiere annonce
 *
 * Interactions :
 *   - Better Auth (auth) : verification de session cote serveur
 *   - Prisma (db) : lecture des annonces et contacts du vendeur
 *   - next-intl : traductions i18n (namespace "dashboard", "listingStatus")
 *   - Navigation i18n : Link et redirect avec locale automatique
 *
 * Securite :
 *   - Redirect vers /login si pas de session active
 *   - N'affiche que les donnees du vendeur connecte (vendorId = session.user.id)
 *
 * Exemple d'URL :
 *   /fr/dashboard — tableau de bord en francais
 *   /en/dashboard — tableau de bord en anglais
 */
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { Link, redirect } from '@/i18n/navigation'
import { getTranslations, getLocale } from 'next-intl/server'
import { getPublicUrl } from '@/lib/storage'
import { ListingCard } from '@/components/listing-card'

/**
 * Formate un BigInt en prix lisible avec separateurs de milliers.
 * Utilise la locale fr-FR pour les espaces insecables.
 *
 * Exemple : formatPrice(BigInt(15000000)) => "15 000 000"
 */
function formatPrice(priceFcfa: bigint): string {
  return Number(priceFcfa).toLocaleString('fr-FR')
}

/**
 * Retourne les classes CSS du badge de statut selon le statut de l'annonce.
 * Utilise les couleurs du design system ImmoV2.
 *
 * Exemple : getStatusBadgeClasses('active') => classes vertes
 */
function getStatusBadgeClasses(status: string): string {
  switch (status) {
    case 'active':
      // Vert primaire (#2D6A4F) — annonce visible publiquement
      return 'bg-[#2D6A4F]/10 text-[#2D6A4F] border border-[#2D6A4F]/20'
    case 'draft':
      // Gris neutre — brouillon non publie
      return 'bg-gray-100 text-gray-600 border border-gray-200'
    case 'sold':
      // Bleu — terrain vendu, annonce archivee
      return 'bg-blue-50 text-blue-700 border border-blue-200'
    case 'expired':
      // Orange/warning (#E9C46A) — annonce expiree apres 90 jours
      return 'bg-[#E9C46A]/10 text-[#E9C46A] border border-[#E9C46A]/30'
    case 'suspended':
      // Rouge/erreur (#E63946) — annonce suspendue par un admin
      return 'bg-[#E63946]/10 text-[#E63946] border border-[#E63946]/20'
    default:
      return 'bg-gray-100 text-gray-600 border border-gray-200'
  }
}

export default async function DashboardPage() {
  // --- 1. Verifier l'authentification ---
  // Recupere la session via les headers (cookies de session Better Auth)
  const session = await auth.api.getSession({ headers: await headers() })

  // Recuperer la locale courante pour les redirections i18n
  const locale = await getLocale()

  // Redirection vers la page de connexion si pas de session
  if (!session?.user) {
    redirect({ href: '/login', locale })
    return null
  }

  // --- 2. Charger les traductions ---
  const t = await getTranslations('dashboard')
  const tStatus = await getTranslations('listingStatus')
  const tCommon = await getTranslations('common')

  // --- 3. Recuperer les donnees du vendeur ---
  // Toutes les annonces du vendeur, tous statuts confondus, triees par date de creation
  const listings = await db.listing.findMany({
    where: { vendorId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      // Premiere photo pour l'apercu miniature
      photos: { orderBy: { position: 'asc' }, take: 1 },
    },
  })

  // --- 3b. Recuperer les annonces en favori ---
  const favoriteListings = await db.favorite.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      listing: {
        include: {
          vendor: { select: { isVerified: true } },
          photos: { orderBy: { position: 'asc' }, take: 1 },
        },
      },
    },
  })

  // --- 4. Calculer les statistiques ---
  // Nombre d'annonces actives (visibles publiquement)
  const activeCount = listings.filter((l) => l.status === 'active').length

  // Total des contacts (somme de contactCount sur toutes les annonces)
  const totalContacts = listings.reduce((sum, l) => sum + l.contactCount, 0)

  // Contacts du jour : compter les ContactEvent crees aujourd'hui
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const contactsToday = await db.contactEvent.count({
    where: {
      listing: { vendorId: session.user.id },
      createdAt: { gte: todayStart },
    },
  })

  // --- 5. Recuperer le statut de verification ---
  // Derniere demande de verification (la plus recente)
  const verificationRequest = await db.verificationRequest.findFirst({
    where: { vendorId: session.user.id },
    orderBy: { createdAt: 'desc' },
  })

  // Determiner le libelle et la couleur du badge de verification
  const isVerified = session.user.isVerified
  let verificationLabel: string
  let verificationClasses: string

  if (isVerified) {
    verificationLabel = t('verificationApproved')
    verificationClasses = 'bg-[#2D6A4F]/10 text-[#2D6A4F] border border-[#2D6A4F]/20'
  } else if (verificationRequest?.status === 'pending') {
    verificationLabel = t('verificationPending')
    verificationClasses = 'bg-[#E9C46A]/10 text-[#E9C46A] border border-[#E9C46A]/30'
  } else if (verificationRequest?.status === 'rejected') {
    verificationLabel = t('verificationRejected')
    verificationClasses = 'bg-[#E63946]/10 text-[#E63946] border border-[#E63946]/20'
  } else {
    verificationLabel = t('getVerified')
    verificationClasses = 'bg-gray-100 text-gray-600 border border-gray-200'
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* --- En-tete du tableau de bord --- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-[var(--font-display)] text-2xl font-bold text-[#2D6A4F] sm:text-3xl">
            {t('title')}
          </h1>
          {/* Message de bienvenue avec le nom de l'utilisateur */}
          <p className="mt-1 text-sm text-gray-600">
            {session.user.name}
          </p>
        </div>

        {/* Bouton pour creer une nouvelle annonce */}
        <Link
          href="/listings/new"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2D6A4F] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#2D6A4F]/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2D6A4F]"
        >
          {/* Icone "+" */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
          {t('createFirst')}
        </Link>
      </div>

      {/* --- Cartes de statistiques --- */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Annonces actives */}
        <div className="rounded-xl border border-[#E8E0D5] bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">{t('activeListings')}</p>
          <p className="mt-2 font-[var(--font-display)] text-3xl font-bold text-[#2D6A4F]">
            {activeCount}
          </p>
        </div>

        {/* Contacts totaux */}
        <div className="rounded-xl border border-[#E8E0D5] bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">{t('totalContacts')}</p>
          <p className="mt-2 font-[var(--font-display)] text-3xl font-bold text-[#D4A373]">
            {totalContacts}
          </p>
        </div>

        {/* Contacts aujourd'hui */}
        <div className="rounded-xl border border-[#E8E0D5] bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">{t('contactsToday')}</p>
          <p className="mt-2 font-[var(--font-display)] text-3xl font-bold text-[#D4A373]">
            {contactsToday}
          </p>
        </div>
      </div>

      {/* --- Statut de verification --- */}
      <div className="mt-6 flex items-center gap-3 rounded-xl border border-[#E8E0D5] bg-white p-4 shadow-sm">
        <p className="text-sm font-medium text-gray-500">{t('verificationStatus')} :</p>
        {/* Badge cliquable vers la page de verification si non verifie */}
        {isVerified ? (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${verificationClasses}`}>
            {/* Icone bouclier verifie */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
              <path fillRule="evenodd" d="M16.403 12.652a3 3 0 0 0 0-5.304 3 3 0 0 0-3.75-3.751 3 3 0 0 0-5.305 0 3 3 0 0 0-3.751 3.75 3 3 0 0 0 0 5.305 3 3 0 0 0 3.75 3.751 3 3 0 0 0 5.305 0 3 3 0 0 0 3.751-3.75Zm-2.546-4.46a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
            </svg>
            {verificationLabel}
          </span>
        ) : (
          <Link
            href="/dashboard/profile"
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-opacity hover:opacity-80 ${verificationClasses}`}
          >
            {verificationLabel}
          </Link>
        )}
      </div>

      {/* --- Liste des annonces du vendeur --- */}
      <div className="mt-8">
        <h2 className="font-[var(--font-display)] text-lg font-semibold text-gray-900">
          {t('myListings')}
        </h2>

        {listings.length === 0 ? (
          /* --- Etat vide : aucune annonce --- */
          <div className="mt-6 flex flex-col items-center rounded-xl border-2 border-dashed border-[#E8E0D5] bg-[#FAF7F2] px-6 py-16 text-center">
            {/* Icone terrain stylisee */}
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#2D6A4F]/10">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-8 w-8 text-[#2D6A4F]" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
              </svg>
            </div>

            <p className="mt-4 text-base font-medium text-gray-700">
              {t('noListings')}
            </p>
            <p className="mt-1 max-w-sm text-sm text-gray-500">
              {t('noListingsHint')}
            </p>

            {/* CTA pour creer la premiere annonce */}
            <Link
              href="/listings/new"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#2D6A4F] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#2D6A4F]/90"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
              </svg>
              {t('createFirst')}
            </Link>
          </div>
        ) : (
          /* --- Grille d'annonces --- */
          <div className="mt-4 space-y-3">
            {listings.map((listing) => (
              <div
                key={listing.id}
                className="flex flex-col gap-3 rounded-xl border border-[#E8E0D5] bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
              >
                {/* Colonne gauche : titre + statut (cliquable vers le détail) */}
                <Link href={`/listings/${listing.id}`} className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-gray-900">
                      {listing.title}
                    </h3>
                    {/* Badge de statut coloré selon l'état de l'annonce */}
                    <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${getStatusBadgeClasses(listing.status)}`}>
                      {tStatus(listing.status as 'draft' | 'active' | 'sold' | 'expired' | 'suspended')}
                    </span>
                  </div>
                  {/* Prix et localisation */}
                  <p className="mt-1 text-sm text-gray-500">
                    {formatPrice(listing.priceFcfa)} FCFA
                    {listing.city ? ` \u00B7 ${listing.city}` : ''}
                    {listing.quarter ? ` \u00B7 ${listing.quarter}` : ''}
                  </p>
                </Link>

                {/* Colonne droite : bouton modifier + contacts + date */}
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  {/* Bouton Modifier — visible uniquement pour les annonces actives ou brouillons */}
                  {(listing.status === 'active' || listing.status === 'draft') && (
                    <Link
                      href={`/listings/${listing.id}/edit`}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#2D6A4F]/20 bg-[#2D6A4F]/5 px-3 py-1.5 text-xs font-semibold text-[#2D6A4F] transition-colors hover:bg-[#2D6A4F]/10"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3" aria-hidden="true">
                        <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                        <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                      </svg>
                      {tCommon('edit')}
                    </Link>
                  )}

                  {/* Nombre de contacts */}
                  <span className="flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
                      <path d="M3.505 2.365A41.369 41.369 0 0 1 9 2c1.863 0 3.697.124 5.495.365 1.247.167 2.18 1.249 2.18 2.487V6.5a.75.75 0 0 1-1.5 0V4.852c0-.503-.376-.941-.856-1.005A39.837 39.837 0 0 0 9 3.5a39.869 39.869 0 0 0-5.319.347c-.48.064-.856.502-.856 1.005v10.296c0 .503.376.941.856 1.005.482.065.971.112 1.466.14a.75.75 0 1 1-.077 1.498 42.136 42.136 0 0 1-1.532-.146c-1.247-.167-2.18-1.249-2.18-2.487V4.852c0-1.238.933-2.32 2.18-2.487h-.033Z" />
                      <path d="M16.5 13a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Zm-3.5-1.5a.75.75 0 0 0-.75.75v.75h-.75a.75.75 0 0 0 0 1.5h.75v.75a.75.75 0 0 0 1.5 0v-.75h.75a.75.75 0 0 0 0-1.5h-.75v-.75a.75.75 0 0 0-.75-.75Z" />
                    </svg>
                    {listing.contactCount}
                  </span>

                  {/* Date de création */}
                  <span>
                    {new Date(listing.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- Section Favoris --- */}
      <div className="mt-8">
        <h2 className="font-[var(--font-display)] text-lg font-semibold text-gray-900">
          {t('myFavorites')}
        </h2>

        {favoriteListings.length === 0 ? (
          /* État vide : aucun favori */
          <div className="mt-4 flex flex-col items-center rounded-xl border-2 border-dashed border-[#E8E0D5] bg-[#FAF7F2] px-6 py-10 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-10 w-10 text-[#E8E0D5]" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
            </svg>
            <p className="mt-3 text-sm font-medium text-gray-700">{t('noFavorites')}</p>
            <p className="mt-1 max-w-sm text-xs text-gray-500">{t('noFavoritesHint')}</p>
            <Link
              href="/search"
              className="mt-4 text-sm font-medium text-[#2D6A4F] hover:underline"
            >
              {tCommon('search')} &rarr;
            </Link>
          </div>
        ) : (
          /* Grille des annonces en favori */
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {favoriteListings
              .filter((f) => f.listing.status === 'active')
              .map((f) => (
                <ListingCard
                  key={f.listing.id}
                  id={f.listing.id}
                  title={f.listing.title}
                  priceFcfa={f.listing.priceFcfa}
                  surfaceM2={Number(f.listing.surfaceM2)}
                  terrainType={f.listing.terrainType}
                  city={f.listing.city}
                  quarter={f.listing.quarter}
                  isVerified={f.listing.vendor.isVerified}
                  firstPhotoPath={getPublicUrl(f.listing.photos[0]?.storagePath) ?? null}
                  isFavorited={true}
                />
              ))}
          </div>
        )}
      </div>

      {/* --- Lien vers le profil --- */}
      <div className="mt-8 flex justify-center">
        <Link
          href="/dashboard/profile"
          className="text-sm font-medium text-[#2D6A4F] underline-offset-2 hover:underline"
        >
          {/* Lien vers les parametres du profil et la suppression de compte */}
          Mon profil
        </Link>
      </div>
    </div>
  )
}
