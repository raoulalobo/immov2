/**
 * Composant client pour les actions admin sur un utilisateur.
 *
 * Rôle :
 *   Afficher les boutons "Activer" et/ou "Suspendre" selon le statut actuel
 *   de l'utilisateur. Empêche la suspension d'un admin par un autre admin
 *   côté client (la vérification est aussi faite côté API).
 *
 * Interactions :
 *   - API fetch vers /api/admin/users/[id] (PATCH)
 *   - next/navigation (useRouter) : rafraîchissement après action
 *
 * Logique d'affichage :
 *   - Si l'utilisateur est 'active'    → afficher "Suspendre"
 *   - Si l'utilisateur est 'suspended' → afficher "Activer"
 *   - Si l'utilisateur est 'deleted'   → aucun bouton (état terminal)
 *   - Si l'utilisateur est un admin    → aucun bouton (pas de modération entre admins)
 *
 * Exemple d'usage :
 *   <UserActions
 *     userId="clusr456"
 *     currentStatus="active"
 *     userRole="user"
 *     labels={{ activate: "Activer", suspend: "Suspendre" }}
 *   />
 */
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Props du composant UserActions.
 */
interface UserActionsProps {
  /** ID de l'utilisateur à gérer */
  userId: string
  /** Statut actuel de l'utilisateur (détermine les boutons affichés) */
  currentStatus: string
  /** Rôle de l'utilisateur (un admin ne peut pas être suspendu) */
  userRole: string
  /** Labels traduits pour les boutons */
  labels: {
    activate: string
    suspend: string
  }
}

/**
 * UserActions — Boutons de gestion de statut pour un utilisateur.
 *
 * Flux :
 *   1. Vérifier si des actions sont possibles sur cet utilisateur
 *   2. Au clic, envoyer un PATCH vers l'API admin
 *   3. Rafraîchir la page pour refléter le changement
 */
export function UserActions({
  userId,
  currentStatus,
  userRole,
  labels,
}: UserActionsProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  /**
   * Modifier le statut de l'utilisateur via l'API admin.
   *
   * @param newStatus - Nouveau statut ('active' | 'suspended')
   *
   * Exemple :
   *   handleStatusChange('suspended')
   *   → PATCH /api/admin/users/clusr456
   *   → Body : { status: 'suspended' }
   */
  const handleStatusChange = async (newStatus: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        // Rafraîchir les données serveur pour mettre à jour le tableau
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

  // --- Pas d'actions sur les admins ou les comptes supprimés ---
  // Un admin ne peut pas suspendre un autre admin
  // Un compte 'deleted' est en cours de purge et ne peut pas être réactivé
  if (userRole === 'admin' || currentStatus === 'deleted') {
    return <span className="text-xs text-[#9CA3AF]">--</span>
  }

  return (
    <div className="flex gap-2">
      {/* Bouton "Activer" — affiché si le compte est suspendu */}
      {currentStatus === 'suspended' && (
        <button
          onClick={() => handleStatusChange('active')}
          disabled={loading}
          className="rounded-lg bg-[#2D6A4F] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#245A42] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {labels.activate}
        </button>
      )}

      {/* Bouton "Suspendre" — affiché si le compte est actif */}
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
