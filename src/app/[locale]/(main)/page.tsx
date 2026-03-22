/**
 * Page d'accueil — hero de recherche + annonces récentes depuis la DB.
 * Point d'entrée principal de la plateforme.
 *
 * Composant SERVER : lit les 6 dernières annonces actives via Prisma.
 *
 * Interactions :
 *   - Prisma (db) : lecture des annonces actives les plus récentes
 *   - ListingCard : composant réutilisable pour l'affichage en grille
 *   - getPublicUrl : génération des URLs publiques des photos Supabase
 *   - next-intl : traductions (namespaces "home", "common", "search")
 */
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { db } from '@/lib/db'
import { getPublicUrl } from '@/lib/storage'
import { ListingCard } from '@/components/listing-card'

export default async function HomePage() {
  const t = await getTranslations()

  // --- Récupérer les 6 annonces actives les plus récentes ---
  const listings = await db.listing.findMany({
    where: { status: 'active' },
    include: {
      photos: { orderBy: { position: 'asc' }, take: 1 },
      vendor: { select: { isVerified: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 6,
  })

  return (
    <div>
      {/* Hero de recherche */}
      <section className="bg-gradient-to-br from-primary-dark to-primary px-4 py-12 text-center sm:py-16">
        <h1 className="font-[var(--font-display)] text-3xl font-bold text-white sm:text-4xl">
          {t('home.heroTitle')}
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-base text-white/75">
          {t('home.heroSubtitle')}
        </p>

        {/* Barre de recherche */}
        <div className="mx-auto mt-6 flex max-w-xl overflow-hidden rounded-lg shadow-lg">
          <input
            type="text"
            placeholder={t('home.searchPlaceholder')}
            className="flex-1 bg-white px-4 py-3 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none"
          />
          <Link
            href="/search"
            className="bg-secondary px-6 py-3 text-sm font-semibold text-primary-dark transition-colors hover:bg-secondary-dark hover:text-white"
          >
            {t('common.search')}
          </Link>
        </div>

        {/* Filtres rapides par ville */}
        <div className="mx-auto mt-4 flex max-w-xl flex-wrap justify-center gap-2">
          {['Douala', 'Yaoundé', 'Kribi', 'Bafoussam'].map(city => (
            <Link
              key={city}
              href={`/search?city=${city.toLowerCase()}`}
              className="rounded-full border border-white/25 bg-white/15 px-4 py-1.5 text-xs font-medium text-white/90 transition-colors hover:bg-white/25"
            >
              {city}
            </Link>
          ))}
        </div>
      </section>

      {/* Annonces récentes */}
      <section className="mx-auto max-w-[1080px] px-4 py-10 sm:px-6">
        <div className="flex items-center justify-between">
          <h2 className="font-[var(--font-display)] text-xl font-semibold">
            {t('home.recentListings')}
          </h2>
          <Link
            href="/search"
            className="text-sm font-medium text-primary hover:underline"
          >
            {t('common.seeAll')} &rarr;
          </Link>
        </div>

        {listings.length > 0 ? (
          /* Grille d'annonces réelles depuis la base de données */
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                id={listing.id}
                title={listing.title}
                priceFcfa={listing.priceFcfa}
                surfaceM2={Number(listing.surfaceM2)}
                terrainType={listing.terrainType}
                city={listing.city}
                quarter={listing.quarter}
                isVerified={listing.vendor.isVerified}
                firstPhotoPath={
                  listing.photos[0]
                    ? getPublicUrl(listing.photos[0].storagePath)
                    : null
                }
              />
            ))}
          </div>
        ) : (
          /* État vide — aucune annonce active */
          <div className="mt-10 flex flex-col items-center justify-center rounded-xl border border-border bg-background-elevated px-6 py-16">
            <span className="text-5xl opacity-30">🔍</span>
            <p className="mt-4 text-base font-medium text-foreground-secondary">
              {t('search.noListings')}
            </p>
            <p className="mt-1 text-sm text-foreground-muted">
              {t('search.noListingsHint')}
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
