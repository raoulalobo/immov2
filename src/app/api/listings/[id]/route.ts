/**
 * Route API pour une annonce individuelle — GET (détail) + PATCH (mise à jour).
 *
 * Rôle :
 *   - GET /api/listings/[id] : récupérer le détail d'une annonce
 *   - PATCH /api/listings/[id] : modifier une annonce (propriétaire uniquement)
 *
 * Interactions :
 *   - Prisma (db) : lecture/écriture dans la table listing
 *   - Better Auth (auth) : vérification de session pour PATCH
 *   - Zod (updateListingSchema) : validation des données de mise à jour
 *
 * Exemple d'appel PATCH :
 *   PATCH /api/listings/clxyz123
 *   Body : { title: "Nouveau titre", priceFcfa: 20000000 }
 *   Headers : { Cookie: "better-auth.session_token=..." }
 *
 * Réponses :
 *   200 : { listing: Listing } — annonce mise à jour
 *   401 : { error: string } — non authentifié
 *   403 : { error: string } — pas le propriétaire
 *   404 : { error: string } — annonce introuvable
 *   400 : { error: string } — données invalides
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { updateListingSchema } from '@/lib/validations/listing'
import { LISTING_EXPIRY_DAYS } from '@/lib/constants'

/**
 * GET /api/listings/[id] — Récupérer le détail d'une annonce.
 *
 * Accessible sans authentification (annonces publiques).
 * Inclut : vendeur, photos, nombre de signalements.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const listing = await db.listing.findUnique({
      where: { id },
      include: {
        vendor: {
          select: { id: true, name: true, phone: true, isVerified: true, image: true },
        },
        photos: { orderBy: { position: 'asc' } },
      },
    })

    if (!listing) {
      return NextResponse.json({ error: 'Annonce introuvable' }, { status: 404 })
    }

    // Sérialiser BigInt/Decimal
    return NextResponse.json({
      listing: {
        ...listing,
        priceFcfa: Number(listing.priceFcfa),
        surfaceM2: Number(listing.surfaceM2),
      },
    })
  } catch (error) {
    console.error('[GET /api/listings/[id]] Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * PATCH /api/listings/[id] — Modifier une annonce existante.
 *
 * Prérequis :
 *   - L'utilisateur doit être authentifié
 *   - L'utilisateur doit être le propriétaire de l'annonce (vendorId)
 *
 * Champs modifiables :
 *   title, description, priceFcfa, surfaceM2, terrainType, city, quarter, status
 *   Tous les champs sont optionnels (PATCH partiel).
 *
 * Logique métier :
 *   - Si le statut passe de "draft" à "active", on définit expiresAt (90 jours)
 *   - Si le statut passe à "sold", l'annonce est archivée
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // --- 1. Vérifier l'authentification ---
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      )
    }

    // --- 2. Vérifier que l'annonce existe et appartient à l'utilisateur ---
    const existing = await db.listing.findUnique({
      where: { id },
      select: { vendorId: true, status: true },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Annonce introuvable' },
        { status: 404 }
      )
    }

    if (existing.vendorId !== session.user.id) {
      return NextResponse.json(
        { error: 'Vous n\'êtes pas le propriétaire de cette annonce' },
        { status: 403 }
      )
    }

    // --- 3. Parser et valider le body ---
    const body = await request.json()
    const parsed = updateListingSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // --- 4. Construire les données de mise à jour ---
    const updateData: Record<string, unknown> = {}

    // Copier uniquement les champs fournis (PATCH partiel)
    if (parsed.data.title !== undefined) updateData.title = parsed.data.title
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description
    if (parsed.data.terrainType !== undefined) updateData.terrainType = parsed.data.terrainType
    if (parsed.data.city !== undefined) updateData.city = parsed.data.city
    if (parsed.data.quarter !== undefined) updateData.quarter = parsed.data.quarter
    if (parsed.data.latitude !== undefined) updateData.latitude = parsed.data.latitude
    if (parsed.data.longitude !== undefined) updateData.longitude = parsed.data.longitude

    // Conversion BigInt pour le prix
    if (parsed.data.priceFcfa !== undefined) {
      updateData.priceFcfa = BigInt(parsed.data.priceFcfa)
    }

    // Surface en Decimal
    if (parsed.data.surfaceM2 !== undefined) {
      updateData.surfaceM2 = parsed.data.surfaceM2
    }

    // Vidéo : set ou null pour supprimer
    if (parsed.data.videoPath !== undefined) {
      updateData.videoPath = parsed.data.videoPath
    }

    // Gestion du changement de statut
    if (parsed.data.status !== undefined) {
      updateData.status = parsed.data.status

      // Si passage en "active" depuis "draft" → définir expiresAt
      if (parsed.data.status === 'active' && existing.status === 'draft') {
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + LISTING_EXPIRY_DAYS)
        updateData.expiresAt = expiresAt
      }
    }

    // --- 5. Mettre à jour l'annonce ---
    const listing = await db.listing.update({
      where: { id },
      data: updateData,
    })

    // --- 6. Retourner l'annonce mise à jour ---
    return NextResponse.json({
      listing: {
        ...listing,
        priceFcfa: Number(listing.priceFcfa),
        surfaceM2: Number(listing.surfaceM2),
      },
    })
  } catch (error) {
    console.error('[PATCH /api/listings/[id]] Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur serveur lors de la mise à jour' },
      { status: 500 }
    )
  }
}
