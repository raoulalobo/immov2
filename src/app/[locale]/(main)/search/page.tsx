/**
 * Page de recherche de terrains — composant serveur (Server Component).
 * Affiche un panneau de filtres, une grille de resultats pagines
 * et un etat vide quand aucune annonce ne correspond.
 *
 * Architecture :
 *   - Server Component : lit les searchParams de l'URL, parse avec Zod,
 *     requete Prisma, rend le HTML cote serveur (pas de JS client inutile)
 *   - Le composant <SearchFilters> (client) gere les interactions des filtres
 *     et met a jour les searchParams → Next.js re-render cette page serveur
 *   - Le composant <ListingCard> affiche chaque annonce individuelle
 *
 * Flux de donnees :
 *   1. L'utilisateur modifie un filtre dans <SearchFilters>
 *   2. SearchFilters fait router.replace() avec les nouveaux params
 *   3. Next.js re-render cette page serveur avec les nouveaux searchParams
 *   4. La page parse les params, requete Prisma, rend les resultats
 *
 * Route : /[locale]/search?city=douala&terrainType=residential&page=1
 */
import { Suspense } from 'react'
import { headers } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { getPublicUrl } from '@/lib/storage'
import { searchListingsSchema } from '@/lib/validations/listing'
import { SearchFilters } from '@/components/search-filters'
import { ListingCard } from '@/components/listing-card'
import { Link } from '@/i18n/navigation'

// Import des donnees de villes depuis le fichier JSON statique
import citiesData from '../../../../../public/data/cities.json'

/**
 * Type des searchParams Next.js 16 — objet de cles/valeurs string.
 * Next.js 16 passe les searchParams comme une Promise qu'on doit await.
 */
interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/**
 * Construit la clause WHERE Prisma a partir des filtres valides.
 * Seuls les filtres presents sont ajoutes (les filtres absents sont ignores).
 *
 * @param filters - Filtres parses et valides par le schema Zod
 * @returns Objet WHERE compatible avec prisma.listing.findMany
 *
 * Exemple : buildWhereClause({ city: 'douala', minPrice: 5000000 })
 * → { status: 'active', city: 'douala', priceFcfa: { gte: 5000000n } }
 */
function buildWhereClause(filters: {
  city?: string
  terrainType?: string
  minPrice?: number
  maxPrice?: number
  minSurface?: number
  maxSurface?: number
}) {
  // Clause de base : uniquement les annonces actives (pas brouillon, vendu, etc.)
  const where: Record<string, unknown> = {
    status: 'active',
  }

  // Filtre par ville si specifie
  if (filters.city) {
    where.city = filters.city
  }

  // Filtre par type de terrain si specifie
  if (filters.terrainType) {
    where.terrainType = filters.terrainType
  }

  // Filtre par fourchette de prix (BigInt car Prisma stocke en BigInt)
  if (filters.minPrice || filters.maxPrice) {
    const priceFilter: Record<string, bigint> = {}
    if (filters.minPrice) priceFilter.gte = BigInt(filters.minPrice)
    if (filters.maxPrice) priceFilter.lte = BigInt(filters.maxPrice)
    where.priceFcfa = priceFilter
  }

  // Filtre par fourchette de surface (Decimal en base, compare en number)
  if (filters.minSurface || filters.maxSurface) {
    const surfaceFilter: Record<string, number> = {}
    if (filters.minSurface) surfaceFilter.gte = filters.minSurface
    if (filters.maxSurface) surfaceFilter.lte = filters.maxSurface
    where.surfaceM2 = surfaceFilter
  }

  return where
}

/**
 * Prepare la liste des villes pour le dropdown du filtre.
 * Extrait les cles et noms affichables depuis cities.json.
 *
 * Resultat : [{ key: "douala", name: "Douala" }, { key: "yaounde", name: "Yaounde" }, ...]
 */
function getCitiesList(): { key: string; name: string }[] {
  return Object.entries(citiesData).map(([key, city]) => ({
    key,
    name: (city as { name: string }).name,
  }))
}

/**
 * Composant de pagination — affiche les boutons Precedent/Suivant.
 * Genere des liens <a> classiques (pas de JS) pour une navigation serveur.
 *
 * @param currentPage - Page actuelle (1-indexed)
 * @param totalPages - Nombre total de pages
 * @param searchParams - Params actuels pour reconstruire l'URL
 */
function Pagination({
  currentPage,
  totalPages,
  searchParams,
  tPrevious,
  tNext,
}: {
  currentPage: number
  totalPages: number
  searchParams: URLSearchParams
  tPrevious: string
  tNext: string
}) {
  /**
   * Construit l'URL d'une page donnee en preservant les filtres actuels.
   * Exemple : buildPageUrl(2) → "/search?city=douala&page=2"
   */
  function buildPageUrl(page: number): string {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(page))
    return `/search?${params.toString()}`
  }

  return (
    <nav
      className="mt-8 flex items-center justify-center gap-4"
      aria-label="Pagination"
    >
      {/* Bouton "Precedent" — desactive sur la premiere page */}
      {currentPage > 1 ? (
        <Link
          href={buildPageUrl(currentPage - 1)}
          className="rounded-lg border border-border bg-background-elevated px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background-subtle"
        >
          &larr; {tPrevious}
        </Link>
      ) : (
        <span
          className="cursor-not-allowed rounded-lg border border-border bg-background-subtle px-4 py-2 text-sm font-medium text-foreground-muted"
          aria-disabled="true"
        >
          &larr; {tPrevious}
        </span>
      )}

      {/* Indicateur de page actuelle / total */}
      <span className="text-sm text-foreground-secondary">
        {currentPage} / {totalPages}
      </span>

      {/* Bouton "Suivant" — desactive sur la derniere page */}
      {currentPage < totalPages ? (
        <Link
          href={buildPageUrl(currentPage + 1)}
          className="rounded-lg border border-border bg-background-elevated px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background-subtle"
        >
          {tNext} &rarr;
        </Link>
      ) : (
        <span
          className="cursor-not-allowed rounded-lg border border-border bg-background-subtle px-4 py-2 text-sm font-medium text-foreground-muted"
          aria-disabled="true"
        >
          {tNext} &rarr;
        </span>
      )}
    </nav>
  )
}

/**
 * Etat de chargement — placeholder affiche pendant le loading (Suspense).
 * Simule la grille de resultats avec des rectangles animes (skeleton).
 */
function LoadingSkeleton() {
  return (
    <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {/* 6 cartes skeleton pour simuler le chargement */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse overflow-hidden rounded-xl border border-border bg-background-elevated"
        >
          {/* Placeholder image */}
          <div className="h-44 bg-background-subtle" />
          {/* Placeholder contenu */}
          <div className="space-y-3 p-4">
            <div className="h-5 w-3/4 rounded bg-background-subtle" />
            <div className="h-4 w-1/2 rounded bg-background-subtle" />
            <div className="h-px bg-border" />
            <div className="h-3 w-2/3 rounded bg-background-subtle" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Etat vide — affiche quand aucune annonce ne correspond aux filtres.
 * Message chaleureux avec suggestion d'elargir la recherche.
 */
function EmptyState({
  tNoListings,
  tNoListingsHint,
}: {
  tNoListings: string
  tNoListingsHint: string
}) {
  return (
    <div className="mt-12 flex flex-col items-center justify-center rounded-xl border border-border bg-background-elevated px-6 py-16 text-center">
      {/* Icone decorative — loupe avec point d'interrogation */}
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-background-subtle text-3xl">
        <span aria-hidden="true">{'\u{1F50D}'}</span>
      </div>
      <h3 className="mt-4 font-[var(--font-display)] text-lg font-semibold text-foreground">
        {tNoListings}
      </h3>
      <p className="mt-2 max-w-md text-sm text-foreground-secondary">
        {tNoListingsHint}
      </p>
    </div>
  )
}

/**
 * Page de recherche — composant serveur principal.
 * Parse les searchParams, interroge Prisma, rend les resultats.
 */
export default async function SearchPage({ searchParams }: SearchPageProps) {
  // Recuperer les traductions cote serveur (getTranslations pour server components)
  const t = await getTranslations('search')
  const tCommon = await getTranslations('common')

  // --- Récupérer les favoris de l'utilisateur connecté ---
  const session = await auth.api.getSession({ headers: await headers() })
  const favoriteIds = new Set(
    session?.user
      ? (await db.favorite.findMany({
          where: { userId: session.user.id },
          select: { listingId: true },
        })).map((f) => f.listingId)
      : []
  )

  // Await des searchParams (Next.js 16 les passe comme Promise)
  const rawParams = await searchParams

  // --- Parse et validation des parametres de recherche avec Zod ---
  // safeParse ne throw pas : retourne { success, data } ou { success, error }
  const parseResult = searchListingsSchema.safeParse(rawParams)

  // Valeurs par defaut si le parsing echoue (ex: params invalides dans l'URL)
  const filters = parseResult.success
    ? parseResult.data
    : { page: 1, limit: 12 }

  // Extraire page et limit pour la pagination
  const page = filters.page ?? 1
  const limit = filters.limit ?? 12

  // --- Construction de la clause WHERE Prisma ---
  const where = buildWhereClause(filters)

  // --- Requetes Prisma en parallele (findMany + count) pour la performance ---
  // Promise.all execute les deux requetes simultanement au lieu de sequentiellement
  const [listings, totalCount] = await Promise.all([
    db.listing.findMany({
      where,
      orderBy: { createdAt: 'desc' }, // Plus recentes en premier
      skip: (page - 1) * limit,       // Pagination : sauter les pages precedentes
      take: limit,                     // Nombre de resultats par page
      include: {
        // Inclure la premiere photo pour l'apercu de la carte
        photos: {
          orderBy: { position: 'asc' },
          take: 1,
        },
        // Inclure le vendeur pour savoir s'il est verifie (badge)
        vendor: {
          select: { isVerified: true },
        },
      },
    }),
    db.listing.count({ where }), // Compter le total pour calculer les pages
  ])

  // Calcul du nombre total de pages (arrondi au superieur)
  const totalPages = Math.max(1, Math.ceil(totalCount / limit))

  // Preparer les villes pour le composant de filtres
  const cities = getCitiesList()

  // Reconstruire les searchParams pour les liens de pagination
  const currentSearchParams = new URLSearchParams()
  if (filters.city) currentSearchParams.set('city', filters.city)
  if (filters.terrainType) currentSearchParams.set('terrainType', filters.terrainType)
  if (filters.minPrice) currentSearchParams.set('minPrice', String(filters.minPrice))
  if (filters.maxPrice) currentSearchParams.set('maxPrice', String(filters.maxPrice))
  if (filters.minSurface) currentSearchParams.set('minSurface', String(filters.minSurface))
  if (filters.maxSurface) currentSearchParams.set('maxSurface', String(filters.maxSurface))

  /**
   * Recuperer le nom affichable de la ville a partir de la cle.
   * Exemple : getCityDisplayName("douala") → "Douala"
   */
  function getCityDisplayName(cityKey: string): string {
    const cityEntry = citiesData[cityKey as keyof typeof citiesData]
    return cityEntry ? (cityEntry as { name: string }).name : cityKey
  }

  return (
    <div className="mx-auto max-w-[1080px] px-4 py-8 sm:px-6">
      {/* Titre de la page */}
      <h1 className="font-[var(--font-display)] text-2xl font-bold text-foreground sm:text-3xl">
        {t('title')}
      </h1>

      {/* Panneau de filtres (composant client, wrappe dans Suspense pour le SSR) */}
      <div className="mt-6">
        <Suspense fallback={null}>
          <SearchFilters cities={cities} />
        </Suspense>
      </div>

      {/* Compteur de resultats */}
      <p className="mt-6 text-sm text-foreground-secondary">
        {t('resultsCount', { count: totalCount })}
      </p>

      {/* Contenu principal : resultats ou etat vide */}
      <Suspense fallback={<LoadingSkeleton />}>
        {listings.length > 0 ? (
          <>
            {/* Grille de resultats : 1 colonne mobile, 2 tablette, 3 desktop */}
            <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  id={listing.id}
                  title={listing.title}
                  priceFcfa={listing.priceFcfa}
                  surfaceM2={Number(listing.surfaceM2)}
                  terrainType={listing.terrainType}
                  city={getCityDisplayName(listing.city)}
                  quarter={listing.quarter}
                  isVerified={listing.vendor.isVerified}
                  firstPhotoPath={
                    getPublicUrl(listing.photos[0]?.storagePath) ?? null
                  }
                  isFavorited={favoriteIds.has(listing.id)}
                />
              ))}
            </div>

            {/* Pagination en bas de page (seulement si plus d'une page) */}
            {totalPages > 1 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                searchParams={currentSearchParams}
                tPrevious={tCommon('previous')}
                tNext={tCommon('next')}
              />
            )}
          </>
        ) : (
          /* Etat vide : message d'encouragement a elargir la recherche */
          <EmptyState
            tNoListings={t('noListings')}
            tNoListingsHint={t('noListingsHint')}
          />
        )}
      </Suspense>
    </div>
  )
}
