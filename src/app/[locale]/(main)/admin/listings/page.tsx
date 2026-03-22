/**
 * Page de gestion de toutes les annonces — vue tableau pour l'admin.
 *
 * Rôle :
 *   Afficher un tableau de toutes les annonces de la plateforme avec :
 *   titre, vendeur, ville, statut, prix et date de création.
 *   L'admin peut modifier le statut de chaque annonce (activer, suspendre, etc.).
 *
 * Interactions :
 *   - Prisma (db) : lecture de toutes les annonces avec relation vendor
 *   - next-intl (getTranslations) : traductions côté serveur
 *   - ListingActions : composant client pour les boutons de changement de statut
 *
 * URL : /[locale]/admin/listings
 */
import { db } from '@/lib/db'
import { getTranslations } from 'next-intl/server'
import { ListingActions } from './listing-actions'

/**
 * AdminListingsPage — Page serveur listant toutes les annonces.
 *
 * Flux :
 *   1. Récupérer les traductions admin.listings
 *   2. Charger toutes les annonces avec le vendeur associé (nom)
 *   3. Afficher un tableau responsive avec les actions de modération
 */
export default async function AdminListingsPage() {
  // --- 1. Récupérer les traductions ---
  const t = await getTranslations('admin.listings')

  // --- 2. Charger toutes les annonces ---
  // Triées par date décroissante (les plus récentes en premier)
  // Inclut le vendeur pour afficher son nom dans le tableau
  const listings = await db.listing.findMany({
    include: {
      vendor: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div>
      {/* Titre de la page */}
      <h1 className="mb-6 text-2xl font-bold text-[#2D6A4F]">{t('title')}</h1>

      {/* --- Cas vide : aucune annonce --- */}
      {listings.length === 0 ? (
        <div className="rounded-xl border border-[#E5E0D8] bg-white p-8 text-center text-[#6B7280]">
          {t('noListings')}
        </div>
      ) : (
        /* --- Tableau des annonces --- */
        <div className="overflow-x-auto rounded-xl border border-[#E5E0D8] bg-white">
          <table className="w-full text-left text-sm">
            {/* En-têtes du tableau */}
            <thead className="border-b border-[#E5E0D8] bg-[#F5F0EA]">
              <tr>
                <th className="px-4 py-3 font-semibold text-[#374151]">{t('titleColumn')}</th>
                <th className="px-4 py-3 font-semibold text-[#374151]">{t('vendor')}</th>
                <th className="px-4 py-3 font-semibold text-[#374151]">{t('city')}</th>
                <th className="px-4 py-3 font-semibold text-[#374151]">{t('status')}</th>
                <th className="px-4 py-3 font-semibold text-[#374151]">{t('price')}</th>
                <th className="px-4 py-3 font-semibold text-[#374151]">{t('createdAt')}</th>
                <th className="px-4 py-3 font-semibold text-[#374151]">{t('actions')}</th>
              </tr>
            </thead>

            {/* Corps du tableau — une ligne par annonce */}
            <tbody className="divide-y divide-[#E5E0D8]">
              {listings.map((listing: typeof listings[number]) => (
                <tr key={listing.id} className="hover:bg-[#FAF7F2]">
                  {/* Titre de l'annonce (tronqué si trop long) */}
                  <td className="max-w-[200px] truncate px-4 py-3 font-medium text-[#374151]">
                    {listing.title}
                  </td>

                  {/* Nom du vendeur */}
                  <td className="px-4 py-3 text-[#6B7280]">
                    {listing.vendor.name}
                  </td>

                  {/* Ville */}
                  <td className="px-4 py-3 text-[#6B7280]">
                    {listing.city}
                  </td>

                  {/* Badge de statut avec code couleur */}
                  <td className="px-4 py-3">
                    <ListingStatusBadge status={listing.status} />
                  </td>

                  {/* Prix en FCFA formaté avec séparateur de milliers */}
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-[#2D6A4F]">
                    {Number(listing.priceFcfa).toLocaleString('fr-FR')} FCFA
                  </td>

                  {/* Date de création */}
                  <td className="whitespace-nowrap px-4 py-3 text-[#6B7280]">
                    {new Date(listing.createdAt).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </td>

                  {/* Boutons d'action — composant client */}
                  <td className="px-4 py-3">
                    <ListingActions
                      listingId={listing.id}
                      currentStatus={listing.status}
                      labels={{
                        activate: t('activate'),
                        suspend: t('suspend'),
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/**
 * ListingStatusBadge — Badge de statut pour une annonce.
 *
 * Couleurs selon le cycle de vie :
 *   - draft     → gris (brouillon)
 *   - active    → vert (en ligne)
 *   - sold      → bleu (vendu)
 *   - expired   → jaune (expirée)
 *   - suspended → rouge (suspendue par modération)
 *
 * @param status - Statut de l'annonce
 */
function ListingStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-[#6B7280]/10 text-[#6B7280]',
    active: 'bg-[#2D6A4F]/10 text-[#2D6A4F]',
    sold: 'bg-[#457B9D]/10 text-[#457B9D]',
    expired: 'bg-[#E9C46A]/20 text-[#92782D]',
    suspended: 'bg-[#E63946]/10 text-[#E63946]',
  }

  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
        styles[status] || styles.draft
      }`}
    >
      {status}
    </span>
  )
}
