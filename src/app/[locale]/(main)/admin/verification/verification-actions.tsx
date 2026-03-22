/**
 * Composant client pour les actions admin sur une demande de vérification.
 *
 * Rôle :
 *   Afficher les boutons "Approuver" et "Rejeter" pour une demande de
 *   vérification en attente. Le rejet nécessite un motif obligatoire
 *   pour informer le vendeur.
 *
 * Interactions :
 *   - API fetch vers /api/admin/verification/[id] (PATCH)
 *   - next/navigation (useRouter) : rafraîchissement après action
 *   - Reçoit les labels traduits en props depuis le composant serveur parent
 *
 * Exemple d'usage :
 *   <VerificationActions
 *     requestId="clver789"
 *     labels={{ approve: "Approuver", reject: "Rejeter", ... }}
 *   />
 */
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Props du composant VerificationActions.
 */
interface VerificationActionsProps {
  /** ID de la demande de vérification à traiter */
  requestId: string
  /** Labels traduits pour les boutons et messages */
  labels: {
    approve: string
    reject: string
    rejectionReason: string
    rejectionReasonPlaceholder: string
    successApprove: string
    successReject: string
  }
}

/**
 * VerificationActions — Boutons d'action pour traiter une demande de vérification.
 *
 * Flux utilisateur :
 *   - Approuver : clic direct → API PATCH → badge "Vendeur vérifié" activé
 *   - Rejeter : clic → formulaire de motif → validation → API PATCH → motif enregistré
 *
 * États :
 *   - loading : désactive les boutons pendant l'appel API
 *   - showRejectForm : affiche le formulaire de motif de rejet
 *   - rejectionReason : contenu du champ de motif
 */
export function VerificationActions({
  requestId,
  labels,
}: VerificationActionsProps) {
  const [loading, setLoading] = useState(false)
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const router = useRouter()

  /**
   * Approuver la demande de vérification.
   * Appel PATCH avec status='approved' → le vendeur reçoit le badge vérifié.
   */
  const handleApprove = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/verification/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      })

      if (response.ok) {
        router.refresh()
      } else {
        const data = await response.json()
        console.error('Erreur lors de l\'approbation:', data.error)
      }
    } catch (error) {
      console.error('Erreur réseau:', error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Rejeter la demande de vérification avec un motif.
   * Le motif est obligatoire pour informer le vendeur de la raison du rejet.
   */
  const handleReject = async () => {
    // Vérifier que le motif est renseigné
    if (!rejectionReason.trim()) return

    setLoading(true)
    try {
      const response = await fetch(`/api/admin/verification/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'rejected',
          rejectionReason: rejectionReason.trim(),
        }),
      })

      if (response.ok) {
        router.refresh()
      } else {
        const data = await response.json()
        console.error('Erreur lors du rejet:', data.error)
      }
    } catch (error) {
      console.error('Erreur réseau:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* --- Boutons principaux --- */}
      <div className="flex gap-2">
        {/* Bouton Approuver — style vert (action positive) */}
        <button
          onClick={handleApprove}
          disabled={loading}
          className="rounded-lg bg-[#2D6A4F] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#245A42] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {labels.approve}
        </button>

        {/* Bouton Rejeter — style rouge (action négative) */}
        <button
          onClick={() => setShowRejectForm(!showRejectForm)}
          disabled={loading}
          className="rounded-lg bg-[#E63946] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#C62E3A] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {labels.reject}
        </button>
      </div>

      {/* --- Formulaire de motif de rejet (affiché au clic sur "Rejeter") --- */}
      {showRejectForm && (
        <div className="flex gap-2">
          {/* Champ de texte pour le motif (obligatoire) */}
          <input
            type="text"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder={labels.rejectionReasonPlaceholder}
            className="flex-1 rounded-lg border border-[#E5E0D8] px-3 py-2 text-sm text-[#374151] placeholder:text-[#9CA3AF] focus:border-[#E63946] focus:outline-none focus:ring-1 focus:ring-[#E63946]"
          />

          {/* Bouton de confirmation du rejet */}
          <button
            onClick={handleReject}
            disabled={loading || !rejectionReason.trim()}
            className="shrink-0 rounded-lg bg-[#E63946] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#C62E3A] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {labels.reject}
          </button>
        </div>
      )}
    </div>
  )
}
