/**
 * Panneau de filtres de recherche — composant client.
 * Affiche des champs de filtrage (ville, type de terrain, prix, surface)
 * et met a jour les parametres d'URL a chaque changement.
 *
 * Architecture :
 *   - Lit les valeurs actuelles depuis useSearchParams()
 *   - A chaque changement de filtre, reconstruit l'URL avec les nouveaux params
 *   - Redirige via router.replace() pour eviter d'empiler l'historique
 *   - Le composant parent (page.tsx server component) relit les searchParams
 *     a chaque navigation et re-requete Prisma
 *
 * Interactions :
 *   - Dropdown "Ville" → filtre par city
 *   - Dropdown "Type de terrain" → filtre par terrainType
 *   - Inputs numériques → filtre par fourchette de prix et de surface
 *   - La page se recharge avec les nouveaux filtres (navigation cote serveur)
 *
 * Exemple d'usage :
 *   <SearchFilters cities={citiesData} />
 */
'use client'

import { useTranslations } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import { useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { TERRAIN_TYPES } from '@/lib/constants'

/** Structure d'une ville importee de cities.json */
interface CityData {
  /** Cle technique (ex: "douala", "yaounde") */
  key: string
  /** Nom affichable (ex: "Douala", "Yaounde") */
  name: string
}

interface SearchFiltersProps {
  /** Liste des villes disponibles (extraite de cities.json) */
  cities: CityData[]
}

export function SearchFilters({ cities }: SearchFiltersProps) {
  /** Traductions du namespace "search" (labels des filtres) */
  const t = useTranslations('search')
  /** Traductions du namespace "terrainType" (noms traduits des types) */
  const tTerrain = useTranslations('terrainType')
  /** Traduction du namespace "listing" pour les labels generaux */
  const tListing = useTranslations('listing')

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  /**
   * Met a jour un parametre d'URL et navigue vers la nouvelle URL.
   * Si la valeur est vide, le parametre est supprime de l'URL.
   * Remet la page a 1 a chaque changement de filtre pour eviter
   * d'afficher une page vide si le filtre reduit les resultats.
   *
   * @param key - Nom du parametre (ex: "city", "minPrice")
   * @param value - Nouvelle valeur du parametre (vide = suppression)
   *
   * Exemple : updateParam('city', 'douala') → /search?city=douala&page=1
   */
  const updateParam = useCallback(
    (key: string, value: string) => {
      // Copier les params existants dans un nouvel objet URLSearchParams
      const params = new URLSearchParams(searchParams.toString())

      if (value) {
        params.set(key, value)
      } else {
        // Valeur vide → supprimer le filtre
        params.delete(key)
      }

      // Reinitialiser la page a 1 quand un filtre change
      // (sauf si c'est le parametre "page" lui-meme qui change)
      if (key !== 'page') {
        params.delete('page')
      }

      // Navigation sans ajout a l'historique (replace, pas push)
      router.replace(`${pathname}?${params.toString()}`)
    },
    [searchParams, pathname, router]
  )

  return (
    <div className="rounded-xl border border-border bg-background-elevated p-5">
      {/* Titre du panneau de filtres */}
      <h2 className="font-[var(--font-display)] text-base font-semibold text-foreground">
        {t('filters')}
      </h2>

      {/* Grille de filtres : 2 colonnes sur mobile, 4 sur desktop */}
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">

        {/* --- Filtre par ville --- */}
        <div className="col-span-1">
          <label
            htmlFor="filter-city"
            className="mb-1 block text-xs font-medium text-foreground-secondary"
          >
            {tListing('city')}
          </label>
          <select
            id="filter-city"
            value={searchParams.get('city') ?? ''}
            onChange={(e) => updateParam('city', e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {/* Option par defaut : toutes les villes */}
            <option value="">{t('allCities')}</option>
            {cities.map((city) => (
              <option key={city.key} value={city.key}>
                {city.name}
              </option>
            ))}
          </select>
        </div>

        {/* --- Filtre par type de terrain --- */}
        <div className="col-span-1">
          <label
            htmlFor="filter-terrain"
            className="mb-1 block text-xs font-medium text-foreground-secondary"
          >
            {tListing('type')}
          </label>
          <select
            id="filter-terrain"
            value={searchParams.get('terrainType') ?? ''}
            onChange={(e) => updateParam('terrainType', e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {/* Option par defaut : tous les types */}
            <option value="">{t('allTypes')}</option>
            {TERRAIN_TYPES.map((type) => (
              <option key={type} value={type}>
                {tTerrain(type)}
              </option>
            ))}
          </select>
        </div>

        {/* --- Filtre par prix minimum (FCFA) --- */}
        <div className="col-span-1">
          <label
            htmlFor="filter-min-price"
            className="mb-1 block text-xs font-medium text-foreground-secondary"
          >
            {t('minPrice')}
          </label>
          <input
            id="filter-min-price"
            type="number"
            min={0}
            step={100000}
            placeholder="0"
            value={searchParams.get('minPrice') ?? ''}
            onChange={(e) => updateParam('minPrice', e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* --- Filtre par prix maximum (FCFA) --- */}
        <div className="col-span-1">
          <label
            htmlFor="filter-max-price"
            className="mb-1 block text-xs font-medium text-foreground-secondary"
          >
            {t('maxPrice')}
          </label>
          <input
            id="filter-max-price"
            type="number"
            min={0}
            step={100000}
            placeholder="10 000 000 000"
            value={searchParams.get('maxPrice') ?? ''}
            onChange={(e) => updateParam('maxPrice', e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* --- Filtre par surface minimum (m2) --- */}
        <div className="col-span-1">
          <label
            htmlFor="filter-min-surface"
            className="mb-1 block text-xs font-medium text-foreground-secondary"
          >
            {t('minSurface')}
          </label>
          <input
            id="filter-min-surface"
            type="number"
            min={0}
            step={50}
            placeholder="0"
            value={searchParams.get('minSurface') ?? ''}
            onChange={(e) => updateParam('minSurface', e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* --- Filtre par surface maximum (m2) --- */}
        <div className="col-span-1">
          <label
            htmlFor="filter-max-surface"
            className="mb-1 block text-xs font-medium text-foreground-secondary"
          >
            {t('maxSurface')}
          </label>
          <input
            id="filter-max-surface"
            type="number"
            min={0}
            step={50}
            placeholder="1 000 000"
            value={searchParams.get('maxSurface') ?? ''}
            onChange={(e) => updateParam('maxSurface', e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>
    </div>
  )
}
