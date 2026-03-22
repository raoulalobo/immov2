/**
 * Bouton "Contacter sur WhatsApp" — composant CLIENT.
 *
 * Rôle :
 *   Ouvre immédiatement un lien wa.me dans un nouvel onglet avec un message
 *   pré-rempli, puis envoie un événement de tracking en arrière-plan
 *   via navigator.sendBeacon (fire-and-forget, décision eng review #14).
 *
 * Interactions :
 *   - Ouvre wa.me/<phone>?text=... dans un nouvel onglet au clic
 *   - POST /api/listings/[id]/contact via sendBeacon (aucune attente de réponse)
 *
 * Exemple d'usage :
 *   <ContactButton
 *     listingId="clxyz123abc"
 *     vendorPhone="+237691234567"
 *     city="Douala"
 *     surface="500"
 *     price="15 000 000"
 *   />
 *
 * Props :
 *   - listingId : identifiant unique de l'annonce (pour le tracking)
 *   - vendorPhone : numéro WhatsApp du vendeur (format international)
 *   - city : ville de l'annonce (incluse dans le message pré-rempli)
 *   - surface : surface formatée en m² (ex: "500")
 *   - price : prix formaté en FCFA (ex: "15 000 000")
 */
'use client'

import { useTranslations } from 'next-intl'

// --- Types des props du composant ---
interface ContactButtonProps {
  /** Identifiant unique de l'annonce (ex: "clxyz123abc") */
  listingId: string
  /** Numéro WhatsApp du vendeur au format international (ex: "+237691234567") */
  vendorPhone: string
  /** Ville de l'annonce (ex: "Douala") */
  city: string
  /** Surface formatée en m² (ex: "500") */
  surface: string
  /** Prix formaté en FCFA (ex: "15 000 000") */
  price: string
}

export function ContactButton({
  listingId,
  vendorPhone,
  city,
  surface,
  price,
}: ContactButtonProps) {
  const t = useTranslations('listing')

  /**
   * handleClick — gestionnaire du clic sur le bouton WhatsApp.
   *
   * Flux :
   *   1. Construire l'URL wa.me avec le message pré-rempli
   *   2. Ouvrir l'URL dans un nouvel onglet (window.open)
   *   3. Envoyer le tracking via sendBeacon (fire-and-forget)
   *
   * Le sendBeacon est envoyé APRÈS l'ouverture de wa.me pour garantir
   * que l'utilisateur n'attend pas le tracking. Le beacon survit
   * même si l'utilisateur quitte la page (contrairement à fetch).
   *
   * Exemple de message pré-rempli :
   *   "Bonjour, je suis intéressé par votre terrain à Douala (500 m², 15 000 000 FCFA). Réf: #IMV-clxyz123. Vu sur ImmoV2."
   */
  const handleClick = () => {
    // --- 1. Nettoyer le numéro de téléphone (retirer espaces, tirets, etc.) ---
    // Exemple : "+237 691 234 567" → "237691234567"
    const cleanPhone = vendorPhone.replace(/[^0-9]/g, '')

    // --- 2. Construire le message pré-rempli pour WhatsApp ---
    // Inclut la ville, surface, prix et référence pour contexte immédiat
    const reference = `#IMV-${listingId.slice(0, 8)}`
    const message = encodeURIComponent(
      `Bonjour, je suis intéressé par votre terrain à ${city} (${surface} m², ${price} FCFA). Réf: ${reference}. Vu sur ImmoV2.`
    )

    // --- 3. Construire l'URL WhatsApp ---
    // Format : https://wa.me/<numéro>?text=<message encodé>
    const waUrl = `https://wa.me/${cleanPhone}?text=${message}`

    // --- 4. Ouvrir WhatsApp dans un nouvel onglet ---
    // window.open avec '_blank' pour ne pas quitter la page de l'annonce
    window.open(waUrl, '_blank', 'noopener,noreferrer')

    // --- 5. Tracking fire-and-forget via sendBeacon ---
    // sendBeacon est asynchrone et survit à la fermeture de la page.
    // On envoie un POST vers l'API de tracking des contacts.
    // Si sendBeacon n'est pas supporté (très rare), on ignore silencieusement.
    try {
      const trackingUrl = `/api/listings/${listingId}/contact`
      // sendBeacon envoie un POST avec Content-Type text/plain par défaut
      // L'API route gère ce format côté serveur
      navigator.sendBeacon(trackingUrl)
    } catch {
      // Ignorer les erreurs de tracking — le contact WhatsApp est prioritaire.
      // Le tracking est un bonus, pas un bloquant pour l'utilisateur.
      console.warn('[ContactButton] sendBeacon non supporté ou échoué')
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1da851]"
      aria-label={t('contactWhatsapp')}
    >
      {/* Icône WhatsApp (SVG inline pour éviter une dépendance externe) */}
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
      {t('contactWhatsapp')}
    </button>
  )
}
