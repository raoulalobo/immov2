/**
 * Route API admin pour la gestion du statut d'une annonce — PATCH uniquement.
 *
 * Rôle :
 *   Permettre à un administrateur de modifier le statut d'une annonce
 *   (activer, suspendre, etc.). Utilisé depuis le panneau d'administration
 *   pour la modération manuelle des annonces.
 *
 * Interactions :
 *   - Prisma (db) : mise à jour de la table listing
 *   - Better Auth (auth) : vérification de session + rôle admin
 *   - Constantes LISTING_STATUSES : statuts valides pour une annonce
 *
 * Endpoint : PATCH /api/admin/listings/[id]
 *
 * Exemple d'appel :
 *   PATCH /api/admin/listings/clxyz123
 *   Body : { "status": "suspended" }
 *   Headers : { Cookie: "better-auth.session_token=..." }
 *
 * Exemple de réponse (succès) :
 *   { listing: { id: "clxyz123", status: "suspended", ... } }
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { LISTING_STATUSES } from '@/lib/constants'

/**
 * PATCH /api/admin/listings/[id] — Modifier le statut d'une annonce.
 *
 * Prérequis :
 *   - L'utilisateur doit être authentifié avec le rôle 'admin'
 *   - Le body doit contenir un status valide (parmi LISTING_STATUSES)
 *
 * Flux :
 *   1. Vérifier l'authentification et le rôle admin
 *   2. Valider le body (status obligatoire et valide)
 *   3. Vérifier que l'annonce existe
 *   4. Mettre à jour le statut de l'annonce
 *   5. Retourner l'annonce mise à jour (avec BigInt/Decimal sérialisés)
 *
 * @param request - Requête HTTP entrante avec les headers de session
 * @param context - Contient les paramètres de route (id de l'annonce)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // --- 1. Vérifier l'authentification et le rôle admin ---
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      )
    }

    // Vérification du rôle admin — seul un admin peut modifier le statut
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Accès réservé aux administrateurs' },
        { status: 403 }
      )
    }

    // --- 2. Extraire l'ID depuis les paramètres de route ---
    const { id } = await params

    // --- 3. Parser et valider le body ---
    const body = await request.json()
    const { status } = body as { status?: string }

    // Le statut doit être l'un des statuts définis dans LISTING_STATUSES
    if (
      !status ||
      !LISTING_STATUSES.includes(status as (typeof LISTING_STATUSES)[number])
    ) {
      return NextResponse.json(
        {
          error: `Le statut doit être l'un de : ${LISTING_STATUSES.join(', ')}`,
        },
        { status: 400 }
      )
    }

    // --- 4. Vérifier que l'annonce existe ---
    const existingListing = await db.listing.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!existingListing) {
      return NextResponse.json(
        { error: 'Annonce introuvable' },
        { status: 404 }
      )
    }

    // --- 5. Mettre à jour le statut de l'annonce ---
    const updatedListing = await db.listing.update({
      where: { id },
      data: { status },
    })

    console.info(
      `[PATCH /api/admin/listings/${id}] Statut mis à jour vers "${status}" ` +
      `par l'admin ${session.user.id}`
    )

    // --- 6. Retourner l'annonce mise à jour ---
    // Sérialisation BigInt/Decimal pour JSON.stringify
    return NextResponse.json({
      listing: {
        ...updatedListing,
        priceFcfa: Number(updatedListing.priceFcfa),
        surfaceM2: Number(updatedListing.surfaceM2),
      },
    })
  } catch (error) {
    console.error('[PATCH /api/admin/listings] Erreur:', error)
    return NextResponse.json(
      { error: "Erreur serveur lors de la mise à jour de l'annonce" },
      { status: 500 }
    )
  }
}
