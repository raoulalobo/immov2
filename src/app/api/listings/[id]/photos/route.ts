/**
 * Route API pour l'upload de photos d'une annonce.
 *
 * Rôle :
 *   POST /api/listings/[id]/photos — Upload une ou plusieurs photos vers Supabase Storage
 *   et crée les enregistrements ListingPhoto en base de données.
 *
 * Interactions :
 *   - Better Auth (auth) : vérifier que l'utilisateur est le propriétaire de l'annonce
 *   - Supabase Storage (supabaseAdmin) : upload des fichiers dans le bucket "photos"
 *   - Prisma (db) : création des entrées ListingPhoto avec storagePath et position
 *
 * Flux :
 *   1. Vérifier l'authentification et la propriété de l'annonce
 *   2. Extraire les fichiers du FormData
 *   3. Pour chaque fichier : upload vers Supabase Storage (chemin: listings/{id}/{timestamp}-{filename})
 *   4. Créer les entrées ListingPhoto en base avec le storagePath
 *   5. Retourner les photos créées
 *
 * Exemple d'appel :
 *   const formData = new FormData()
 *   formData.append('photos', file1)
 *   formData.append('photos', file2)
 *   fetch('/api/listings/clxyz123/photos', { method: 'POST', body: formData })
 *
 * Réponses :
 *   201 : { photos: ListingPhoto[] } — photos uploadées avec succès
 *   401 : { error: string } — non authentifié
 *   403 : { error: string } — l'utilisateur n'est pas le propriétaire
 *   404 : { error: string } — annonce introuvable
 *   400 : { error: string } — aucune photo fournie ou limite dépassée
 *   500 : { error: string } — erreur serveur
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-server'
import { MAX_PHOTOS_PER_LISTING, ACCEPTED_IMAGE_TYPES } from '@/lib/constants'

/** Nom du bucket Supabase Storage pour les photos */
const BUCKET = 'photos'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listingId } = await params

    // --- 1. Vérifier l'authentification ---
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      )
    }

    // --- 2. Vérifier que l'annonce existe et appartient à l'utilisateur ---
    const listing = await db.listing.findUnique({
      where: { id: listingId },
      select: {
        vendorId: true,
        _count: { select: { photos: true } },
      },
    })

    if (!listing) {
      return NextResponse.json(
        { error: 'Annonce introuvable' },
        { status: 404 }
      )
    }

    if (listing.vendorId !== session.user.id) {
      return NextResponse.json(
        { error: 'Vous n\'êtes pas le propriétaire de cette annonce' },
        { status: 403 }
      )
    }

    // --- 3. Extraire les fichiers du FormData ---
    const formData = await request.formData()
    const files = formData.getAll('photos') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'Aucune photo fournie' },
        { status: 400 }
      )
    }

    // --- 4. Vérifier la limite de photos ---
    const currentCount = listing._count.photos
    const remaining = MAX_PHOTOS_PER_LISTING - currentCount

    if (remaining <= 0) {
      return NextResponse.json(
        { error: `Limite de ${MAX_PHOTOS_PER_LISTING} photos atteinte` },
        { status: 400 }
      )
    }

    // Ne garder que le nombre de photos autorisé
    const filesToUpload = files.slice(0, remaining)

    // --- 5. Upload chaque fichier vers Supabase Storage + créer en base ---
    const createdPhotos = []

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i]

      // Déduire le type MIME depuis le fichier ou l'extension du nom
      // browser-image-compression peut renvoyer un type vide après compression
      const extFromName = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const mimeFromExt: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
      }
      const contentType = file.type || mimeFromExt[extFromName] || 'image/jpeg'

      // Vérifier le type MIME (accepte aussi le type déduit de l'extension)
      const allowedTypes: string[] = [...ACCEPTED_IMAGE_TYPES]
      if (!allowedTypes.includes(contentType)) {
        console.warn(`[photos] Type MIME refusé: ${contentType} (fichier: ${file.name})`)
        continue
      }

      // Générer un chemin unique dans le bucket :
      // listings/{listingId}/{timestamp}-{index}.{extension}
      // Exemple : listings/clxyz123/1711234567890-0.webp
      const ext = extFromName
      const storagePath = `listings/${listingId}/${Date.now()}-${i}.${ext}`

      // Convertir le File en ArrayBuffer pour l'upload Supabase
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Upload vers Supabase Storage
      const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(storagePath, buffer, {
          contentType,
          // Ne pas écraser si le fichier existe déjà (le timestamp rend ça improbable)
          upsert: false,
        })

      if (uploadError) {
        console.error(`[photos] Erreur upload ${storagePath}:`, uploadError.message, '| contentType:', contentType, '| size:', buffer.length)
        continue
      }

      // Créer l'entrée ListingPhoto en base de données
      // position = nombre de photos existantes + index courant
      const photo = await db.listingPhoto.create({
        data: {
          listingId,
          storagePath,
          position: currentCount + i,
        },
      })

      createdPhotos.push(photo)
    }

    if (createdPhotos.length === 0) {
      return NextResponse.json(
        { error: 'Aucune photo n\'a pu être uploadée' },
        { status: 500 }
      )
    }

    return NextResponse.json({ photos: createdPhotos }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/listings/[id]/photos] Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur serveur lors de l\'upload des photos' },
      { status: 500 }
    )
  }
}
