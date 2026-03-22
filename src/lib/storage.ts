/**
 * Utilitaire Supabase Storage — génération d'URL publiques et noms de buckets.
 *
 * Rôle :
 *   Convertit un chemin relatif stocké en base de données (ex: "listings/abc123/photo.jpg")
 *   en URL publique complète du bucket Supabase Storage.
 *
 * Buckets disponibles :
 *   - photos    : photos d'annonces (public, 5 Mo max, JPEG/PNG/WebP)
 *   - videos    : vidéos 30s d'annonces (public, 50 Mo max, MP4/WebM)
 *   - documents : pièces d'identité vendeurs (PRIVÉ, 10 Mo max, JPEG/PNG/WebP/PDF)
 *
 * Interactions :
 *   - Utilisé par les pages listing detail, search, edit, et le composant ListingCard
 *   - Lit la variable d'environnement NEXT_PUBLIC_SUPABASE_URL
 *
 * Exemple :
 *   getPublicUrl("listings/abc123/photo.jpg")
 *   → "https://xxx.supabase.co/storage/v1/object/public/photos/listings/abc123/photo.jpg"
 *
 *   getPublicUrl("listings/abc123/video.mp4", "videos")
 *   → "https://xxx.supabase.co/storage/v1/object/public/videos/listings/abc123/video.mp4"
 */

/** Noms des buckets Supabase Storage */
export const STORAGE_BUCKETS = {
  /** Photos d'annonces — public, 5 Mo max */
  photos: 'photos',
  /** Vidéos d'annonces — public, 50 Mo max */
  videos: 'videos',
  /** Documents d'identité vendeurs — PRIVÉ, 10 Mo max */
  documents: 'documents',
} as const

/**
 * Génère l'URL publique d'un fichier dans Supabase Storage.
 *
 * @param storagePath — chemin relatif dans le bucket (ex: "listings/abc123/photo.jpg")
 * @param bucket — nom du bucket (défaut: "photos"). Utiliser "videos" pour les vidéos.
 * @returns URL publique complète, ou null si le chemin est vide/null
 *
 * Exemple :
 *   getPublicUrl("listings/abc123/photo.jpg")
 *   // → "https://xxx.supabase.co/storage/v1/object/public/photos/listings/abc123/photo.jpg"
 *
 *   getPublicUrl("listings/abc123/video.mp4", "videos")
 *   // → "https://xxx.supabase.co/storage/v1/object/public/videos/listings/abc123/video.mp4"
 */
export function getPublicUrl(
  storagePath: string | null | undefined,
  bucket: string = STORAGE_BUCKETS.photos,
): string | null {
  if (!storagePath) return null

  // Si le chemin est déjà une URL complète (http/https), on le retourne tel quel
  if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
    return storagePath
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!supabaseUrl) {
    console.error('[storage] NEXT_PUBLIC_SUPABASE_URL non définie')
    return null
  }

  // Construction : {SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{path}
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${storagePath}`
}
