/**
 * Route API pour les favoris — POST (toggle) + GET (liste).
 *
 * Rôle :
 *   - POST /api/favorites : ajouter ou retirer une annonce des favoris (toggle)
 *   - GET /api/favorites : lister les IDs des annonces en favori de l'utilisateur
 *
 * Interactions :
 *   - Prisma (db) : lecture/écriture dans la table favorite
 *   - Better Auth (auth) : vérification de session (authentification requise)
 *
 * Exemple d'appel POST (toggle) :
 *   POST /api/favorites
 *   Body : { listingId: "clxyz123" }
 *   → { favorited: true } ou { favorited: false }
 *
 * Exemple d'appel GET (liste des IDs) :
 *   GET /api/favorites
 *   → { listingIds: ["clxyz123", "clabc456"] }
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'

/**
 * POST /api/favorites — Toggle un favori (ajouter ou retirer).
 *
 * Si l'annonce est déjà en favori → la retirer.
 * Si l'annonce n'est pas en favori → l'ajouter.
 *
 * Body : { listingId: string }
 * Réponse : { favorited: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    // --- 1. Vérifier l'authentification ---
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      )
    }

    // --- 2. Extraire le listingId du body ---
    const body = await request.json()
    const { listingId } = body

    if (!listingId || typeof listingId !== 'string') {
      return NextResponse.json(
        { error: 'listingId requis' },
        { status: 400 }
      )
    }

    // --- 3. Vérifier si le favori existe déjà ---
    const existing = await db.favorite.findUnique({
      where: {
        userId_listingId: {
          userId: session.user.id,
          listingId,
        },
      },
    })

    if (existing) {
      // --- Retirer le favori ---
      await db.favorite.delete({ where: { id: existing.id } })
      return NextResponse.json({ favorited: false })
    } else {
      // --- Ajouter le favori ---
      await db.favorite.create({
        data: {
          userId: session.user.id,
          listingId,
        },
      })
      return NextResponse.json({ favorited: true })
    }
  } catch (error) {
    console.error('[POST /api/favorites] Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/favorites — Lister les IDs des annonces en favori.
 *
 * Retourne uniquement les IDs (pas les détails complets)
 * pour vérifier rapidement si une annonce est en favori côté client.
 *
 * Réponse : { listingIds: string[] }
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      )
    }

    const favorites = await db.favorite.findMany({
      where: { userId: session.user.id },
      select: { listingId: true },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      listingIds: favorites.map((f) => f.listingId),
    })
  } catch (error) {
    console.error('[GET /api/favorites] Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
