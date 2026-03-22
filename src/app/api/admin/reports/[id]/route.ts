/**
 * Route API admin pour la gestion d'un signalement individuel — PATCH uniquement.
 *
 * Rôle :
 *   Permettre à un administrateur de traiter un signalement (confirmer ou rejeter).
 *   Si le signalement est confirmé et que l'annonce atteint le seuil de
 *   AUTO_SUSPEND_REPORT_COUNT (3) signalements confirmés, l'annonce est
 *   automatiquement suspendue.
 *   Si l'annonce est auto-suspendue ET le vendeur est vérifié ET a
 *   BADGE_REVOCATION_REPORT_COUNT (3) signalements confirmés sur ses annonces,
 *   le badge de vérification est révoqué.
 *
 * Interactions :
 *   - Prisma (db) : mise à jour des tables report, listing, user
 *   - Better Auth (auth) : vérification de session + rôle admin
 *   - Constantes AUTO_SUSPEND_REPORT_COUNT, BADGE_REVOCATION_REPORT_COUNT
 *
 * Endpoint : PATCH /api/admin/reports/[id]
 *
 * Exemple d'appel :
 *   PATCH /api/admin/reports/clrpt456
 *   Body : { "status": "confirmed", "adminNote": "Contenu frauduleux confirmé" }
 *   Headers : { Cookie: "better-auth.session_token=..." }
 *
 * Exemple de réponse (succès) :
 *   { report: { id: "clrpt456", status: "confirmed", adminNote: "..." }, listingSuspended: false, badgeRevoked: false }
 *
 * Exemple de réponse (erreur 403) :
 *   { error: "Accès réservé aux administrateurs" }
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import {
  AUTO_SUSPEND_REPORT_COUNT,
  BADGE_REVOCATION_REPORT_COUNT,
} from '@/lib/constants'

/**
 * PATCH /api/admin/reports/[id] — Traiter un signalement (confirmer ou rejeter).
 *
 * Prérequis :
 *   - L'utilisateur doit être authentifié avec le rôle 'admin'
 *   - Le body doit contenir un status ('confirmed' | 'dismissed')
 *   - Le body peut contenir une adminNote optionnelle
 *
 * Flux :
 *   1. Vérifier l'authentification et le rôle admin
 *   2. Valider le body (status obligatoire, adminNote optionnel)
 *   3. Vérifier que le signalement existe
 *   4. Mettre à jour le signalement avec le nouveau statut et la note admin
 *   5. Si status='confirmed', compter les signalements confirmés sur cette annonce
 *   6. Si le seuil AUTO_SUSPEND_REPORT_COUNT (3) est atteint, suspendre l'annonce
 *   7. Si l'annonce est suspendue et le vendeur est vérifié avec 3+ rapports confirmés,
 *      révoquer le badge de vérification du vendeur
 *   8. Retourner le signalement mis à jour + indicateurs d'actions secondaires
 *
 * @param request - Requête HTTP entrante avec les headers de session
 * @param context - Contient les paramètres de route (id du signalement)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // --- 1. Vérifier l'authentification et le rôle admin ---
    // Seuls les administrateurs peuvent traiter les signalements
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      )
    }

    // Vérification du rôle admin — sécurité critique
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Accès réservé aux administrateurs' },
        { status: 403 }
      )
    }

    // --- 2. Extraire l'ID du signalement depuis les paramètres de route ---
    const { id } = await params

    // --- 3. Parser et valider le body ---
    const body = await request.json()
    const { status, adminNote } = body as {
      status?: string
      adminNote?: string
    }

    // Le statut est obligatoire et doit être 'confirmed' ou 'dismissed'
    if (!status || !['confirmed', 'dismissed'].includes(status)) {
      return NextResponse.json(
        { error: 'Le statut doit être "confirmed" ou "dismissed"' },
        { status: 400 }
      )
    }

    // --- 4. Vérifier que le signalement existe ---
    const existingReport = await db.report.findUnique({
      where: { id },
      include: {
        // Inclure l'annonce pour accéder au vendorId si suspension nécessaire
        listing: {
          select: { id: true, vendorId: true, status: true },
        },
      },
    })

    if (!existingReport) {
      return NextResponse.json(
        { error: 'Signalement introuvable' },
        { status: 404 }
      )
    }

    // --- 5. Mettre à jour le signalement ---
    // On enregistre le nouveau statut et la note admin optionnelle
    const updatedReport = await db.report.update({
      where: { id },
      data: {
        status,
        adminNote: adminNote || null,
      },
    })

    // Variables pour les indicateurs d'actions secondaires
    let listingSuspended = false
    let badgeRevoked = false

    // --- 6. Si confirmé, vérifier si l'annonce doit être auto-suspendue ---
    // Règle métier : AUTO_SUSPEND_REPORT_COUNT (3) signalements confirmés
    // déclenchent la suspension automatique de l'annonce
    if (status === 'confirmed') {
      const confirmedReportsCount = await db.report.count({
        where: {
          listingId: existingReport.listingId,
          status: 'confirmed',
        },
      })

      // Si le seuil est atteint et l'annonce n'est pas déjà suspendue
      if (
        confirmedReportsCount >= AUTO_SUSPEND_REPORT_COUNT &&
        existingReport.listing.status !== 'suspended'
      ) {
        await db.listing.update({
          where: { id: existingReport.listingId },
          data: { status: 'suspended' },
        })

        listingSuspended = true

        console.info(
          `[PATCH /api/admin/reports/${id}] Annonce ${existingReport.listingId} auto-suspendue ` +
          `(${confirmedReportsCount} signalements confirmés >= seuil de ${AUTO_SUSPEND_REPORT_COUNT})`
        )

        // --- 7. Vérifier si le badge de vérification doit être révoqué ---
        // Règle métier : si le vendeur est vérifié et a BADGE_REVOCATION_REPORT_COUNT (3)
        // signalements confirmés sur TOUTES ses annonces, on révoque le badge
        const vendor = await db.user.findUnique({
          where: { id: existingReport.listing.vendorId },
          select: { isVerified: true },
        })

        if (vendor?.isVerified) {
          // Compter les signalements confirmés sur toutes les annonces du vendeur
          const totalConfirmedReports = await db.report.count({
            where: {
              listing: { vendorId: existingReport.listing.vendorId },
              status: 'confirmed',
            },
          })

          if (totalConfirmedReports >= BADGE_REVOCATION_REPORT_COUNT) {
            await db.user.update({
              where: { id: existingReport.listing.vendorId },
              data: { isVerified: false },
            })

            badgeRevoked = true

            console.info(
              `[PATCH /api/admin/reports/${id}] Badge vérifié révoqué pour le vendeur ` +
              `${existingReport.listing.vendorId} (${totalConfirmedReports} signalements confirmés)`
            )
          }
        }
      }
    }

    // --- 8. Retourner le signalement mis à jour avec les indicateurs ---
    return NextResponse.json({
      report: updatedReport,
      listingSuspended,
      badgeRevoked,
    })
  } catch (error) {
    console.error('[PATCH /api/admin/reports] Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur serveur lors du traitement du signalement' },
      { status: 500 }
    )
  }
}
