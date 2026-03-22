/**
 * Route API admin pour la gestion d'une demande de vérification — PATCH uniquement.
 *
 * Rôle :
 *   Permettre à un administrateur d'approuver ou rejeter une demande de
 *   vérification vendeur. Si approuvé, le vendeur reçoit le badge "Vendeur vérifié"
 *   (isVerified=true). Si rejeté, un motif de rejet est enregistré.
 *
 * Interactions :
 *   - Prisma (db) : mise à jour des tables verification_request + user
 *   - Better Auth (auth) : vérification de session + rôle admin
 *
 * Endpoint : PATCH /api/admin/verification/[id]
 *
 * Exemple d'appel (approbation) :
 *   PATCH /api/admin/verification/clver789
 *   Body : { "status": "approved" }
 *
 * Exemple d'appel (rejet) :
 *   PATCH /api/admin/verification/clver789
 *   Body : { "status": "rejected", "rejectionReason": "Photo du document illisible" }
 *
 * Exemple de réponse (succès) :
 *   { verificationRequest: { id: "clver789", status: "approved", ... } }
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'

/**
 * PATCH /api/admin/verification/[id] — Approuver ou rejeter une demande de vérification.
 *
 * Prérequis :
 *   - L'utilisateur doit être authentifié avec le rôle 'admin'
 *   - Le body doit contenir un status ('approved' | 'rejected')
 *   - Si rejet, le body doit contenir un rejectionReason
 *
 * Flux :
 *   1. Vérifier l'authentification et le rôle admin
 *   2. Valider le body (status obligatoire, rejectionReason si rejet)
 *   3. Vérifier que la demande de vérification existe
 *   4. Mettre à jour la demande avec le statut, la date de revue et le motif
 *   5. Si approuvé, activer le badge vérifié sur le profil du vendeur
 *   6. Retourner la demande mise à jour
 *
 * @param request - Requête HTTP entrante avec les headers de session
 * @param context - Contient les paramètres de route (id de la demande)
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

    // Vérification du rôle admin — seul un admin peut traiter les vérifications
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
    const { status, rejectionReason } = body as {
      status?: string
      rejectionReason?: string
    }

    // Le statut doit être 'approved' ou 'rejected'
    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Le statut doit être "approved" ou "rejected"' },
        { status: 400 }
      )
    }

    // Si rejet, un motif est obligatoire pour informer le vendeur
    if (status === 'rejected' && !rejectionReason) {
      return NextResponse.json(
        { error: 'Un motif de rejet est requis' },
        { status: 400 }
      )
    }

    // --- 4. Vérifier que la demande de vérification existe ---
    const existingRequest = await db.verificationRequest.findUnique({
      where: { id },
      select: { id: true, vendorId: true, status: true },
    })

    if (!existingRequest) {
      return NextResponse.json(
        { error: 'Demande de vérification introuvable' },
        { status: 404 }
      )
    }

    // --- 5. Mettre à jour la demande de vérification ---
    // On enregistre le statut, la date de revue et le motif de rejet si applicable
    const updatedRequest = await db.verificationRequest.update({
      where: { id },
      data: {
        status,
        rejectionReason: status === 'rejected' ? rejectionReason : null,
        reviewedAt: new Date(),
      },
    })

    // --- 6. Si approuvé, activer le badge vérifié sur le profil du vendeur ---
    // Le badge "Vendeur vérifié" s'affiche sur toutes les annonces du vendeur
    if (status === 'approved') {
      await db.user.update({
        where: { id: existingRequest.vendorId },
        data: { isVerified: true },
      })

      console.info(
        `[PATCH /api/admin/verification/${id}] Vendeur ${existingRequest.vendorId} ` +
        `vérifié — badge "Vendeur vérifié" activé`
      )
    }

    // --- 7. Retourner la demande mise à jour ---
    return NextResponse.json({ verificationRequest: updatedRequest })
  } catch (error) {
    console.error('[PATCH /api/admin/verification] Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur serveur lors du traitement de la demande de vérification' },
      { status: 500 }
    )
  }
}
