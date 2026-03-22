/**
 * Utilitaire d'envoi d'emails via Resend — centralise tous les emails du projet.
 *
 * Rôle :
 *   Fournir des fonctions typées pour chaque type d'email envoyé par ImmoV2.
 *   Si la clé API Resend n'est pas configurée (RESEND_API_KEY), les emails
 *   sont loggués en console au lieu d'être envoyés (mode dev gracieux).
 *
 * Interactions :
 *   - Resend SDK : envoi effectif des emails en production
 *   - Cron daily-digest : appelle sendDigestEmail() et sendExpiryWarning()
 *   - Cron alerts : appelle sendAlertEmail()
 *   - Admin verification : appelle sendVerificationResult()
 *
 * Exemple d'usage :
 *   import { sendDigestEmail } from '@/lib/email'
 *   await sendDigestEmail('vendeur@example.com', [
 *     { title: 'Terrain Douala', contactCount: 5 },
 *   ])
 */
import { Resend } from 'resend'

// --- Initialisation du client Resend ---
// Si RESEND_API_KEY n'est pas défini, resend sera null
// et les fonctions d'envoi loggueront au lieu d'envoyer
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

// --- Adresse expéditeur par défaut ---
// Doit correspondre au domaine vérifié dans Resend
const FROM_EMAIL = process.env.FROM_EMAIL || 'ImmoV2 <noreply@immov2.cm>'

// ============================================================
// TYPES
// ============================================================

/** Résumé d'une annonce pour le digest quotidien */
export interface DigestListingInfo {
  /** Titre de l'annonce */
  title: string
  /** Nombre de contacts reçus dans la journée */
  contactCount: number
}

/** Résumé d'une annonce pour l'alerte de recherche sauvegardée */
export interface AlertListingInfo {
  /** Titre de l'annonce */
  title: string
  /** Ville de l'annonce */
  city: string
  /** Prix en FCFA */
  priceFcfa: bigint | number
  /** Surface en m2 */
  surfaceM2: number | string
}

/** Résumé d'une recherche sauvegardée pour l'email d'alerte */
export interface SavedSearchInfo {
  /** Ville filtrée (optionnel) */
  city?: string | null
  /** Type de terrain filtré (optionnel) */
  terrainType?: string | null
}

/** Info d'une annonce pour l'avertissement d'expiration */
export interface ExpiryListingInfo {
  /** Titre de l'annonce */
  title: string
  /** Date d'expiration */
  expiresAt: Date
}

// ============================================================
// FONCTION INTERNE D'ENVOI
// ============================================================

/**
 * Envoie un email via Resend ou logue en console si la clé API n'est pas configurée.
 *
 * @param to - Adresse email du destinataire
 * @param subject - Sujet de l'email
 * @param text - Contenu texte brut de l'email
 * @returns true si l'envoi a réussi (ou loggué), false en cas d'erreur
 *
 * Exemple :
 *   await sendEmail('user@example.com', 'Sujet', 'Contenu du message')
 */
async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  // --- Mode dev : pas de clé API, on logue ---
  if (!resend) {
    console.info(
      `[email] (mode dev, pas de RESEND_API_KEY) Email simulé :\n` +
      `  To: ${to}\n` +
      `  Subject: ${subject}\n` +
      `  Body:\n${text}\n`
    )
    return true
  }

  try {
    // --- Envoi via Resend ---
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      text,
    })

    if (error) {
      console.error(`[email] Erreur Resend pour ${to}:`, error)
      return false
    }

    return true
  } catch (err) {
    console.error(`[email] Exception lors de l'envoi à ${to}:`, err)
    return false
  }
}

// ============================================================
// FONCTIONS PUBLIQUES
// ============================================================

/**
 * Envoie le digest quotidien des contacts reçus sur les annonces d'un vendeur.
 *
 * Appelé par : /api/cron/daily-digest
 *
 * @param to - Email du vendeur
 * @param listings - Liste des annonces avec leur nombre de contacts du jour
 *
 * Exemple :
 *   await sendDigestEmail('vendeur@example.com', [
 *     { title: 'Terrain 500m2 Douala', contactCount: 3 },
 *     { title: 'Terrain Yaoundé centre', contactCount: 1 },
 *   ])
 *   // => Email envoyé avec le récapitulatif
 */
export async function sendDigestEmail(
  to: string,
  listings: DigestListingInfo[]
): Promise<boolean> {
  // --- Construire le corps du message ---
  // Lister chaque annonce avec son nombre de contacts du jour
  const listingLines = listings
    .map((l) => `  - "${l.title}" : ${l.contactCount} contact(s)`)
    .join('\n')

  const totalContacts = listings.reduce((sum, l) => sum + l.contactCount, 0)

  const text =
    `Bonjour,\n\n` +
    `Voici le récapitulatif de vos contacts du jour sur ImmoV2 :\n\n` +
    `${listingLines}\n\n` +
    `Total : ${totalContacts} contact(s) sur ${listings.length} annonce(s).\n\n` +
    `Connectez-vous sur ImmoV2 pour consulter vos annonces.\n\n` +
    `Cordialement,\n` +
    `L'équipe ImmoV2`

  return sendEmail(to, `ImmoV2 — ${totalContacts} contact(s) aujourd'hui`, text)
}

/**
 * Envoie un avertissement d'expiration imminente pour une annonce.
 *
 * Appelé par : /api/cron/daily-digest (section expiry warnings)
 *
 * @param to - Email du vendeur
 * @param listing - Informations sur l'annonce qui expire bientôt
 *
 * Exemple :
 *   await sendExpiryWarning('vendeur@example.com', {
 *     title: 'Terrain Douala 500m2',
 *     expiresAt: new Date('2026-04-01'),
 *   })
 */
export async function sendExpiryWarning(
  to: string,
  listing: ExpiryListingInfo
): Promise<boolean> {
  const expiryDate = listing.expiresAt.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const text =
    `Bonjour,\n\n` +
    `Votre annonce "${listing.title}" expire le ${expiryDate}.\n\n` +
    `Si vous souhaitez la prolonger, connectez-vous sur ImmoV2 et renouvelez-la ` +
    `avant sa date d'expiration.\n\n` +
    `Si votre terrain a été vendu, vous pouvez marquer l'annonce comme "Vendu".\n\n` +
    `Cordialement,\n` +
    `L'équipe ImmoV2`

  return sendEmail(to, `ImmoV2 — Votre annonce "${listing.title}" expire bientôt`, text)
}

/**
 * Envoie une alerte de nouvelles annonces correspondant à une recherche sauvegardée.
 *
 * Appelé par : /api/cron/alerts
 *
 * @param to - Email de l'acheteur
 * @param savedSearch - Critères de la recherche sauvegardée (pour contexte)
 * @param matchingListings - Nouvelles annonces qui correspondent aux critères
 *
 * Exemple :
 *   await sendAlertEmail('acheteur@example.com', { city: 'Douala' }, [
 *     { title: 'Terrain Bonaberi', city: 'Douala', priceFcfa: 5000000, surfaceM2: 300 },
 *   ])
 */
export async function sendAlertEmail(
  to: string,
  savedSearch: SavedSearchInfo,
  matchingListings: AlertListingInfo[]
): Promise<boolean> {
  // --- Décrire les critères de recherche pour le contexte ---
  const criteriaParts: string[] = []
  if (savedSearch.city) criteriaParts.push(`ville: ${savedSearch.city}`)
  if (savedSearch.terrainType) criteriaParts.push(`type: ${savedSearch.terrainType}`)
  const criteriaText = criteriaParts.length > 0
    ? criteriaParts.join(', ')
    : 'tous critères'

  // --- Lister les annonces correspondantes ---
  const listingLines = matchingListings
    .map(
      (l) =>
        `  - "${l.title}" — ${l.city} — ` +
        `${Number(l.priceFcfa).toLocaleString('fr-FR')} FCFA — ` +
        `${l.surfaceM2} m2`
    )
    .join('\n')

  const text =
    `Bonjour,\n\n` +
    `${matchingListings.length} nouvelle(s) annonce(s) correspondent à votre ` +
    `recherche sauvegardée (${criteriaText}) :\n\n` +
    `${listingLines}\n\n` +
    `Connectez-vous sur ImmoV2 pour les consulter.\n\n` +
    `Cordialement,\n` +
    `L'équipe ImmoV2`

  return sendEmail(
    to,
    `ImmoV2 — ${matchingListings.length} nouvelle(s) annonce(s) pour vous`,
    text
  )
}

/**
 * Envoie le résultat de la vérification vendeur (approuvé ou rejeté).
 *
 * Appelé par : l'action admin de revue de vérification
 *
 * @param to - Email du vendeur
 * @param status - 'approved' ou 'rejected'
 * @param reason - Motif de rejet (uniquement si status = 'rejected')
 *
 * Exemple (approuvé) :
 *   await sendVerificationResult('vendeur@example.com', 'approved')
 *
 * Exemple (rejeté) :
 *   await sendVerificationResult('vendeur@example.com', 'rejected', 'Document illisible')
 */
export async function sendVerificationResult(
  to: string,
  status: 'approved' | 'rejected',
  reason?: string
): Promise<boolean> {
  if (status === 'approved') {
    const text =
      `Bonjour,\n\n` +
      `Bonne nouvelle ! Votre demande de vérification vendeur a été approuvée.\n\n` +
      `Le badge "Vendeur vérifié" est maintenant actif sur toutes vos annonces.\n` +
      `Ce badge renforce la confiance des acheteurs potentiels.\n\n` +
      `Cordialement,\n` +
      `L'équipe ImmoV2`

    return sendEmail(to, 'ImmoV2 — Vérification vendeur approuvée', text)
  }

  // --- Statut "rejected" ---
  const text =
    `Bonjour,\n\n` +
    `Votre demande de vérification vendeur a été rejetée.\n\n` +
    `Motif : ${reason || 'Non spécifié'}\n\n` +
    `Vous pouvez soumettre une nouvelle demande avec des documents conformes.\n\n` +
    `Cordialement,\n` +
    `L'équipe ImmoV2`

  return sendEmail(to, 'ImmoV2 — Vérification vendeur rejetée', text)
}
