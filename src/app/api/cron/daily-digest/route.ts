/**
 * Cron quotidien — Digest des contacts + expiration des annonces.
 *
 * Rôle :
 *   Ce cron est déclenché chaque jour à 20h UTC (21h WAT, heure du Cameroun)
 *   par Vercel Cron. Il effectue 3 tâches :
 *
 *   1. DIGEST CONTACTS : Pour chaque vendeur ayant reçu des contacts aujourd'hui,
 *      envoyer un email récapitulatif avec le nombre de contacts par annonce.
 *
 *   2. AVERTISSEMENT EXPIRATION : Trouver les annonces actives qui expirent
 *      dans EXPIRY_WARNING_DAYS (7) jours et envoyer un email d'avertissement
 *      au vendeur.
 *
 *   3. AUTO-EXPIRATION : Trouver les annonces actives dont la date d'expiration
 *      est dépassée et les passer en statut "expired".
 *
 * Interactions :
 *   - Prisma (db) : lecture dans contact_event, listing, user ; écriture dans listing
 *   - Email (sendDigestEmail, sendExpiryWarning) : envoi des notifications
 *   - CRON_SECRET : protection de la route (header Authorization)
 *   - Constante EXPIRY_WARNING_DAYS : délai d'avertissement (7 jours)
 *
 * Endpoint : GET /api/cron/daily-digest
 *   Déclenché par : Vercel Cron (vercel.json) ou manuellement via curl
 *
 * Exemple d'appel manuel :
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://immov2.cm/api/cron/daily-digest
 *
 * Sécurité :
 *   Le header Authorization doit contenir "Bearer <CRON_SECRET>" pour être accepté.
 *   Sans ce header, la route retourne 401.
 *
 * Performance :
 *   Traitement par lots de 50 vendeurs (décision eng review #4) pour éviter
 *   les timeouts et la surcharge mémoire sur les fonctions serverless.
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { EXPIRY_WARNING_DAYS } from '@/lib/constants'
import { sendDigestEmail, sendExpiryWarning } from '@/lib/email'
import type { DigestListingInfo } from '@/lib/email'

// --- Type pour le résultat de la requête vendeurs avec contacts ---
// Défini explicitement pour éviter les erreurs de type implicite 'any'
// causées par le Proxy Prisma (db)
interface VendorWithContacts {
  id: string
  email: string
  listings: Array<{
    title: string
    contactEvents: Array<{ id: string }>
  }>
}

// --- Taille des lots pour le traitement par batch ---
// Décision eng review #4 : traiter les vendeurs par lots de 50
// pour rester dans les limites des fonctions serverless Vercel
const BATCH_SIZE = 50

/**
 * GET /api/cron/daily-digest — Cron quotidien de digest et expiration.
 *
 * Flux :
 *   1. Vérifier le header Authorization (CRON_SECRET)
 *   2. Tâche 1 : Envoyer les digests de contacts du jour
 *   3. Tâche 2 : Envoyer les avertissements d'expiration (J-7)
 *   4. Tâche 3 : Auto-expirer les annonces dépassées
 *   5. Retourner un résumé des actions effectuées
 *
 * Réponse :
 *   200 : { success: true, digest: {...}, expiry: {...} } — tâches terminées
 *   401 : { error: string } — CRON_SECRET invalide
 *   500 : { error: string } — erreur serveur
 */
export async function GET(request: NextRequest) {
  try {
    // --- 1. Vérifier le header Authorization ---
    // Le CRON_SECRET protège cette route contre les appels non autorisés.
    // Vercel Cron envoie automatiquement ce header.
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Non autorisé — CRON_SECRET invalide' },
        { status: 401 }
      )
    }

    console.info('[cron/daily-digest] Démarrage du cron quotidien...')

    // ============================================================
    // TÂCHE 1 : DIGEST DES CONTACTS DU JOUR
    // ============================================================
    // Objectif : pour chaque vendeur ayant reçu au moins un clic "Contacter"
    // aujourd'hui, envoyer un email récapitulatif.

    // --- Calculer les bornes de la journée en cours (UTC) ---
    const now = new Date()
    const startOfDay = new Date(now)
    startOfDay.setUTCHours(0, 0, 0, 0)

    const endOfDay = new Date(now)
    endOfDay.setUTCHours(23, 59, 59, 999)

    // --- Compter les vendeurs qui ont des contacts aujourd'hui ---
    // On récupère les vendeurs distincts ayant au moins un contact_event
    // sur leurs annonces actives dans la journée
    let digestSentCount = 0
    let digestErrorCount = 0
    let cursor: string | undefined = undefined

    // --- Boucle de traitement par lots ---
    // On pagine avec un curseur Prisma pour traiter les vendeurs par groupes de 50
    while (true) {
      // Récupérer un lot de vendeurs ayant des annonces actives
      // avec des contacts aujourd'hui
      // --- Requête Prisma pour les vendeurs avec contacts du jour ---
      // On type explicitement le résultat via l'interface VendorWithContacts
      // pour contourner le Proxy Prisma qui perd l'inférence de type
      const vendors: VendorWithContacts[] = await db.user.findMany({
        where: {
          isVendor: true,
          status: 'active',
          listings: {
            some: {
              status: 'active',
              contactEvents: {
                some: {
                  createdAt: {
                    gte: startOfDay,
                    lte: endOfDay,
                  },
                },
              },
            },
          },
        },
        select: {
          id: true,
          email: true,
          listings: {
            where: {
              status: 'active',
              contactEvents: {
                some: {
                  createdAt: {
                    gte: startOfDay,
                    lte: endOfDay,
                  },
                },
              },
            },
            select: {
              title: true,
              // Compter les événements de contact du jour pour cette annonce
              contactEvents: {
                where: {
                  createdAt: {
                    gte: startOfDay,
                    lte: endOfDay,
                  },
                },
                select: { id: true },
              },
            },
          },
        },
        take: BATCH_SIZE,
        // Pagination par curseur : ignorer le premier élément déjà traité
        skip: cursor ? 1 : 0,
        ...(cursor ? { cursor: { id: cursor } } : {}),
        orderBy: { id: 'asc' },
      })

      // --- Fin de la pagination : plus de vendeurs à traiter ---
      if (vendors.length === 0) break

      // --- Traiter chaque vendeur du lot ---
      for (const vendor of vendors) {
        // Construire le résumé des annonces avec leurs contacts du jour
        const listingInfos: DigestListingInfo[] = vendor.listings.map((listing) => ({
          title: listing.title,
          contactCount: listing.contactEvents.length,
        }))

        // N'envoyer que si au moins une annonce a des contacts
        if (listingInfos.length > 0) {
          const success = await sendDigestEmail(vendor.email, listingInfos)
          if (success) {
            digestSentCount++
          } else {
            digestErrorCount++
          }
        }
      }

      // --- Mettre à jour le curseur pour le lot suivant ---
      cursor = vendors[vendors.length - 1].id

      // Si le lot est plus petit que BATCH_SIZE, on a tout traité
      if (vendors.length < BATCH_SIZE) break
    }

    console.info(
      `[cron/daily-digest] Digests envoyés : ${digestSentCount}, erreurs : ${digestErrorCount}`
    )

    // ============================================================
    // TÂCHE 2 : AVERTISSEMENTS D'EXPIRATION (J-7)
    // ============================================================
    // Objectif : avertir les vendeurs dont les annonces expirent dans 7 jours.
    // On envoie un email par annonce (pas un digest groupé).

    // --- Calculer la fenêtre d'expiration ---
    // Annonces expirant entre maintenant et maintenant + EXPIRY_WARNING_DAYS
    const warningDate = new Date(now)
    warningDate.setDate(warningDate.getDate() + EXPIRY_WARNING_DAYS)

    let warningSentCount = 0
    let warningErrorCount = 0

    // --- Récupérer les annonces qui expirent bientôt ---
    // On cherche les annonces actives dont expiresAt est entre maintenant et J+7
    const expiringListings = await db.listing.findMany({
      where: {
        status: 'active',
        expiresAt: {
          gte: now,         // pas encore expirées
          lte: warningDate, // mais qui expirent dans les 7 prochains jours
        },
      },
      select: {
        id: true,
        title: true,
        expiresAt: true,
        vendor: {
          select: {
            email: true,
          },
        },
      },
    })

    // --- Envoyer un avertissement pour chaque annonce ---
    for (const listing of expiringListings) {
      if (listing.expiresAt) {
        const success = await sendExpiryWarning(listing.vendor.email, {
          title: listing.title,
          expiresAt: listing.expiresAt,
        })

        if (success) {
          warningSentCount++
        } else {
          warningErrorCount++
        }
      }
    }

    console.info(
      `[cron/daily-digest] Avertissements expiration envoyés : ${warningSentCount}, ` +
      `erreurs : ${warningErrorCount}`
    )

    // ============================================================
    // TÂCHE 3 : AUTO-EXPIRATION DES ANNONCES DÉPASSÉES
    // ============================================================
    // Objectif : passer en statut "expired" toutes les annonces actives
    // dont la date d'expiration (expiresAt) est dépassée.

    const expiredResult = await db.listing.updateMany({
      where: {
        status: 'active',
        expiresAt: {
          lt: now, // date d'expiration dépassée
        },
      },
      data: {
        status: 'expired',
      },
    })

    console.info(
      `[cron/daily-digest] Annonces auto-expirées : ${expiredResult.count}`
    )

    // --- Retourner le résumé des actions effectuées ---
    return NextResponse.json({
      success: true,
      digest: {
        emailsSent: digestSentCount,
        errors: digestErrorCount,
      },
      expiryWarnings: {
        emailsSent: warningSentCount,
        errors: warningErrorCount,
      },
      autoExpired: {
        count: expiredResult.count,
      },
    })
  } catch (error) {
    console.error('[cron/daily-digest] Erreur fatale:', error)
    return NextResponse.json(
      { error: 'Erreur serveur dans le cron daily-digest' },
      { status: 500 }
    )
  }
}
