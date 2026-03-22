/**
 * Bouton favori (cœur) — composant CLIENT.
 *
 * Rôle :
 *   Toggle le statut favori d'une annonce pour l'utilisateur connecté.
 *   Affiche un cœur vide (non favori) ou plein (favori).
 *   Redirige vers /login si l'utilisateur n'est pas connecté.
 *
 * Interactions :
 *   - API POST /api/favorites : toggle le favori (ajouter/retirer)
 *   - authClient.useSession() : vérifier si l'utilisateur est connecté
 *   - Utilisé dans la page de détail et dans ListingCard
 *
 * Exemple d'usage :
 *   <FavoriteButton listingId="clxyz123" initialFavorited={false} />
 */
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from '@/i18n/navigation'
import { authClient } from '@/lib/auth-client'

interface FavoriteButtonProps {
  /** ID de l'annonce à mettre en favori */
  listingId: string
  /** État initial du favori (pré-calculé côté serveur) */
  initialFavorited?: boolean
  /** Variante d'affichage : "icon" = juste l'icône, "button" = bouton avec texte */
  variant?: 'icon' | 'button'
  /** Label texte affiché à côté de l'icône (pour variant="button") */
  label?: string
}

export function FavoriteButton({
  listingId,
  initialFavorited = false,
  variant = 'icon',
  label,
}: FavoriteButtonProps) {
  const { data: session } = authClient.useSession()
  const router = useRouter()
  const [favorited, setFavorited] = useState(initialFavorited)
  const [loading, setLoading] = useState(false)

  const handleToggle = useCallback(
    async (e: React.MouseEvent) => {
      // Empêcher la navigation du parent (ex: ListingCard qui est un <Link>)
      e.preventDefault()
      e.stopPropagation()

      // Rediriger vers login si non connecté
      if (!session?.user) {
        router.push('/login')
        return
      }

      if (loading) return

      // Optimistic update — on inverse immédiatement pour la réactivité
      setFavorited((prev) => !prev)
      setLoading(true)

      try {
        const res = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listingId }),
        })

        if (!res.ok) {
          // Rollback si l'API échoue
          setFavorited((prev) => !prev)
        }
      } catch {
        // Rollback en cas d'erreur réseau
        setFavorited((prev) => !prev)
      } finally {
        setLoading(false)
      }
    },
    [session, router, listingId, loading]
  )

  // Icône cœur — rempli si favori, vide sinon
  const heartIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill={favorited ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={favorited ? 0 : 1.5}
      className={`h-5 w-5 transition-colors ${
        favorited ? 'text-[#E63946]' : 'text-gray-400'
      }`}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
      />
    </svg>
  )

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm transition-all hover:scale-110 hover:bg-white disabled:opacity-50"
        aria-label={favorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      >
        {heartIcon}
      </button>
    )
  }

  // variant === 'button'
  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className={`inline-flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
        favorited
          ? 'border-[#E63946]/20 bg-[#E63946]/5 text-[#E63946] hover:bg-[#E63946]/10'
          : 'border-[#E8E0D5] bg-white text-gray-700 hover:bg-gray-50'
      }`}
    >
      {heartIcon}
      {label}
    </button>
  )
}
