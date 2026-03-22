/**
 * Cron quotidien — Alertes de recherches sauvegardées.
 *
 * Rôle :
 *   Ce cron est déclenché chaque jour à 08h UTC (09h WAT, heure du Cameroun)
 *   par Vercel Cron. Il matche les nouvelles annonces publiées depuis la
 *   dernière notification avec les critères de chaque recherche sauvegardée.
 *
 * Fonctionnement :
 *   Pour chaque recherche sauvegardée (saved_search), on cherche les annonces
 *   actives créées après lastNotifiedAt (ou jamais si première exécution).
 *   Si des annonces matchent les critères (ville, type, prix, surface),
 *   on envoie un email à l'utilisateur et on met à jour lastNotifiedAt.
 *
 * Interactions :
 *   - Prisma (db) : lecture dans saved_search, listing, user ; écriture dans saved_search
 *   - Email (sendAlertEmail) : envoi des notifications d'alerte
 *   - CRON_SECRET : protection de la route (header Authorization)
 *
 * Endpoint : GET /api/cron/alerts
 *   Déclenché par : Vercel Cron (vercel.json) ou manuellement via curl
 *
 * Exemple d'appel manuel :
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://immov2.cm/api/cron/alerts
 *
 * Sécurité :
 *   Le header Authorization doit contenir "Bearer <CRON_SECRET>" pour être accepté.
 *
 * Performance :
 *   Traitement par lots de 50 recherches sauvegardées (décision eng review #4)
 *   pour éviter les timeouts sur les fonctions serverless Vercel.
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendAlertEmail } from '@/lib/email'
import type { Prisma, SavedSearch } from '@prisma/client'

// --- Type pour le résultat de la requête recherches sauvegardées ---
// Défini explicitement pour éviter les erreurs de type implicite 'any'
// causées par le Proxy Prisma (db)
interface SavedSearchWithUser extends SavedSearch {
  user: {
    email: string
    status: string
  }
}

// --- Taille des lots pour le traitement par batch ---
// Décision eng review #4 : traiter par lots de 50
const BATCH_SIZE = 50

/**
 * GET /api/cron/alerts — Cron quotidien d'alertes de recherches sauvegardées.
 *
 * Flux :
 *   1. Vérifier le header Authorization (CRON_SECRET)
 *   2. Paginer les recherches sauvegardées par lots de 50
 *   3. Pour chaque recherche, construire les filtres Prisma correspondants
 *   4. Chercher les annonces matchantes créées après lastNotifiedAt
 *   5. Si des annonces matchent, envoyer un email et mettre à jour lastNotifiedAt
 *   6. Retourner un résumé des actions effectuées
 *
 * Réponse :
 *   200 : { success: true, processed: number, alertsSent: number, errors: number }
 *   401 : { error: string } — CRON_SECRET invalide
 *   500 : { error: string } — erreur serveur
 */
export async function GET(request: NextRequest) {
  try {
    // --- 1. Vérifier le header Authorization ---
    // Le CRON_SECRET protège cette route contre les appels non autorisés
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Non autorisé — CRON_SECRET invalide' },
        { status: 401 }
      )
    }

    console.info('[cron/alerts] Démarrage du cron d\'alertes...')

    const now = new Date()
    let processedCount = 0
    let alertsSentCount = 0
    let errorsCount = 0
    let cursor: string | undefined = undefined

    // --- 2. Boucle de traitement par lots ---
    // On pagine les recherches sauvegardées avec un curseur Prisma
    while (true) {
      // Récupérer un lot de recherches sauvegardées
      // avec les informations de l'utilisateur (email)
      // --- Requête Prisma pour les recherches sauvegardées ---
      // On type explicitement le résultat via l'interface SavedSearchWithUser
      // pour contourner le Proxy Prisma qui perd l'inférence de type
      const savedSearches: SavedSearchWithUser[] = await db.savedSearch.findMany({
        include: {
          user: {
            select: {
              email: true,
              status: true,
            },
          },
        },
        take: BATCH_SIZE,
        // Pagination par curseur : ignorer l'élément déjà traité
        skip: cursor ? 1 : 0,
        ...(cursor ? { cursor: { id: cursor } } : {}),
        orderBy: { id: 'asc' },
      })

      // --- Fin de la pagination ---
      if (savedSearches.length === 0) break

      // --- 3. Traiter chaque recherche sauvegardée du lot ---
      for (const search of savedSearches) {
        processedCount++

        // Ignorer les utilisateurs inactifs (suspendus ou supprimés)
        if (search.user.status !== 'active') continue

        // --- 4. Construire les filtres Prisma dynamiquement ---
        // Chaque critère de la recherche sauvegardée se traduit en un filtre
        // Prisma sur la table listing. Les critères non définis sont ignorés.
        const whereConditions: Prisma.ListingWhereInput = {
          // Seules les annonces actives sont considérées
          status: 'active',
          // Uniquement les annonces créées après la dernière notification
          // Si lastNotifiedAt est null, on prend les annonces des dernières 24h
          createdAt: {
            gt: search.lastNotifiedAt || new Date(now.getTime() - 24 * 60 * 60 * 1000),
          },
        }

        // Filtre par ville (correspondance exacte)
        if (search.city) {
          whereConditions.city = search.city
        }

        // Filtre par quartier (correspondance exacte)
        if (search.quarter) {
          whereConditions.quarter = search.quarter
        }

        // Filtre par type de terrain (correspondance exacte)
        if (search.terrainType) {
          whereConditions.terrainType = search.terrainType
        }

        // Filtre par fourchette de prix (FCFA)
        // On construit un objet avec gte/lte selon les critères définis
        if (search.minPrice || search.maxPrice) {
          whereConditions.priceFcfa = {}
          if (search.minPrice) {
            (whereConditions.priceFcfa as Prisma.BigIntFilter).gte = search.minPrice
          }
          if (search.maxPrice) {
            (whereConditions.priceFcfa as Prisma.BigIntFilter).lte = search.maxPrice
          }
        }

        // Filtre par fourchette de surface (m2)
        if (search.minSurface || search.maxSurface) {
          whereConditions.surfaceM2 = {}
          if (search.minSurface) {
            (whereConditions.surfaceM2 as Prisma.DecimalFilter).gte = search.minSurface
          }
          if (search.maxSurface) {
            (whereConditions.surfaceM2 as Prisma.DecimalFilter).lte = search.maxSurface
          }
        }

        // --- 5. Chercher les annonces correspondantes ---
        const matchingListings = await db.listing.findMany({
          where: whereConditions,
          select: {
            title: true,
            city: true,
            priceFcfa: true,
            surfaceM2: true,
          },
          // Limiter à 20 résultats pour ne pas surcharger l'email
          take: 20,
          orderBy: { createdAt: 'desc' },
        })

        // --- 6. Si des annonces matchent, envoyer l'email et mettre à jour ---
        if (matchingListings.length > 0) {
          const success = await sendAlertEmail(
            search.user.email,
            {
              city: search.city,
              terrainType: search.terrainType,
            },
            matchingListings.map((l) => ({
              title: l.title,
              city: l.city,
              priceFcfa: l.priceFcfa,
              surfaceM2: l.surfaceM2.toString(),
            }))
          )

          if (success) {
            // Mettre à jour lastNotifiedAt pour ne pas renvoyer les mêmes annonces
            await db.savedSearch.update({
              where: { id: search.id },
              data: { lastNotifiedAt: now },
            })
            alertsSentCount++
          } else {
            errorsCount++
          }
        }
      }

      // --- Mettre à jour le curseur pour le lot suivant ---
      cursor = savedSearches[savedSearches.length - 1].id

      // Si le lot est plus petit que BATCH_SIZE, on a tout traité
      if (savedSearches.length < BATCH_SIZE) break
    }

    console.info(
      `[cron/alerts] Terminé — recherches traitées : ${processedCount}, ` +
      `alertes envoyées : ${alertsSentCount}, erreurs : ${errorsCount}`
    )

    // --- Retourner le résumé des actions effectuées ---
    return NextResponse.json({
      success: true,
      processed: processedCount,
      alertsSent: alertsSentCount,
      errors: errorsCount,
    })
  } catch (error) {
    console.error('[cron/alerts] Erreur fatale:', error)
    return NextResponse.json(
      { error: 'Erreur serveur dans le cron alerts' },
      { status: 500 }
    )
  }
}
