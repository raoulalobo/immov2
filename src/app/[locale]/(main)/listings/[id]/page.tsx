/**
 * Page de détail d'une annonce — composant SERVER.
 *
 * Rôle :
 *   Affiche toutes les informations d'une annonce (photos, prix, specs, vendeur)
 *   et fournit les boutons d'action (WhatsApp, signaler).
 *
 * Interactions :
 *   - Lecture Prisma : listing + vendor + photos + reports (count)
 *   - Composant client ContactButton pour le tracking fire-and-forget
 *   - Génération de métadonnées OG pour le partage WhatsApp
 *
 * Exemple d'URL : /fr/listings/clxyz123abc
 */
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Metadata } from 'next'

import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { getPublicUrl, STORAGE_BUCKETS } from '@/lib/storage'
import { Link } from '@/i18n/navigation'
import { ContactButton } from '@/components/contact-button'
import { PhotoGallery } from '@/components/photo-gallery'
import { LocationMap } from '@/components/location-map'
import { FavoriteButton } from '@/components/favorite-button'

// --- Types des paramètres de la route dynamique ---
type ListingPageProps = {
  params: Promise<{ locale: string; id: string }>
}

/**
 * generateMetadata — génère les balises OG pour le partage WhatsApp/réseaux sociaux.
 *
 * Exemple de résultat :
 *   <meta property="og:title" content="Terrain résidentiel 500m² — 15 000 000 FCFA" />
 *   <meta property="og:description" content="Douala · Bonamoussadi — 500 m² — Résidentiel" />
 *   <meta property="og:image" content="https://...storagePath..." />
 */
export async function generateMetadata({
  params,
}: ListingPageProps): Promise<Metadata> {
  const { id, locale } = await params
  const t = await getTranslations({ locale, namespace: 'listing' })

  // Récupérer l'annonce avec sa première photo pour l'image OG
  const listing = await db.listing.findUnique({
    where: { id },
    include: {
      photos: { orderBy: { position: 'asc' }, take: 1 },
    },
  })

  // Si l'annonce n'existe pas, retourner des métadonnées par défaut
  if (!listing) {
    return { title: 'Annonce introuvable' }
  }

  // Formater le prix pour l'affichage (ex: "15 000 000 FCFA")
  const formattedPrice = Number(listing.priceFcfa).toLocaleString('fr-FR')
  const title = `${listing.title} — ${formattedPrice} FCFA`
  const description = `${listing.city}${listing.quarter ? ' · ' + listing.quarter : ''} — ${listing.surfaceM2} m² — ${listing.terrainType}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      // Image OG = première photo de l'annonce (si disponible)
      images: listing.photos[0]
        ? [{ url: getPublicUrl(listing.photos[0].storagePath) ?? '' }]
        : [],
    },
    // Twitter Card pour un meilleur aperçu sur les réseaux sociaux
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

/**
 * Page de détail — composant serveur principal.
 *
 * Flux :
 *   1. Récupérer l'annonce depuis Prisma avec les relations (vendor, photos, reports)
 *   2. Vérifier que l'annonce existe et est active
 *   3. Calculer les données dérivées (prix/m², référence)
 *   4. Rendre la galerie, les specs, le sidebar vendeur et les boutons d'action
 */
export default async function ListingDetailPage({
  params,
}: ListingPageProps) {
  const { id, locale } = await params
  const t = await getTranslations({ locale, namespace: 'listing' })
  const tTerrain = await getTranslations({ locale, namespace: 'terrainType' })
  const tCommon = await getTranslations({ locale, namespace: 'common' })

  // --- Vérifier si l'utilisateur connecté est le propriétaire ---
  const session = await auth.api.getSession({ headers: await headers() })

  // --- Requête Prisma : annonce + vendeur + photos + nombre de signalements ---
  const listing = await db.listing.findUnique({
    where: { id },
    include: {
      // Informations du vendeur (nom, téléphone, badge vérifié)
      vendor: {
        select: {
          id: true,
          name: true,
          phone: true,
          isVerified: true,
          image: true,
        },
      },
      // Photos triées par position (0 = photo principale)
      photos: {
        orderBy: { position: 'asc' },
      },
      // Comptage des signalements en attente pour l'auto-suspension
      _count: {
        select: { reports: true },
      },
    },
  })

  // --- Garde : annonce inexistante ou non active → page 404 ---
  if (!listing || listing.status !== 'active') {
    notFound()
  }

  // --- Données dérivées ---
  // Prix formaté en FCFA (ex: "15 000 000")
  const formattedPrice = Number(listing.priceFcfa).toLocaleString('fr-FR')

  // Prix au m² (ex: "30 000 FCFA/m²")
  const pricePerM2 = Math.round(
    Number(listing.priceFcfa) / Number(listing.surfaceM2)
  ).toLocaleString('fr-FR')

  // Référence unique (ex: "#IMV-clxyz123")
  // On prend les 8 premiers caractères de l'ID pour lisibilité
  const reference = `#IMV-${listing.id.slice(0, 8)}`

  // Surface formatée (ex: "500")
  const formattedSurface = Number(listing.surfaceM2).toLocaleString('fr-FR')

  // Type de terrain traduit (ex: "Résidentiel")
  const terrainLabel = tTerrain(listing.terrainType as 'residential' | 'commercial' | 'agricultural')

  // Initiales du vendeur pour l'avatar (ex: "JD" pour "Jean Dupont")
  const vendorInitials = listing.vendor.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  // Localisation formatée (ex: "Douala · Bonamoussadi")
  const location = listing.quarter
    ? `${listing.city} · ${listing.quarter}`
    : listing.city

  // --- Vérifier si l'annonce est en favori pour l'utilisateur connecté ---
  const isFavorited = session?.user
    ? !!(await db.favorite.findUnique({
        where: {
          userId_listingId: {
            userId: session.user.id,
            listingId: id,
          },
        },
      }))
    : false

  return (
    <div className="mx-auto max-w-[1080px] px-4 py-6 sm:px-6 lg:py-10">
      {/* Barre de navigation : retour + bouton modifier (si propriétaire) */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/search"
          className="inline-flex items-center text-sm text-foreground-muted hover:text-primary"
        >
          &larr; {t('back')}
        </Link>

        {/* Bouton Modifier — visible uniquement par le propriétaire */}
        {session?.user?.id === listing.vendor.id && (
          <Link
            href={`/listings/${id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#2D6A4F]/20 bg-[#2D6A4F]/5 px-4 py-2 text-sm font-semibold text-[#2D6A4F] transition-colors hover:bg-[#2D6A4F]/10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
              <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
              <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
            </svg>
            {tCommon('edit')}
          </Link>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* ================================================================
            COLONNE PRINCIPALE (2/3) — Galerie + Infos + Specs
            ================================================================ */}
        <div className="lg:col-span-2">
          {/* --- Section Galerie de photos --- */}
          {/* La première photo est affichée en grand, les suivantes en grille */}
          <section aria-label={t('photos')}>
            {listing.photos.length > 0 ? (
              /* Galerie interactive : clic miniature → affiche en grand, clic grand → lightbox */
              <PhotoGallery
                photos={listing.photos.map((photo, i) => ({
                  id: photo.id,
                  url: getPublicUrl(photo.storagePath) ?? '',
                  alt: `${listing.title} — photo ${i + 1}`,
                }))}
              />
            ) : (
              /* Placeholder si aucune photo n'est disponible */
              <div className="flex h-64 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 sm:h-80">
                <span className="text-6xl opacity-30">🌿</span>
              </div>
            )}
          </section>

          {/* --- Section Titre + Prix + Localisation --- */}
          <section className="mt-6">
            {/* Titre de l'annonce */}
            <h1 className="font-[var(--font-display)] text-2xl font-bold text-foreground sm:text-3xl">
              {listing.title}
            </h1>

            {/* Prix en FCFA — couleur primaire pour attirer l'attention */}
            <p className="mt-2 text-2xl font-bold text-primary sm:text-3xl">
              {formattedPrice} FCFA
            </p>

            {/* Localisation (ville + quartier) */}
            <p className="mt-1 text-base text-foreground-secondary">
              {location}
            </p>
          </section>

          {/* --- Section Description --- */}
          {listing.description && (
            <section className="mt-6">
              <h2 className="font-[var(--font-display)] text-lg font-semibold text-foreground">
                {t('description')}
              </h2>
              {/* Whitespace pre-line pour respecter les sauts de ligne du vendeur */}
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground-secondary">
                {listing.description}
              </p>
            </section>
          )}

          {/* --- Section Vidéo du terrain --- */}
          {/* Affichée uniquement si le vendeur a uploadé une vidéo */}
          {listing.videoPath && (
            <section className="mt-6">
              <h2 className="font-[var(--font-display)] text-lg font-semibold text-foreground">
                {t('video')}
              </h2>
              <div className="mt-3 overflow-hidden rounded-xl border border-border">
                <video
                  src={getPublicUrl(listing.videoPath, STORAGE_BUCKETS.videos) ?? ''}
                  controls
                  preload="metadata"
                  className="w-full"
                  style={{ maxHeight: '400px' }}
                />
              </div>
            </section>
          )}

          {/* --- Section Spécifications techniques --- */}
          {/* Grille 2x2 avec les infos clés : surface, type, prix/m², référence */}
          <section className="mt-6">
            <div className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-background-elevated p-4 sm:grid-cols-4">
              {/* Surface en m² */}
              <div>
                <p className="text-xs text-foreground-muted">{t('surface')}</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {formattedSurface} m²
                </p>
              </div>

              {/* Type de terrain (traduit) */}
              <div>
                <p className="text-xs text-foreground-muted">{t('type')}</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {terrainLabel}
                </p>
              </div>

              {/* Prix au mètre carré */}
              <div>
                <p className="text-xs text-foreground-muted">
                  {t('pricePerM2')}
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {pricePerM2} FCFA/m²
                </p>
              </div>

              {/* Référence interne (ex: #IMV-clxyz123) */}
              <div>
                <p className="text-xs text-foreground-muted">
                  {t('reference')}
                </p>
                <p className="mt-1 text-sm font-mono font-semibold text-foreground">
                  {reference}
                </p>
              </div>
            </div>
          </section>

          {/* --- Section Carte de localisation --- */}
          {/* Affichée uniquement si le vendeur a renseigné les coordonnées GPS */}
          {listing.latitude != null && listing.longitude != null && (
            <section className="mt-6">
              <h2 className="font-[var(--font-display)] text-lg font-semibold text-foreground">
                {t('location')}
              </h2>
              <div className="mt-3">
                <LocationMap
                  lat={listing.latitude}
                  lng={listing.longitude}
                  label={location}
                />
              </div>
            </section>
          )}
        </div>

        {/* ================================================================
            SIDEBAR VENDEUR (1/3) — Avatar + Nom + Badge + Actions
            ================================================================ */}
        <aside className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            {/* --- Carte du vendeur --- */}
            <div className="rounded-xl border border-border bg-background-elevated p-5">
              {/* Avatar avec initiales du vendeur */}
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                  {vendorInitials}
                </div>
                <div>
                  {/* Nom du vendeur */}
                  <p className="font-semibold text-foreground">
                    {listing.vendor.name}
                  </p>
                  {/* Badge "Vendeur vérifié" si isVerified === true */}
                  {listing.vendor.isVerified && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                      <svg
                        className="h-3.5 w-3.5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.403 12.652a3 3 0 010-5.304 3 3 0 00-1.06-1.06 3 3 0 01-5.304 0 3 3 0 00-1.06 1.06 3 3 0 010 5.304 3 3 0 001.06 1.06 3 3 0 015.304 0 3 3 0 001.06-1.06zM12 13.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {t('verified')}
                    </span>
                  )}
                </div>
              </div>

              {/* --- Bouton WhatsApp (composant client) --- */}
              {/* Fire-and-forget : ouvre wa.me immédiatement, envoie le tracking en arrière-plan */}
              <div className="mt-5">
                <ContactButton
                  listingId={listing.id}
                  vendorPhone={listing.vendor.phone ?? ''}
                  city={listing.city}
                  surface={formattedSurface}
                  price={formattedPrice}
                />
              </div>

              {/* --- Bouton Favori --- */}
              <div className="mt-3">
                <FavoriteButton
                  listingId={id}
                  initialFavorited={isFavorited}
                  variant="button"
                  label={isFavorited ? t('removeFromFavorites') : t('addToFavorites')}
                />
              </div>

              {/* --- Bouton Signaler l'annonce --- */}
              <button
                type="button"
                className="mt-2 w-full rounded-lg border border-border px-4 py-2.5 text-center text-sm font-medium text-foreground-muted transition-colors hover:border-red-300 hover:text-red-600"
              >
                {t('reportListing')}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
