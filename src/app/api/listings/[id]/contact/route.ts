/**
 * Route API pour le tracking des clics "Contacter sur WhatsApp".
 *
 * Rôle :
 *   Enregistrer chaque clic sur le bouton WhatsApp d'une annonce.
 *   Utilisé par le composant ContactButton via navigator.sendBeacon
 *   (fire-and-forget, décision eng review #14).
 *
 * Interactions :
 *   - Prisma (db) : incrémenter contactCount + créer contactEvent
 *   - Better Auth (auth) : récupérer l'ID utilisateur (optionnel, peut être null)
 *
 * Endpoint : POST /api/listings/[id]/contact
 *
 * Exemple d'appel (via sendBeacon dans le navigateur) :
 *   navigator.sendBeacon('/api/listings/clxyz123abc/contact')
 *
 * Exemple de réponse :
 *   { success: true }
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'

// --- Type des paramètres de la route dynamique ---
type ContactRouteContext = {
  params: Promise<{ id: string }>
}

/**
 * POST /api/listings/[id]/contact — Enregistrer un clic "Contacter".
 *
 * Flux :
 *   1. Extraire l'ID de l'annonce depuis les paramètres de route
 *   2. Vérifier que l'annonce existe
 *   3. Récupérer l'ID utilisateur si connecté (optionnel pour sendBeacon)
 *   4. Créer un événement de contact (contact_event)
 *   5. Incrémenter le compteur de contacts sur l'annonce
 *   6. Retourner un succès (le client n'attend pas la réponse)
 *
 * Notes :
 *   - L'authentification est OPTIONNELLE (l'utilisateur peut ne pas être connecté)
 *   - sendBeacon envoie un POST avec Content-Type text/plain (pas de JSON body)
 *   - On ne bloque jamais l'utilisateur : erreurs silencieuses côté tracking
 *
 * Réponse :
 *   200 : { success: true }
 *   404 : { error: string } si l'annonce n'existe pas
 *   500 : { error: string } si erreur serveur
 */
export async function POST(
  request: NextRequest,
  context: ContactRouteContext
) {
  try {
    const { id } = await context.params

    // --- 1. Vérifier que l'annonce existe ---
    // On vérifie l'existence avant de créer l'événement pour éviter
    // les enregistrements orphelins (annonce supprimée entre-temps)
    const listing = await db.listing.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!listing) {
      return NextResponse.json(
        { error: 'Annonce introuvable' },
        { status: 404 }
      )
    }

    // --- 2. Récupérer l'ID utilisateur si connecté ---
    // L'authentification est optionnelle pour le tracking.
    // sendBeacon peut ne pas inclure les cookies de session dans certains cas.
    let userId: string | null = null
    try {
      const session = await auth.api.getSession({ headers: request.headers })
      userId = session?.user?.id ?? null
    } catch {
      // Ignorer les erreurs d'authentification — l'utilisateur peut être non connecté
      // ou le sendBeacon peut ne pas envoyer les cookies
    }

    // --- 3. Transaction Prisma : créer l'événement + incrémenter le compteur ---
    // On utilise une transaction pour garantir la cohérence entre
    // le compteur (contactCount) et les événements détaillés (contact_event)
    await db.$transaction([
      // Créer l'événement de contact avec l'horodatage
      db.contactEvent.create({
        data: {
          listingId: id,
          userId, // null si utilisateur non connecté
        },
      }),
      // Incrémenter le compteur brut de contacts sur l'annonce
      db.listing.update({
        where: { id },
        data: {
          contactCount: { increment: 1 },
        },
      }),
    ])

    // --- 4. Retourner un succès ---
    // Le client (sendBeacon) n'attend pas cette réponse,
    // mais on la retourne pour les appels fetch classiques
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[POST /api/listings/[id]/contact] Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur serveur lors de l\'enregistrement du contact' },
      { status: 500 }
    )
  }
}
