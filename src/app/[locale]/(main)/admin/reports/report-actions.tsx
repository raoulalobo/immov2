/**
 * Composant client pour les actions admin sur un signalement.
 *
 * Rôle :
 *   Afficher les boutons "Confirmer" et "Rejeter" pour un signalement
 *   en attente. Gère l'appel à l'API PATCH /api/admin/reports/[id]
 *   et le rafraîchissement de la page après l'action.
 *
 * Interactions :
 *   - API fetch vers /api/admin/reports/[id] (PATCH)
 *   - next/navigation (useRouter) : rafraîchissement de la page après action
 *   - Reçoit les labels traduits en props depuis le composant serveur parent
 *
 * Exemple d'usage :
 *   <ReportActions
 *     reportId="clrpt456"
 *     labels={{ confirm: "Confirmer", dismiss: "Rejeter", ... }}
 *   />
 */
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Props du composant ReportActions.
 * Les labels sont passés depuis le composant serveur parent (traduits).
 */
interface ReportActionsProps {
  /** ID du signalement à traiter */
  reportId: string
  /** Labels traduits pour les boutons et messages */
  labels: {
    confirm: string
    dismiss: string
    adminNote: string
    adminNotePlaceholder: string
    successConfirm: string
    successDismiss: string
  }
}

/**
 * ReportActions — Boutons d'action pour traiter un signalement.
 *
 * Flux utilisateur :
 *   1. L'admin voit les boutons "Confirmer" et "Rejeter"
 *   2. Il peut optionnellement ajouter une note admin
 *   3. Au clic, un appel PATCH est envoyé à l'API
 *   4. La page se rafraîchit pour refléter le nouveau statut
 *
 * États :
 *   - loading : désactive les boutons pendant l'appel API
 *   - showNote : affiche/masque le champ de note admin
 */
export function ReportActions({ reportId, labels }: ReportActionsProps) {
  // --- État local ---
  const [loading, setLoading] = useState(false)
  const [showNote, setShowNote] = useState(false)
  const [adminNote, setAdminNote] = useState('')
  const router = useRouter()

  /**
   * Traiter le signalement — appel PATCH vers l'API admin.
   *
   * @param status - Nouveau statut ('confirmed' | 'dismissed')
   *
   * Exemple d'appel interne :
   *   handleAction('confirmed') → PATCH /api/admin/reports/clrpt456
   *   Body : { status: 'confirmed', adminNote: '...' }
   */
  const handleAction = async (status: 'confirmed' | 'dismissed') => {
    setLoading(true)

    try {
      const response = await fetch(`/api/admin/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          adminNote: adminNote || undefined,
        }),
      })

      if (response.ok) {
        // Rafraîchir la page serveur pour mettre à jour la liste
        router.refresh()
      } else {
        // En cas d'erreur, afficher dans la console
        const data = await response.json()
        console.error('Erreur lors du traitement du signalement:', data.error)
      }
    } catch (error) {
      console.error('Erreur réseau:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* --- Boutons d'action principaux --- */}
      <div className="flex gap-2">
        {/* Bouton Confirmer — style rouge (action destructive pour l'annonce) */}
        <button
          onClick={() => handleAction('confirmed')}
          disabled={loading}
          className="rounded-lg bg-[#E63946] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#C62E3A] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {labels.confirm}
        </button>

        {/* Bouton Rejeter — style gris (action neutre) */}
        <button
          onClick={() => handleAction('dismissed')}
          disabled={loading}
          className="rounded-lg bg-[#6B7280] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#4B5563] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {labels.dismiss}
        </button>

        {/* Toggle pour afficher le champ de note admin */}
        <button
          onClick={() => setShowNote(!showNote)}
          className="rounded-lg border border-[#E5E0D8] px-2 py-1.5 text-xs text-[#6B7280] transition-colors hover:bg-[#F5F0EA]"
          title={labels.adminNote}
        >
          {/* Icone crayon pour indiquer la possibilité d'ajouter une note */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          </svg>
        </button>
      </div>

      {/* --- Champ de note admin (affiché si toggle actif) --- */}
      {showNote && (
        <input
          type="text"
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
          placeholder={labels.adminNotePlaceholder}
          className="rounded-lg border border-[#E5E0D8] px-3 py-1.5 text-xs text-[#374151] placeholder:text-[#9CA3AF] focus:border-[#2D6A4F] focus:outline-none focus:ring-1 focus:ring-[#2D6A4F]"
        />
      )}
    </div>
  )
}
