/**
 * Route API pour l'upload/suppression de vidéo d'une annonce.
 *
 * Rôle :
 *   - POST /api/listings/[id]/video — Upload une vidéo vers Supabase Storage (bucket "videos")
 *     et met à jour le champ videoPath en base de données.
 *   - DELETE /api/listings/[id]/video — Supprime la vidéo de Supabase Storage
 *     et met videoPath à null en base.
 *
 * Interactions :
 *   - Better Auth (auth) : vérifier que l'utilisateur est le propriétaire
 *   - Supabase Storage (supabaseAdmin) : upload/suppression dans le bucket "videos"
 *   - Prisma (db) : mise à jour du champ videoPath sur la table listing
 *
 * Flux POST :
 *   1. Vérifier auth + propriété
 *   2. Extraire le fichier vidéo du FormData (champ "video")
 *   3. Valider le type MIME (MP4/WebM) et la taille (50 Mo max)
 *   4. Supprimer l'ancienne vidéo si elle existe
 *   5. Upload vers Supabase Storage (chemin: listings/{id}/video-{timestamp}.{ext})
 *   6. Mettre à jour videoPath en base
 *
 * Exemple d'appel POST :
 *   const formData = new FormData()
 *   formData.append('video', videoFile)
 *   fetch('/api/listings/clxyz123/video', { method: 'POST', body: formData })
 *
 * Exemple d'appel DELETE :
 *   fetch('/api/listings/clxyz123/video', { method: 'DELETE' })
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-server'
import { MAX_VIDEO_SIZE, ACCEPTED_VIDEO_TYPES } from '@/lib/constants'

/** Nom du bucket Supabase Storage pour les vidéos */
const BUCKET = 'videos'

/**
 * POST /api/listings/[id]/video — Upload une vidéo pour cette annonce.
 * Remplace automatiquement la vidéo précédente si elle existe.
 */
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
      select: { vendorId: true, videoPath: true },
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

    // --- 3. Extraire le fichier vidéo du FormData ---
    const formData = await request.formData()
    const file = formData.get('video') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'Aucune vidéo fournie' },
        { status: 400 }
      )
    }

    // --- 4. Valider le type MIME ---
    const allowedTypes: string[] = [...ACCEPTED_VIDEO_TYPES]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Format non supporté. Utilisez MP4 ou WebM.' },
        { status: 400 }
      )
    }

    // --- 5. Valider la taille (50 Mo max) ---
    if (file.size > MAX_VIDEO_SIZE) {
      return NextResponse.json(
        { error: `La vidéo ne doit pas dépasser ${MAX_VIDEO_SIZE / (1024 * 1024)} Mo` },
        { status: 400 }
      )
    }

    // --- 6. Supprimer l'ancienne vidéo si elle existe ---
    if (listing.videoPath) {
      await supabaseAdmin.storage
        .from(BUCKET)
        .remove([listing.videoPath])
    }

    // --- 7. Upload vers Supabase Storage ---
    // Chemin : listings/{listingId}/video-{timestamp}.{ext}
    const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4'
    const storagePath = `listings/${listingId}/video-${Date.now()}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error(`[video] Erreur upload ${storagePath}:`, uploadError.message)
      return NextResponse.json(
        { error: 'Erreur lors de l\'upload de la vidéo' },
        { status: 500 }
      )
    }

    // --- 8. Mettre à jour videoPath en base ---
    await db.listing.update({
      where: { id: listingId },
      data: { videoPath: storagePath },
    })

    return NextResponse.json({ videoPath: storagePath }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/listings/[id]/video] Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur serveur lors de l\'upload de la vidéo' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/listings/[id]/video — Supprime la vidéo de cette annonce.
 * Supprime le fichier de Supabase Storage et met videoPath à null en base.
 */
export async function DELETE(
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

    // --- 2. Vérifier propriété ---
    const listing = await db.listing.findUnique({
      where: { id: listingId },
      select: { vendorId: true, videoPath: true },
    })

    if (!listing) {
      return NextResponse.json({ error: 'Annonce introuvable' }, { status: 404 })
    }

    if (listing.vendorId !== session.user.id) {
      return NextResponse.json(
        { error: 'Vous n\'êtes pas le propriétaire' },
        { status: 403 }
      )
    }

    // --- 3. Supprimer de Supabase Storage ---
    if (listing.videoPath) {
      await supabaseAdmin.storage
        .from(BUCKET)
        .remove([listing.videoPath])
    }

    // --- 4. Mettre videoPath à null ---
    await db.listing.update({
      where: { id: listingId },
      data: { videoPath: null },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/listings/[id]/video] Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
