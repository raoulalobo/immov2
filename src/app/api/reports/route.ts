/**
 * Route API pour les signalements d'annonces — POST uniquement.
 *
 * Rôle :
 *   Permettre à un utilisateur authentifié de signaler une annonce suspecte.
 *   Si le nombre de signalements "pending" atteint AUTO_SUSPEND_REPORT_COUNT (3),
 *   l'annonce est automatiquement suspendue.
 *
 * Interactions :
 *   - Prisma (db) : lecture/écriture dans les tables report + listing
 *   - Better Auth (auth) : vérification de session (obligatoire)
 *   - Zod (createReportSchema) : validation du body
 *   - Constante AUTO_SUSPEND_REPORT_COUNT : seuil de suspension auto (3)
 *
 * Endpoint : POST /api/reports
 *
 * Exemple d'appel :
 *   POST /api/reports
 *   Body : { "listingId": "clxyz123abc", "reason": "Cette annonce est frauduleuse..." }
 *   Headers : { Cookie: "better-auth.session_token=..." }
 *
 * Exemple de réponse (succès) :
 *   { report: { id: "clrpt456", listingId: "clxyz123", reason: "...", status: "pending" } }
 *
 * Exemple de réponse (déjà signalé) :
 *   { error: "Vous avez déjà signalé cette annonce" }
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { AUTO_SUSPEND_REPORT_COUNT } from '@/lib/constants'
import { createReportSchema } from '@/lib/validations/report'

/**
 * POST /api/reports — Créer un signalement d'annonce.
 *
 * Prérequis :
 *   - L'utilisateur doit être authentifié
 *   - Le body doit contenir listingId + reason (validé par Zod)
 *   - L'utilisateur ne doit pas avoir déjà signalé cette annonce
 *
 * Flux :
 *   1. Vérifier l'authentification
 *   2. Valider le body (listingId + raison du signalement)
 *   3. Vérifier que l'annonce existe
 *   4. Vérifier que l'utilisateur n'a pas déjà signalé cette annonce
 *   5. Créer le signalement en base de données
 *   6. Compter les signalements "pending" sur cette annonce
 *   7. Si >= AUTO_SUSPEND_REPORT_COUNT (3), suspendre automatiquement l'annonce
 *   8. Retourner le signalement créé
 *
 * Réponse :
 *   201 : { report: Report } — signalement créé
 *   401 : { error: string } — non authentifié
 *   400 : { error: string } — données invalides
 *   404 : { error: string } — annonce introuvable
 *   409 : { error: string } — déjà signalé par cet utilisateur
 *   500 : { error: string } — erreur serveur
 */
export async function POST(request: NextRequest) {
  try {
    // --- 1. Vérifier l'authentification ---
    // Les signalements sont réservés aux utilisateurs connectés
    // pour éviter les abus et permettre le suivi
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentification requise pour signaler une annonce' },
        { status: 401 }
      )
    }

    const reporterId = session.user.id

    // --- 2. Parser et valider le body ---
    // Le schéma createReportSchema valide la raison (10-500 caractères)
    // On ajoute listingId qui n'est pas dans le schéma Zod partagé
    const body = await request.json()

    // Valider la raison avec le schéma Zod
    const parsed = createReportSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Vérifier que listingId est fourni séparément (non inclus dans le schéma Zod)
    const listingId = body.listingId as string | undefined

    if (!listingId || typeof listingId !== 'string') {
      return NextResponse.json(
        { error: 'L\'identifiant de l\'annonce (listingId) est requis' },
        { status: 400 }
      )
    }

    // --- 3. Vérifier que l'annonce existe ---
    const listing = await db.listing.findUnique({
      where: { id: listingId },
      select: { id: true, status: true },
    })

    if (!listing) {
      return NextResponse.json(
        { error: 'Annonce introuvable' },
        { status: 404 }
      )
    }

    // --- 4. Vérifier que l'utilisateur n'a pas déjà signalé cette annonce ---
    // Un utilisateur ne peut signaler qu'une seule fois la même annonce
    // pour éviter le spam de signalements
    const existingReport = await db.report.findFirst({
      where: {
        listingId,
        reporterId,
      },
    })

    if (existingReport) {
      return NextResponse.json(
        { error: 'Vous avez déjà signalé cette annonce' },
        { status: 409 }
      )
    }

    // --- 5. Créer le signalement ---
    // Statut initial : "pending" (en attente de revue par l'admin)
    const report = await db.report.create({
      data: {
        listingId,
        reporterId,
        reason: parsed.data.reason,
        status: 'pending',
      },
    })

    // --- 6. Compter les signalements "pending" sur cette annonce ---
    // Si le seuil est atteint (3 par défaut), l'annonce est auto-suspendue
    const pendingReportsCount = await db.report.count({
      where: {
        listingId,
        status: 'pending',
      },
    })

    // --- 7. Auto-suspension si le seuil est atteint ---
    // Règle métier : AUTO_SUSPEND_REPORT_COUNT (3) signalements pending
    // déclenchent la suspension automatique de l'annonce
    if (pendingReportsCount >= AUTO_SUSPEND_REPORT_COUNT) {
      await db.listing.update({
        where: { id: listingId },
        data: { status: 'suspended' },
      })

      console.info(
        `[POST /api/reports] Annonce ${listingId} auto-suspendue ` +
        `(${pendingReportsCount} signalements pending >= seuil de ${AUTO_SUSPEND_REPORT_COUNT})`
      )
    }

    // --- 8. Retourner le signalement créé ---
    return NextResponse.json({ report }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/reports] Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur serveur lors de la création du signalement' },
      { status: 500 }
    )
  }
}
