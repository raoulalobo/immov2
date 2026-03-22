/**
 * Route API pour les annonces — GET (liste) + POST (création).
 *
 * Rôle :
 *   - GET /api/listings : récupérer les annonces actives avec filtres et pagination
 *   - POST /api/listings : créer une nouvelle annonce (authentification requise)
 *
 * Interactions :
 *   - Prisma (db) : lecture/écriture dans la table listing
 *   - Better Auth (auth) : vérification de session pour POST
 *   - Zod (createListingSchema, searchListingsSchema) : validation des données
 *   - Constante LISTING_EXPIRY_DAYS : durée de vie par défaut (90 jours)
 *
 * Exemple d'appel GET :
 *   GET /api/listings?city=douala&terrainType=residential&page=1&limit=12
 *
 * Exemple d'appel POST :
 *   POST /api/listings
 *   Body : { title: "Terrain...", priceFcfa: 15000000, surfaceM2: 500, ... }
 *   Headers : { Cookie: "better-auth.session_token=..." }
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { LISTING_EXPIRY_DAYS } from '@/lib/constants'
import {
  createListingSchema,
  searchListingsSchema,
} from '@/lib/validations/listing'

/**
 * GET /api/listings — Lister les annonces actives avec filtres optionnels.
 *
 * Paramètres de requête (tous optionnels) :
 *   - city : filtrer par ville (ex: "douala")
 *   - quarter : filtrer par quartier
 *   - terrainType : filtrer par type ("residential", "commercial", "agricultural")
 *   - minPrice / maxPrice : fourchette de prix en FCFA
 *   - minSurface / maxSurface : fourchette de surface en m²
 *   - page : numéro de page (défaut: 1)
 *   - limit : nombre de résultats par page (défaut: 12, max: 50)
 *
 * Réponse :
 *   200 : { listings: Listing[], total: number, page: number, limit: number }
 *   400 : { error: string } si les paramètres sont invalides
 *   500 : { error: string } si erreur serveur
 *
 * Exemple de réponse :
 *   {
 *     listings: [{ id: "clxyz", title: "Terrain...", priceFcfa: 15000000, ... }],
 *     total: 42,
 *     page: 1,
 *     limit: 12
 *   }
 */
export async function GET(request: NextRequest) {
  try {
    // --- 1. Extraire et valider les paramètres de recherche ---
    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    const parsed = searchListingsSchema.safeParse(searchParams)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Paramètres de recherche invalides', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const {
      city,
      quarter,
      terrainType,
      minPrice,
      maxPrice,
      minSurface,
      maxSurface,
      page,
      limit,
    } = parsed.data

    // --- 2. Construire la clause WHERE Prisma dynamiquement ---
    // Seuls les filtres fournis sont ajoutés au filtre
    const where: Record<string, unknown> = {
      // Toujours filtrer sur les annonces actives uniquement
      status: 'active',
    }

    // Filtre par ville (insensible à la casse via mode 'insensitive')
    if (city) {
      where.city = { equals: city, mode: 'insensitive' }
    }

    // Filtre par quartier
    if (quarter) {
      where.quarter = { contains: quarter, mode: 'insensitive' }
    }

    // Filtre par type de terrain (valeur exacte)
    if (terrainType) {
      where.terrainType = terrainType
    }

    // Filtre par fourchette de prix (BigInt en Prisma)
    if (minPrice || maxPrice) {
      where.priceFcfa = {
        ...(minPrice ? { gte: BigInt(minPrice) } : {}),
        ...(maxPrice ? { lte: BigInt(maxPrice) } : {}),
      }
    }

    // Filtre par fourchette de surface (Decimal en Prisma)
    if (minSurface || maxSurface) {
      where.surfaceM2 = {
        ...(minSurface ? { gte: minSurface } : {}),
        ...(maxSurface ? { lte: maxSurface } : {}),
      }
    }

    // --- 3. Exécuter la requête avec pagination ---
    // On utilise une transaction pour récupérer les résultats ET le total
    const skip = (page - 1) * limit

    const [listings, total] = await Promise.all([
      db.listing.findMany({
        where,
        include: {
          // Inclure la première photo pour l'aperçu dans les cartes
          photos: { orderBy: { position: 'asc' }, take: 1 },
          // Informations du vendeur pour le badge vérifié
          vendor: {
            select: { name: true, isVerified: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.listing.count({ where }),
    ])

    // --- 4. Sérialiser les BigInt/Decimal avant la réponse JSON ---
    // JSON.stringify ne sait pas sérialiser BigInt nativement
    const serializedListings = listings.map((listing) => ({
      ...listing,
      priceFcfa: Number(listing.priceFcfa),
      surfaceM2: Number(listing.surfaceM2),
    }))

    return NextResponse.json({
      listings: serializedListings,
      total,
      page,
      limit,
    })
  } catch (error) {
    console.error('[GET /api/listings] Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur serveur lors de la récupération des annonces' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/listings — Créer une nouvelle annonce.
 *
 * Prérequis :
 *   - L'utilisateur doit être authentifié (session Better Auth valide)
 *   - Le body doit correspondre au createListingSchema
 *
 * Flux :
 *   1. Vérifier la session de l'utilisateur
 *   2. Valider le body avec Zod
 *   3. Créer l'annonce avec statut "active" et expiresAt = now + 90 jours
 *   4. Marquer l'utilisateur comme vendeur (isVendor = true)
 *   5. Retourner l'annonce créée
 *
 * Réponse :
 *   201 : { listing: Listing } — annonce créée avec succès
 *   401 : { error: string } — non authentifié
 *   400 : { error: string } — données invalides
 *   500 : { error: string } — erreur serveur
 *
 * Exemple de body :
 *   {
 *     "title": "Terrain résidentiel 500m² à Bonamoussadi",
 *     "description": "Terrain titré, accès route bitumée...",
 *     "priceFcfa": 15000000,
 *     "surfaceM2": 500,
 *     "terrainType": "residential",
 *     "city": "Douala",
 *     "quarter": "Bonamoussadi"
 *   }
 */
export async function POST(request: NextRequest) {
  try {
    // --- 1. Vérifier l'authentification ---
    // Better Auth vérifie la session via les headers (cookie de session)
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentification requise pour créer une annonce' },
        { status: 401 }
      )
    }

    // --- 2. Parser et valider le body avec Zod ---
    const body = await request.json()
    const parsed = createListingSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // --- 3. Calculer la date d'expiration ---
    // Durée par défaut : LISTING_EXPIRY_DAYS (90 jours) à partir de maintenant
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + LISTING_EXPIRY_DAYS)

    // --- 4. Déterminer le statut initial ---
    // Le client peut envoyer status="draft" ou status="active" (défaut: "active")
    const requestedStatus = body.status === 'draft' ? 'draft' : 'active'

    // --- 5. Créer l'annonce en base de données ---
    const listing = await db.listing.create({
      data: {
        vendorId: session.user.id,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        // Conversion en BigInt pour le stockage Prisma
        priceFcfa: BigInt(parsed.data.priceFcfa),
        surfaceM2: parsed.data.surfaceM2,
        terrainType: parsed.data.terrainType,
        city: parsed.data.city,
        quarter: parsed.data.quarter ?? null,
        latitude: parsed.data.latitude ?? null,
        longitude: parsed.data.longitude ?? null,
        status: requestedStatus,
        // expiresAt uniquement si l'annonce est active
        expiresAt: requestedStatus === 'active' ? expiresAt : null,
      },
    })

    // --- 6. Marquer l'utilisateur comme vendeur ---
    // isVendor = true dès la première annonce créée (flag permanent)
    if (!session.user.isVendor) {
      await db.user.update({
        where: { id: session.user.id },
        data: { isVendor: true },
      })
    }

    // --- 7. Retourner l'annonce créée ---
    // Sérialiser BigInt avant la réponse JSON
    return NextResponse.json(
      {
        listing: {
          ...listing,
          priceFcfa: Number(listing.priceFcfa),
          surfaceM2: Number(listing.surfaceM2),
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[POST /api/listings] Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur serveur lors de la création de l\'annonce' },
      { status: 500 }
    )
  }
}
