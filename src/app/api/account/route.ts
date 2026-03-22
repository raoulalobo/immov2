/**
 * Route API pour la gestion du compte utilisateur — DELETE (soft delete).
 *
 * Role :
 *   Permet a un utilisateur authentifie de supprimer (soft delete) son compte.
 *   L'operation anonymise les donnees personnelles et desactive toutes les
 *   annonces actives.
 *
 * Interactions :
 *   - Better Auth (auth) : verification de session et deconnexion
 *   - Prisma (db) : mise a jour du profil et des annonces
 *   - Constante SOFT_DELETE_RETENTION_DAYS (30j) : les donnees seront
 *     purgees definitivement par le cron apres ce delai
 *
 * Flux :
 *   1. Verifier l'authentification (session valide)
 *   2. Anonymiser les donnees personnelles (email, nom, telephone)
 *   3. Passer le statut utilisateur a "deleted" avec la date deletedAt
 *   4. Passer toutes les annonces actives a "expired"
 *   5. Invalider la session (deconnexion)
 *
 * Securite :
 *   - Authentification requise (401 si pas de session)
 *   - L'utilisateur ne peut supprimer que son propre compte
 *   - Les donnees sont anonymisees mais conservees 30 jours (RGPD-compatible)
 *
 * Exemple d'appel :
 *   DELETE /api/account
 *   Headers : { Cookie: "better-auth.session_token=..." }
 *
 * Reponses :
 *   200 : { message: string } — compte supprime avec succes
 *   401 : { error: string } — non authentifie
 *   500 : { error: string } — erreur serveur
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function DELETE(request: NextRequest) {
  try {
    // --- 1. Verifier l'authentification ---
    // Recupere la session via les headers (cookie Better Auth)
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // --- 2. Anonymiser les donnees personnelles ---
    // Remplace l'email par un hash unique pour eviter les conflits d'unicite
    // Le nom et le telephone sont effaces
    const anonymizedEmail = `deleted-${userId}@anonymized.immov2.local`

    await db.user.update({
      where: { id: userId },
      data: {
        // Anonymisation du nom — texte generique non identifiant
        name: 'Compte supprime',
        // Anonymisation de l'email — unique grace a l'ID utilisateur
        email: anonymizedEmail,
        // Suppression du telephone
        phone: null,
        // Suppression de l'image de profil
        image: null,
        // Passage en statut "deleted" (soft delete)
        status: 'deleted',
        // Date du soft delete (purge automatique apres 30 jours par le cron)
        deletedAt: new Date(),
      },
    })

    // --- 3. Desactiver toutes les annonces actives ---
    // Les annonces passent en statut "expired" pour ne plus apparaitre
    // dans les resultats de recherche
    await db.listing.updateMany({
      where: {
        vendorId: userId,
        status: 'active',
      },
      data: {
        status: 'expired',
      },
    })

    // --- 4. Invalider toutes les sessions de l'utilisateur ---
    // Supprime les sessions en base pour forcer la deconnexion sur tous les appareils
    await db.session.deleteMany({
      where: { userId },
    })

    // --- 5. Retourner le succes ---
    return NextResponse.json({
      message: 'Compte supprime avec succes. Vos donnees seront purgees apres 30 jours.',
    })
  } catch (error) {
    console.error('[DELETE /api/account] Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur serveur lors de la suppression du compte' },
      { status: 500 }
    )
  }
}
