/**
 * Carte d'annonce de terrain — composant reutilisable.
 * Affiche un apercu d'une annonce avec : image, prix, localisation, surface et type.
 * Utilise sur la page d'accueil (grille recente) et la page de recherche (resultats).
 *
 * Interactions :
 *   - Clic sur la carte → navigation vers /listings/[id] (page detail)
 *   - Badge "Verifie" affiche si le vendeur a le statut isVerified
 *
 * Exemple d'usage :
 *   <ListingCard
 *     id="clx123"
 *     title="Terrain residentiel 500m2"
 *     priceFcfa={BigInt(15_000_000)}
 *     surfaceM2={500}
 *     terrainType="residential"
 *     city="douala"
 *     quarter="Bonamoussadi"
 *     isVerified={true}
 *   />
 */
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { FavoriteButton } from '@/components/favorite-button'

/** Props du composant ListingCard */
interface ListingCardProps {
  /** Identifiant unique de l'annonce (cuid Prisma) */
  id: string
  /** Titre de l'annonce */
  title: string
  /** Prix en FCFA (BigInt car les montants peuvent etre tres eleves) */
  priceFcfa: bigint
  /** Surface en metres carres */
  surfaceM2: number
  /** Type de terrain : residential, commercial, agricultural */
  terrainType: string
  /** Cle de ville (ex: "douala", "yaounde") correspondant a cities.json */
  city: string
  /** Quartier (optionnel) */
  quarter?: string | null
  /** true si le vendeur a le badge "Vendeur verifie" */
  isVerified: boolean
  /** Chemin de la premiere photo dans Supabase Storage (null = placeholder) */
  firstPhotoPath?: string | null
  /** true si l'annonce est en favori pour l'utilisateur connecté */
  isFavorited?: boolean
}

/**
 * Formate un montant BigInt en prix lisible avec separateurs de milliers.
 * Utilise la locale fr-FR pour les separateurs (espaces insecables).
 *
 * Exemple : formatPrice(BigInt(15000000)) → "15 000 000"
 */
function formatPrice(priceFcfa: bigint): string {
  return Number(priceFcfa).toLocaleString('fr-FR')
}

/**
 * Associe un emoji a chaque type de terrain pour le placeholder visuel.
 * Utilise quand aucune photo n'est disponible.
 */
function getTerrainEmoji(terrainType: string): string {
  const emojis: Record<string, string> = {
    residential: '\u{1F3E1}', // maison
    commercial: '\u{1F3EC}',  // immeuble commercial
    agricultural: '\u{1F33E}', // ble / agriculture
  }
  return emojis[terrainType] ?? '\u{1F30D}' // globe par defaut
}

export function ListingCard({
  id,
  title,
  priceFcfa,
  surfaceM2,
  terrainType,
  city,
  quarter,
  isVerified,
  firstPhotoPath,
  isFavorited = false,
}: ListingCardProps) {
  /**
   * Traductions pour les labels de la carte.
   * Utilise les namespaces "terrainType" (noms traduits) et "listing" (labels generaux).
   */
  const tTerrain = useTranslations('terrainType')
  const tListing = useTranslations('listing')

  return (
    <Link
      href={`/listings/${id}`}
      className="group block overflow-hidden rounded-xl border border-border bg-background-elevated transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      aria-label={`${title} — ${formatPrice(priceFcfa)} FCFA`}
    >
      {/* Zone image — photo reelle ou placeholder gradient avec emoji */}
      <div className="relative flex h-44 items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
        {firstPhotoPath ? (
          // TODO: Remplacer par <Image> de Next.js quand Supabase Storage sera configure
          <img
            src={firstPhotoPath}
            alt={title}
            className="h-full w-full object-cover"
          />
        ) : (
          /* Placeholder emoji — opacite reduite pour un rendu discret */
          <span className="text-5xl opacity-40" aria-hidden="true">
            {getTerrainEmoji(terrainType)}
          </span>
        )}

        {/* Bouton favori (cœur) — positionné en haut à gauche */}
        <div className="absolute left-2 top-2 z-10">
          <FavoriteButton listingId={id} initialFavorited={isFavorited} variant="icon" />
        </div>

        {/* Badge "Vendeur verifie" — positionne en haut a droite de l'image */}
        {isVerified && (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-3.5 w-3.5"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M16.403 12.652a3 3 0 0 0 0-5.304 3 3 0 0 0-3.75-3.751 3 3 0 0 0-5.305 0 3 3 0 0 0-3.751 3.75 3 3 0 0 0 0 5.305 3 3 0 0 0 3.75 3.751 3 3 0 0 0 5.305 0 3 3 0 0 0 3.751-3.75Zm-2.546-4.46a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
                clipRule="evenodd"
              />
            </svg>
            {tListing('verified')}
          </span>
        )}
      </div>

      {/* Contenu textuel de la carte */}
      <div className="p-4">
        {/* Prix — typographie display, couleur primaire pour attirer l'oeil */}
        <p className="font-[var(--font-display)] text-lg font-bold text-primary">
          {formatPrice(priceFcfa)} FCFA
        </p>

        {/* Localisation : ville + quartier */}
        <p className="mt-1 truncate text-sm text-foreground-secondary">
          {city}{quarter ? ` \u00B7 ${quarter}` : ''}
        </p>

        {/* Metadonnees : surface et type de terrain, separees par un trait */}
        <div className="mt-3 flex gap-4 border-t border-border pt-3 text-xs text-foreground-muted">
          <span>
            <strong className="text-foreground">{surfaceM2.toLocaleString('fr-FR')}</strong> m\u00B2
          </span>
          <span>{tTerrain(terrainType as 'residential' | 'commercial' | 'agricultural')}</span>
        </div>
      </div>
    </Link>
  )
}
