/**
 * Route API pour les recherches sauvegardées — GET, POST, DELETE.
 *
 * Rôle :
 *   Permettre aux utilisateurs authentifiés de sauvegarder des critères de recherche.
 *   Le cron quotidien (/api/cron/alerts) matche ensuite les nouvelles annonces
 *   avec ces critères et envoie un email d'alerte.
 *
 * Interactions :
 *   - Prisma (db) : lecture/écriture dans la table saved_search
 *   - Better Auth (auth) : vérification de session (obligatoire pour toutes les actions)
 *   - Zod (savedSearchSchema) : validation du body pour la création
 *
 * Endpoints :
 *   GET    /api/saved-searches         — Lister les recherches sauvegardées de l'utilisateur
 *   POST   /api/saved-searches         — Créer une nouvelle recherche sauvegardée
 *   DELETE /api/saved-searches?id=xxx  — Supprimer une recherche sauvegardée par son ID
 *
 * Exemple d'appel GET :
 *   GET /api/saved-searches
 *   Headers : { Cookie: "better-auth.session_token=..." }
 *   Réponse : { savedSearches: [...] }
 *
 * Exemple d'appel POST :
 *   POST /api/saved-searches
 *   Body : { "city": "Douala", "terrainType": "residential", "maxPrice": 10000000 }
 *   Réponse : { savedSearch: { id: "cls123", city: "Douala", ... } }
 *
 * Exemple d'appel DELETE :
 *   DELETE /api/saved-searches?id=cls123
 *   Réponse : { success: true }
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { savedSearchSchema } from '@/lib/validations/report'

/**
 * GET /api/saved-searches — Lister les recherches sauvegardées de l'utilisateur connecté.
 *
 * Flux :
 *   1. Vérifier l'authentification
 *   2. Récupérer toutes les recherches de l'utilisateur, triées par date de création
 *   3. Retourner la liste
 *
 * Réponse :
 *   200 : { savedSearches: SavedSearch[] }
 *   401 : { error: string } — non authentifié
 *   500 : { error: string } — erreur serveur
 */
export async function GET(request: NextRequest) {
  try {
    // --- 1. Vérifier l'authentification ---
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      )
    }

    // --- 2. Récupérer les recherches sauvegardées de l'utilisateur ---
    // Triées par date de création décroissante (les plus récentes en premier)
    const savedSearches = await db.savedSearch.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    })

    // --- 3. Retourner la liste ---
    // Note : les champs BigInt (minPrice, maxPrice) sont sérialisés automatiquement
    // par Next.js en JSON (converti en string pour éviter la perte de précision)
    return NextResponse.json({ savedSearches })
  } catch (error) {
    console.error('[GET /api/saved-searches] Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur serveur lors de la récupération des recherches sauvegardées' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/saved-searches — Créer une nouvelle recherche sauvegardée.
 *
 * Prérequis :
 *   - L'utilisateur doit être authentifié
 *   - Le body doit respecter savedSearchSchema (tous les champs sont optionnels)
 *
 * Flux :
 *   1. Vérifier l'authentification
 *   2. Valider le body avec Zod
 *   3. Créer la recherche sauvegardée en base de données
 *   4. Retourner la recherche créée
 *
 * Réponse :
 *   201 : { savedSearch: SavedSearch } — recherche créée
 *   401 : { error: string } — non authentifié
 *   400 : { error: string } — données invalides
 *   500 : { error: string } — erreur serveur
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

    // --- 2. Parser et valider le body ---
    // savedSearchSchema valide les critères de recherche :
    //   city (string, optionnel), quarter (string, optionnel),
    //   terrainType (string, optionnel), minPrice/maxPrice (number > 0, optionnel),
    //   minSurface/maxSurface (number > 0, optionnel)
    const body = await request.json()
    const parsed = savedSearchSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // --- 3. Créer la recherche sauvegardée ---
    // lastNotifiedAt est null au départ (aucune notification encore envoyée)
    // Les prix sont convertis en BigInt pour correspondre au schéma Prisma
    const savedSearch = await db.savedSearch.create({
      data: {
        userId: session.user.id,
        city: parsed.data.city || null,
        quarter: parsed.data.quarter || null,
        terrainType: parsed.data.terrainType || null,
        // Conversion en BigInt pour les champs prix (stockés en BigInt dans Prisma)
        minPrice: parsed.data.minPrice ? BigInt(parsed.data.minPrice) : null,
        maxPrice: parsed.data.maxPrice ? BigInt(parsed.data.maxPrice) : null,
        // Les surfaces restent en Decimal (gérées par Prisma)
        minSurface: parsed.data.minSurface ?? null,
        maxSurface: parsed.data.maxSurface ?? null,
      },
    })

    console.info(
      `[POST /api/saved-searches] Recherche sauvegardée créée : ` +
      `id=${savedSearch.id}, utilisateur=${session.user.id}`
    )

    // --- 4. Retourner la recherche créée ---
    return NextResponse.json({ savedSearch }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/saved-searches] Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur serveur lors de la création de la recherche sauvegardée' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/saved-searches?id=xxx — Supprimer une recherche sauvegardée.
 *
 * Prérequis :
 *   - L'utilisateur doit être authentifié
 *   - L'ID de la recherche doit être fourni en query parameter
 *   - L'utilisateur doit être propriétaire de la recherche
 *
 * Flux :
 *   1. Vérifier l'authentification
 *   2. Extraire l'ID du query parameter
 *   3. Vérifier que la recherche existe ET appartient à l'utilisateur
 *   4. Supprimer la recherche
 *   5. Retourner un succès
 *
 * Réponse :
 *   200 : { success: true } — recherche supprimée
 *   401 : { error: string } — non authentifié
 *   400 : { error: string } — ID manquant
 *   404 : { error: string } — recherche introuvable ou pas propriétaire
 *   500 : { error: string } — erreur serveur
 */
export async function DELETE(request: NextRequest) {
  try {
    // --- 1. Vérifier l'authentification ---
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      )
    }

    // --- 2. Extraire l'ID du query parameter ---
    // Format attendu : DELETE /api/saved-searches?id=cls123
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'L\'identifiant de la recherche sauvegardée (id) est requis en query parameter' },
        { status: 400 }
      )
    }

    // --- 3. Vérifier que la recherche existe ET appartient à l'utilisateur ---
    // On combine les deux vérifications en une seule requête
    // pour éviter les attaques par énumération (ne pas révéler si l'ID existe
    // pour un autre utilisateur)
    const savedSearch = await db.savedSearch.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!savedSearch) {
      return NextResponse.json(
        { error: 'Recherche sauvegardée introuvable' },
        { status: 404 }
      )
    }

    // --- 4. Supprimer la recherche ---
    await db.savedSearch.delete({
      where: { id },
    })

    console.info(
      `[DELETE /api/saved-searches] Recherche supprimée : ` +
      `id=${id}, utilisateur=${session.user.id}`
    )

    // --- 5. Retourner un succès ---
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/saved-searches] Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur serveur lors de la suppression de la recherche sauvegardée' },
      { status: 500 }
    )
  }
}
