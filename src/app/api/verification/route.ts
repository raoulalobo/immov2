/**
 * Route API pour les demandes de vérification vendeur — POST uniquement.
 *
 * Rôle :
 *   Permettre à un vendeur authentifié de soumettre une demande de vérification
 *   en fournissant un document d'identité (CNI ou passeport).
 *   Après soumission, un admin revoit la demande (SLA 48h ouvrées).
 *   Si approuvée, le vendeur obtient le badge "Vendeur vérifié".
 *
 * Interactions :
 *   - Prisma (db) : lecture/écriture dans la table verification_request
 *   - Better Auth (auth) : vérification de session + rôle vendeur
 *   - Zod (verificationRequestSchema) : validation du body (documentType + documentNumber)
 *   - Supabase Storage : les fichiers recto/verso sont uploadés côté client,
 *     ici on reçoit uniquement les chemins (paths) dans le storage
 *
 * Endpoint : POST /api/verification
 *
 * Exemple d'appel :
 *   POST /api/verification
 *   Body : {
 *     "documentType": "cni",
 *     "documentNumber": "123456789",
 *     "rectoPath": "verifications/user123/recto-abc.jpg",
 *     "versoPath": "verifications/user123/verso-abc.jpg"
 *   }
 *   Headers : { Cookie: "better-auth.session_token=..." }
 *
 * Exemple de réponse (succes) :
 *   { verificationRequest: { id: "clvr456", status: "pending", ... } }
 *
 * Exemple de réponse (demande deja en cours) :
 *   { error: "Vous avez déjà une demande de vérification en cours" }
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { verificationRequestSchema } from '@/lib/validations/report'

/**
 * POST /api/verification — Soumettre une demande de vérification vendeur.
 *
 * Prérequis :
 *   - L'utilisateur doit être authentifié
 *   - L'utilisateur doit être vendeur (isVendor = true)
 *   - Aucune demande "pending" ne doit déjà exister pour cet utilisateur
 *   - Le body doit contenir documentType, documentNumber, rectoPath, versoPath
 *
 * Flux :
 *   1. Vérifier l'authentification
 *   2. Vérifier que l'utilisateur est vendeur (isVendor = true)
 *   3. Valider le body avec Zod (documentType + documentNumber)
 *   4. Vérifier les chemins recto/verso (strings non vides)
 *   5. Vérifier qu'aucune demande "pending" n'existe déjà
 *   6. Créer la demande de vérification en base de données
 *   7. Retourner la demande créée
 *
 * Réponse :
 *   201 : { verificationRequest: VerificationRequest } — demande créée
 *   401 : { error: string } — non authentifié
 *   403 : { error: string } — pas vendeur
 *   400 : { error: string } — données invalides
 *   409 : { error: string } — demande déjà en cours
 *   500 : { error: string } — erreur serveur
 */
export async function POST(request: NextRequest) {
  try {
    // --- 1. Vérifier l'authentification ---
    // Seuls les utilisateurs connectés peuvent demander la vérification
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentification requise pour soumettre une demande de vérification' },
        { status: 401 }
      )
    }

    const vendorId = session.user.id

    // --- 2. Vérifier que l'utilisateur est vendeur ---
    // Le flag isVendor est activé automatiquement dès la première annonce publiée.
    // Un non-vendeur n'a pas besoin de vérification.
    const user = await db.user.findUnique({
      where: { id: vendorId },
      select: { isVendor: true, isVerified: true },
    })

    if (!user?.isVendor) {
      return NextResponse.json(
        { error: 'Seuls les vendeurs peuvent demander la vérification. Publiez d\'abord une annonce.' },
        { status: 403 }
      )
    }

    // --- Vérification facultative : l'utilisateur est déjà vérifié ---
    if (user.isVerified) {
      return NextResponse.json(
        { error: 'Vous êtes déjà un vendeur vérifié' },
        { status: 409 }
      )
    }

    // --- 3. Parser et valider le body ---
    // verificationRequestSchema valide documentType ('cni' | 'passport')
    // et documentNumber (5-50 caractères)
    const body = await request.json()
    const parsed = verificationRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // --- 4. Vérifier les chemins recto/verso ---
    // Les fichiers sont uploadés côté client vers Supabase Storage.
    // Ici on reçoit les chemins (ex: "verifications/user123/recto-abc.jpg")
    const rectoPath = body.rectoPath as string | undefined
    const versoPath = body.versoPath as string | undefined

    if (!rectoPath || typeof rectoPath !== 'string' || rectoPath.trim() === '') {
      return NextResponse.json(
        { error: 'Le chemin du recto du document (rectoPath) est requis' },
        { status: 400 }
      )
    }

    if (!versoPath || typeof versoPath !== 'string' || versoPath.trim() === '') {
      return NextResponse.json(
        { error: 'Le chemin du verso du document (versoPath) est requis' },
        { status: 400 }
      )
    }

    // --- 5. Vérifier qu'aucune demande "pending" n'existe ---
    // Un vendeur ne peut avoir qu'une seule demande en attente à la fois
    // pour éviter les soumissions multiples
    const existingRequest = await db.verificationRequest.findFirst({
      where: {
        vendorId,
        status: 'pending',
      },
    })

    if (existingRequest) {
      return NextResponse.json(
        { error: 'Vous avez déjà une demande de vérification en cours' },
        { status: 409 }
      )
    }

    // --- 6. Créer la demande de vérification ---
    // Statut initial : "pending" (en attente de revue admin, SLA 48h ouvrées)
    const verificationRequest = await db.verificationRequest.create({
      data: {
        vendorId,
        documentType: parsed.data.documentType,
        documentNumber: parsed.data.documentNumber,
        rectoPath: rectoPath.trim(),
        versoPath: versoPath.trim(),
        status: 'pending',
      },
    })

    console.info(
      `[POST /api/verification] Nouvelle demande de vérification créée : ` +
      `id=${verificationRequest.id}, vendeur=${vendorId}, type=${parsed.data.documentType}`
    )

    // --- 7. Retourner la demande créée ---
    return NextResponse.json({ verificationRequest }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/verification] Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur serveur lors de la création de la demande de vérification' },
      { status: 500 }
    )
  }
}
