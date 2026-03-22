/**
 * Galerie de photos interactive — composant CLIENT.
 *
 * Rôle :
 *   Affiche une photo principale en grand et les miniatures en dessous.
 *   Cliquer sur une miniature la remplace comme photo principale.
 *   Cliquer sur la photo principale ouvre un lightbox plein écran.
 *
 * Interactions :
 *   - Utilisé par la page de détail d'annonce (listings/[id]/page.tsx)
 *   - Reçoit les URLs publiques déjà résolues via getPublicUrl()
 *
 * Exemple d'usage :
 *   <PhotoGallery
 *     photos={[
 *       { id: '1', url: 'https://...', alt: 'Photo 1' },
 *       { id: '2', url: 'https://...', alt: 'Photo 2' },
 *     ]}
 *   />
 */
'use client'

import { useState, useCallback, useEffect } from 'react'

/** Données d'une photo à afficher dans la galerie */
interface GalleryPhoto {
  /** Identifiant unique (pour le key React) */
  id: string
  /** URL publique complète de l'image */
  url: string
  /** Texte alternatif pour l'accessibilité */
  alt: string
}

interface PhotoGalleryProps {
  /** Liste des photos à afficher (au moins une) */
  photos: GalleryPhoto[]
}

export function PhotoGallery({ photos }: PhotoGalleryProps) {
  // Index de la photo actuellement affichée en grand
  const [activeIndex, setActiveIndex] = useState(0)
  // Lightbox ouvert ou fermé
  const [lightboxOpen, setLightboxOpen] = useState(false)

  // --- Navigation clavier dans le lightbox ---
  const goNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % photos.length)
  }, [photos.length])

  const goPrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + photos.length) % photos.length)
  }, [photos.length])

  useEffect(() => {
    if (!lightboxOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightboxOpen(false)
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }

    document.addEventListener('keydown', handleKeyDown)
    // Empêcher le scroll du body quand le lightbox est ouvert
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [lightboxOpen, goNext, goPrev])

  const activePhoto = photos[activeIndex]

  return (
    <>
      <div className="space-y-2">
        {/* Photo principale — cliquable pour ouvrir le lightbox */}
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="block w-full overflow-hidden rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          aria-label="Agrandir la photo"
        >
          <img
            src={activePhoto.url}
            alt={activePhoto.alt}
            className="h-64 w-full cursor-zoom-in object-cover sm:h-80 lg:h-96"
          />
        </button>

        {/* Grille de miniatures — clic pour sélectionner */}
        {photos.length > 1 && (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`overflow-hidden rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-primary ${
                  index === activeIndex
                    ? 'ring-2 ring-primary ring-offset-1'
                    : 'opacity-70 hover:opacity-100'
                }`}
                aria-label={`Voir photo ${index + 1}`}
              >
                <img
                  src={photo.url}
                  alt={photo.alt}
                  className="h-16 w-full object-cover sm:h-20"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* Lightbox plein écran                       */}
      {/* Navigable avec les flèches clavier         */}
      {/* ========================================== */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90"
          onClick={() => setLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Galerie photo"
        >
          {/* Bouton fermer (X) */}
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            aria-label="Fermer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>

          {/* Compteur de photos (ex: "2 / 5") */}
          <div className="absolute left-4 top-4 rounded-full bg-white/10 px-3 py-1 text-sm text-white backdrop-blur-sm">
            {activeIndex + 1} / {photos.length}
          </div>

          {/* Flèche gauche */}
          {photos.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                goPrev()
              }}
              className="absolute left-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              aria-label="Photo précédente"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
              </svg>
            </button>
          )}

          {/* Image principale du lightbox */}
          <img
            src={activePhoto.url}
            alt={activePhoto.alt}
            className="max-h-[85vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Flèche droite */}
          {photos.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                goNext()
              }}
              className="absolute right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              aria-label="Photo suivante"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      )}
    </>
  )
}
