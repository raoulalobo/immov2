/**
 * Bouton de suppression de compte — composant CLIENT.
 *
 * Role :
 *   Affiche un bouton "Supprimer mon compte" avec une modale de confirmation.
 *   Au clic confirme, envoie une requete DELETE vers /api/account puis
 *   deconnecte l'utilisateur et redirige vers la page d'accueil.
 *
 * Interactions :
 *   - API /api/account : appel DELETE pour soft-delete du compte
 *   - authClient (Better Auth) : deconnexion cote client apres suppression
 *   - useRouter (i18n) : redirection vers la page d'accueil
 *
 * Flux utilisateur :
 *   1. Clic sur "Supprimer mon compte"
 *   2. Modale de confirmation avec champ de saisie "SUPPRIMER"
 *   3. Si confirme → DELETE /api/account
 *   4. Si succes → signOut + redirect "/"
 *   5. Si erreur → message d'erreur affiche
 *
 * Exemple d'usage :
 *   <DeleteAccountButton />
 */
'use client'

import { useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'

export function DeleteAccountButton() {
  // --- Etat local ---
  // showConfirm : affiche ou masque la modale de confirmation
  const [showConfirm, setShowConfirm] = useState(false)
  // confirmText : texte saisi par l'utilisateur pour confirmer la suppression
  const [confirmText, setConfirmText] = useState('')
  // isDeleting : true pendant l'appel API (empeche les double-clics)
  const [isDeleting, setIsDeleting] = useState(false)
  // error : message d'erreur en cas d'echec de l'API
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const t = useTranslations('dashboard')

  /**
   * Gere la suppression du compte :
   * 1. Appelle DELETE /api/account pour soft-delete + anonymisation
   * 2. Deconnecte l'utilisateur via Better Auth
   * 3. Redirige vers la page d'accueil
   */
  async function handleDelete() {
    setIsDeleting(true)
    setError(null)

    try {
      // --- Appel API de suppression ---
      const response = await fetch('/api/account', {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de la suppression du compte')
      }

      // --- Deconnexion cote client ---
      // Better Auth invalide la session locale et supprime les cookies
      await authClient.signOut()

      // --- Redirection vers l'accueil ---
      router.push('/')
    } catch (err) {
      // Affiche le message d'erreur a l'utilisateur
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      setIsDeleting(false)
    }
  }

  return (
    <div className="mt-4">
      {!showConfirm ? (
        /* --- Bouton initial de suppression --- */
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="rounded-lg border border-[#E63946]/30 px-4 py-2 text-sm font-semibold text-[#E63946] transition-colors hover:bg-[#E63946]/5"
        >
          {t('deleteAccount')}
        </button>
      ) : (
        /* --- Zone de confirmation --- */
        <div className="space-y-3 rounded-lg border border-[#E63946]/20 bg-[#E63946]/5 p-4">
          {/* Instruction : taper "SUPPRIMER" pour confirmer */}
          <p className="text-sm font-medium text-[#E63946]">
            Tapez <strong>SUPPRIMER</strong> pour confirmer la suppression de votre compte.
          </p>

          {/* Champ de saisie de confirmation */}
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="SUPPRIMER"
            className="w-full rounded-lg border border-[#E8E0D5] bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-[#E63946] focus:outline-none focus:ring-1 focus:ring-[#E63946]"
            disabled={isDeleting}
          />

          {/* Message d'erreur eventuel */}
          {error && (
            <p className="text-xs text-[#E63946]">{error}</p>
          )}

          {/* Boutons d'action */}
          <div className="flex gap-3">
            {/* Bouton de confirmation — desactive tant que le texte ne correspond pas */}
            <button
              type="button"
              onClick={handleDelete}
              disabled={confirmText !== 'SUPPRIMER' || isDeleting}
              className="rounded-lg bg-[#E63946] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#E63946]/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDeleting ? 'Suppression...' : 'Confirmer la suppression'}
            </button>

            {/* Bouton d'annulation — ferme la modale */}
            <button
              type="button"
              onClick={() => {
                setShowConfirm(false)
                setConfirmText('')
                setError(null)
              }}
              disabled={isDeleting}
              className="rounded-lg border border-[#E8E0D5] bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
