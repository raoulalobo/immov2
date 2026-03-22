/**
 * Composant client pour les actions admin sur une annonce.
 *
 * Rôle :
 *   Afficher les boutons "Activer" et/ou "Suspendre" selon le statut actuel
 *   de l'annonce. Gère l'appel à l'API PATCH /api/admin/listings/[id]
 *   et le rafraîchissement de la page après modification.
 *
 * Interactions :
 *   - API fetch vers /api/admin/listings/[id] (PATCH)
 *   - next/navigation (useRouter) : rafraîchissement de la page après action
 *
 * Logique d'affichage des boutons :
 *   - Si l'annonce est 'active'    → afficher "Suspendre"
 *   - Si l'annonce est 'suspended' → afficher "Activer"
 *   - Si l'annonce est 'draft'     → afficher "Activer"
 *   - Si l'annonce est 'sold' ou 'expired' → aucun bouton (état terminal)
 *
 * Exemple d'usage :
 *   <ListingActions
 *     listingId="clxyz123"
 *     currentStatus="active"
 *     labels={{ activate: "Activer", suspend: "Suspendre" }}
 *   />
 */
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Props du composant ListingActions.
 */
interface ListingActionsProps {
  /** ID de l'annonce à modifier */
  listingId: string
  /** Statut actuel de l'annonce (détermine les boutons affichés) */
  currentStatus: string
  /** Labels traduits pour les boutons */
  labels: {
    activate: string
    suspend: string
  }
}

/**
 * ListingActions — Boutons de changement de statut pour une annonce.
 *
 * Flux :
 *   1. Déterminer quels boutons afficher selon le statut actuel
 *   2. Au clic, envoyer un PATCH vers l'API admin
 *   3. Rafraîchir la page pour refléter le changement
 */
export function ListingActions({
  listingId,
  currentStatus,
  labels,
}: ListingActionsProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  /**
   * Modifier le statut de l'annonce via l'API admin.
   *
   * @param newStatus - Nouveau statut à appliquer ('active' | 'suspended')
   *
   * Exemple :
   *   handleStatusChange('suspended')
   *   → PATCH /api/admin/listings/clxyz123
   *   → Body : { status: 'suspended' }
   */
  const handleStatusChange = async (newStatus: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        // Rafraîchir la page serveur pour afficher le nouveau statut
        router.refresh()
      } else {
        const data = await response.json()
        console.error('Erreur lors de la mise à jour:', data.error)
      }
    } catch (error) {
      console.error('Erreur réseau:', error)
    } finally {
      setLoading(false)
    }
  }

  // --- Déterminer quels boutons afficher ---
  // Les annonces 'sold' et 'expired' sont des états terminaux, pas de bouton
  if (currentStatus === 'sold' || currentStatus === 'expired') {
    return <span className="text-xs text-[#9CA3AF]">--</span>
  }

  return (
    <div className="flex gap-2">
      {/* Bouton "Activer" — affiché si l'annonce est suspendue ou en brouillon */}
      {(currentStatus === 'suspended' || currentStatus === 'draft') && (
        <button
          onClick={() => handleStatusChange('active')}
          disabled={loading}
          className="rounded-lg bg-[#2D6A4F] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#245A42] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {labels.activate}
        </button>
      )}

      {/* Bouton "Suspendre" — affiché si l'annonce est active */}
      {currentStatus === 'active' && (
        <button
          onClick={() => handleStatusChange('suspended')}
          disabled={loading}
          className="rounded-lg bg-[#E63946] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#C62E3A] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {labels.suspend}
        </button>
      )}
    </div>
  )
}
