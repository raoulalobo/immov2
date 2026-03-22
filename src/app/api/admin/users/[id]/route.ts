/**
 * Route API admin pour la gestion du statut d'un utilisateur — PATCH uniquement.
 *
 * Rôle :
 *   Permettre à un administrateur de suspendre ou réactiver un utilisateur.
 *   Utilisé depuis le panneau d'administration pour la modération des comptes.
 *
 * Interactions :
 *   - Prisma (db) : mise à jour de la table user
 *   - Better Auth (auth) : vérification de session + rôle admin
 *
 * Endpoint : PATCH /api/admin/users/[id]
 *
 * Exemple d'appel :
 *   PATCH /api/admin/users/clusr456
 *   Body : { "status": "suspended" }
 *   Headers : { Cookie: "better-auth.session_token=..." }
 *
 * Exemple de réponse (succès) :
 *   { user: { id: "clusr456", name: "Jean", status: "suspended", ... } }
 *
 * Exemple de réponse (erreur 403) :
 *   { error: "Accès réservé aux administrateurs" }
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'

/**
 * PATCH /api/admin/users/[id] — Modifier le statut d'un utilisateur.
 *
 * Prérequis :
 *   - L'utilisateur doit être authentifié avec le rôle 'admin'
 *   - Le body doit contenir un status ('active' | 'suspended')
 *
 * Flux :
 *   1. Vérifier l'authentification et le rôle admin
 *   2. Valider le body (status obligatoire)
 *   3. Empêcher un admin de se suspendre lui-même
 *   4. Vérifier que l'utilisateur existe
 *   5. Mettre à jour le statut de l'utilisateur
 *   6. Retourner l'utilisateur mis à jour
 *
 * @param request - Requête HTTP entrante avec les headers de session
 * @param context - Contient les paramètres de route (id de l'utilisateur)
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

    // Vérification du rôle admin — seul un admin peut modifier les utilisateurs
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

    // Seuls 'active' et 'suspended' sont autorisés depuis l'admin
    // ('deleted' passe par le flux de suppression de compte utilisateur)
    if (!status || !['active', 'suspended'].includes(status)) {
      return NextResponse.json(
        { error: 'Le statut doit être "active" ou "suspended"' },
        { status: 400 }
      )
    }

    // --- 4. Empêcher un admin de se suspendre lui-même ---
    // Sécurité : un admin ne peut pas verrouiller son propre compte
    if (id === session.user.id && status === 'suspended') {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas suspendre votre propre compte' },
        { status: 400 }
      )
    }

    // --- 5. Vérifier que l'utilisateur existe ---
    const existingUser = await db.user.findUnique({
      where: { id },
      select: { id: true, name: true },
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'Utilisateur introuvable' },
        { status: 404 }
      )
    }

    // --- 6. Mettre à jour le statut de l'utilisateur ---
    const updatedUser = await db.user.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isVendor: true,
        isVerified: true,
        status: true,
      },
    })

    console.info(
      `[PATCH /api/admin/users/${id}] Statut de l'utilisateur "${existingUser.name}" ` +
      `mis à jour vers "${status}" par l'admin ${session.user.id}`
    )

    // --- 7. Retourner l'utilisateur mis à jour ---
    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error('[PATCH /api/admin/users] Erreur:', error)
    return NextResponse.json(
      { error: "Erreur serveur lors de la mise à jour de l'utilisateur" },
      { status: 500 }
    )
  }
}
