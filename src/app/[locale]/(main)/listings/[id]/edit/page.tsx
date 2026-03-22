/**
 * Page d'édition d'une annonce — composant CLIENT.
 *
 * Rôle :
 *   Formulaire pré-rempli pour modifier une annonce existante.
 *   Seul le propriétaire de l'annonce peut y accéder.
 *
 * Interactions :
 *   - API GET /api/listings/[id] : charger les données actuelles de l'annonce
 *   - API PATCH /api/listings/[id] : envoyer les modifications
 *   - API POST /api/listings/[id]/photos : uploader de nouvelles photos
 *   - react-hook-form + zodResolver : validation avec updateListingSchema
 *   - cities.json : données des villes et quartiers camerounais
 *   - next-intl : traductions i18n (namespaces "createListing", "listing", "terrainType")
 *
 * Flux utilisateur :
 *   1. La page charge les données de l'annonce depuis l'API
 *   2. Le formulaire est pré-rempli avec les valeurs actuelles
 *   3. L'utilisateur modifie les champs souhaités
 *   4. Clic sur "Enregistrer" → PATCH /api/listings/[id]
 *   5. Redirection vers la page de détail de l'annonce
 *
 * Exemple d'URL :
 *   /fr/listings/clxyz123/edit — édition en français
 */
'use client'

import { useState, useCallback, useRef, useEffect, use } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import imageCompression from 'browser-image-compression'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { authClient } from '@/lib/auth-client'
import {
  createListingSchema,
  type CreateListingInput,
} from '@/lib/validations/listing'
import {
  TERRAIN_TYPES,
  MAX_PHOTOS_PER_LISTING,
  MAX_VIDEO_SIZE,
  MAX_VIDEO_DURATION,
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_VIDEO_TYPES,
} from '@/lib/constants'
import { getPublicUrl, STORAGE_BUCKETS } from '@/lib/storage'

// --- Types internes ---

/** Photo existante déjà uploadée sur Supabase Storage */
interface ExistingPhoto {
  id: string
  storagePath: string
  position: number
}

/** Nouvelle photo sélectionnée localement (pas encore uploadée) */
interface NewPhotoPreview {
  id: string
  file: File
  previewUrl: string
}

/** Données de l'annonce récupérées depuis l'API */
interface ListingData {
  id: string
  title: string
  description: string | null
  priceFcfa: number
  surfaceM2: number
  terrainType: string
  city: string
  quarter: string | null
  latitude: number | null
  longitude: number | null
  status: string
  vendorId: string
  videoPath: string | null
  photos: ExistingPhoto[]
}

/** Structure des données de villes chargées depuis cities.json */
interface CityData {
  name: string
  lat: number
  lng: number
  quarters: string[]
}

export default function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: listingId } = use(params)

  // --- Vérification de session ---
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const router = useRouter()

  // --- Traductions ---
  const t = useTranslations('createListing')
  const tListing = useTranslations('listing')
  const tTerrain = useTranslations('terrainType')
  const tCommon = useTranslations('common')

  // --- État de chargement des données de l'annonce ---
  const [listing, setListing] = useState<ListingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // --- État des photos ---
  // Photos existantes (déjà uploadées sur Supabase)
  const [existingPhotos, setExistingPhotos] = useState<ExistingPhoto[]>([])
  // Nouvelles photos ajoutées (pas encore uploadées)
  const [newPhotos, setNewPhotos] = useState<NewPhotoPreview[]>([])

  // --- État de la vidéo ---
  // existingVideoPath : chemin Supabase de la vidéo déjà uploadée (null si aucune)
  const [existingVideoPath, setExistingVideoPath] = useState<string | null>(null)
  // newVideoFile : nouveau fichier vidéo sélectionné localement
  const [newVideoFile, setNewVideoFile] = useState<File | null>(null)
  // newVideoPreviewUrl : URL blob de la nouvelle vidéo pour l'aperçu
  const [newVideoPreviewUrl, setNewVideoPreviewUrl] = useState<string | null>(null)
  // videoError : message d'erreur de validation vidéo
  const [videoError, setVideoError] = useState<string | null>(null)
  // videoRemoved : true si l'utilisateur a supprimé la vidéo existante
  const [videoRemoved, setVideoRemoved] = useState(false)

  // --- État des villes et quartiers ---
  const [cities, setCities] = useState<Record<string, CityData>>({})
  const [quarters, setQuarters] = useState<string[]>([])

  // --- État de soumission ---
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Ref pour l'input file photo
  const photoInputRef = useRef<HTMLInputElement>(null)
  // Ref pour l'input file vidéo
  const videoInputRef = useRef<HTMLInputElement>(null)

  // --- Formulaire react-hook-form ---
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateListingInput>({
    resolver: zodResolver(createListingSchema),
  })

  const selectedCity = watch('city')

  // --- Chargement des villes ---
  useEffect(() => {
    fetch('/data/cities.json')
      .then((res) => res.json())
      .then((data: Record<string, CityData>) => setCities(data))
      .catch((err) => console.error('Erreur chargement cities.json:', err))
  }, [])

  // --- Mise à jour des quartiers quand la ville change ---
  useEffect(() => {
    if (selectedCity && cities[selectedCity]) {
      setQuarters(cities[selectedCity].quarters)
    } else {
      setQuarters([])
    }
  }, [selectedCity, cities])

  // --- Chargement de l'annonce depuis l'API ---
  useEffect(() => {
    async function fetchListing() {
      try {
        const res = await fetch(`/api/listings/${listingId}`)
        if (!res.ok) {
          throw new Error('Annonce introuvable')
        }
        const data = await res.json()
        const l = data.listing as ListingData

        setListing(l)
        setExistingPhotos(l.photos)
        setExistingVideoPath(l.videoPath)

        // Pré-remplir le formulaire avec les données actuelles
        reset({
          title: l.title,
          description: l.description ?? '',
          priceFcfa: l.priceFcfa,
          surfaceM2: l.surfaceM2,
          terrainType: l.terrainType as typeof TERRAIN_TYPES[number],
          city: l.city,
          quarter: l.quarter ?? '',
          latitude: l.latitude ?? undefined,
          longitude: l.longitude ?? undefined,
        })
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Erreur de chargement')
      } finally {
        setLoading(false)
      }
    }

    fetchListing()
  }, [listingId, reset])

  // --- Redirection si non connecté ou pas le propriétaire ---
  useEffect(() => {
    if (!sessionPending && !session) {
      router.push('/login')
    }
    if (!loading && listing && session?.user && listing.vendorId !== session.user.id) {
      router.push(`/listings/${listingId}`)
    }
  }, [sessionPending, session, loading, listing, listingId, router])

  // --- Gestion des nouvelles photos ---
  const handlePhotos = useCallback(
    async (files: FileList | File[]) => {
      const totalPhotos = existingPhotos.length + newPhotos.length
      const remaining = MAX_PHOTOS_PER_LISTING - totalPhotos
      const filesToProcess = Array.from(files).slice(0, remaining)

      for (const file of filesToProcess) {
        if (!ACCEPTED_IMAGE_TYPES.includes(file.type as typeof ACCEPTED_IMAGE_TYPES[number])) {
          continue
        }
        try {
          // Compresser l'image avant upload
          const compressedFile = await imageCompression(file, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
          })
          const previewUrl = URL.createObjectURL(compressedFile)
          setNewPhotos((prev) => [
            ...prev,
            {
              id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
              file: compressedFile,
              previewUrl,
            },
          ])
        } catch (err) {
          console.error('Erreur compression photo:', err)
        }
      }
    },
    [existingPhotos.length, newPhotos.length]
  )

  /** Supprime une nouvelle photo (pas encore uploadée) */
  const removeNewPhoto = useCallback((photoId: string) => {
    setNewPhotos((prev) => {
      const photo = prev.find((p) => p.id === photoId)
      if (photo) URL.revokeObjectURL(photo.previewUrl)
      return prev.filter((p) => p.id !== photoId)
    })
  }, [])

  // --- Drag & drop ---
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.dataTransfer.files.length > 0) {
        handlePhotos(e.dataTransfer.files)
      }
    },
    [handlePhotos]
  )

  // --- Gestion de la vidéo ---

  /**
   * Valide et sélectionne un nouveau fichier vidéo.
   * Vérifie le format (MP4/WebM), la taille (50 Mo max) et la durée (30s max).
   */
  const handleVideo = useCallback((file: File) => {
    setVideoError(null)

    // Vérifier le format
    if (!ACCEPTED_VIDEO_TYPES.includes(file.type as typeof ACCEPTED_VIDEO_TYPES[number])) {
      setVideoError('Format non supporté. Utilisez MP4 ou WebM.')
      return
    }

    // Vérifier la taille (50 Mo max)
    if (file.size > MAX_VIDEO_SIZE) {
      setVideoError(`La vidéo ne doit pas dépasser ${MAX_VIDEO_SIZE / (1024 * 1024)} Mo.`)
      return
    }

    // Vérifier la durée via un élément <video> temporaire
    const video = document.createElement('video')
    video.preload = 'metadata'

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src)

      if (video.duration > MAX_VIDEO_DURATION) {
        setVideoError(`La vidéo ne doit pas dépasser ${MAX_VIDEO_DURATION} secondes.`)
        return
      }

      // Vidéo valide — remplacer l'existante
      if (newVideoPreviewUrl) {
        URL.revokeObjectURL(newVideoPreviewUrl)
      }

      setNewVideoFile(file)
      setNewVideoPreviewUrl(URL.createObjectURL(file))
      // Si on ajoute une nouvelle vidéo, l'existante sera remplacée
      setVideoRemoved(true)
    }

    video.onerror = () => {
      setVideoError('Impossible de lire cette vidéo.')
    }

    video.src = URL.createObjectURL(file)
  }, [newVideoPreviewUrl])

  /** Supprime la vidéo existante (marque pour suppression côté API) */
  const removeExistingVideo = useCallback(() => {
    setExistingVideoPath(null)
    setVideoRemoved(true)
  }, [])

  /** Supprime la nouvelle vidéo sélectionnée (pas encore uploadée) */
  const removeNewVideo = useCallback(() => {
    if (newVideoPreviewUrl) {
      URL.revokeObjectURL(newVideoPreviewUrl)
    }
    setNewVideoFile(null)
    setNewVideoPreviewUrl(null)
    setVideoError(null)
  }, [newVideoPreviewUrl])

  // --- Soumission du formulaire ---
  async function onSubmit(data: CreateListingInput) {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      // --- 1. Mettre à jour les données textuelles de l'annonce ---
      const res = await fetch(`/api/listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Erreur lors de la mise à jour')
      }

      // --- 2. Uploader les nouvelles photos ---
      if (newPhotos.length > 0) {
        const formData = new FormData()
        for (const photo of newPhotos) {
          formData.append('photos', photo.file)
        }
        const uploadRes = await fetch(`/api/listings/${listingId}/photos`, {
          method: 'POST',
          body: formData,
        })
        if (!uploadRes.ok) {
          console.error('Erreur upload photos:', await uploadRes.text())
        }
      }

      // --- 3. Gérer la vidéo ---
      if (newVideoFile) {
        // Nouvelle vidéo sélectionnée → upload (l'API supprime l'ancienne automatiquement)
        const videoFormData = new FormData()
        videoFormData.append('video', newVideoFile)
        const videoRes = await fetch(`/api/listings/${listingId}/video`, {
          method: 'POST',
          body: videoFormData,
        })
        if (!videoRes.ok) {
          console.error('Erreur upload vidéo:', await videoRes.text())
        }
      } else if (videoRemoved) {
        // Vidéo supprimée sans remplacement → supprimer côté serveur
        await fetch(`/api/listings/${listingId}/video`, {
          method: 'DELETE',
        })
      }

      // --- 4. Redirection vers la page de détail ---
      router.push(`/listings/${listingId}`)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Erreur inconnue')
      setIsSubmitting(false)
    }
  }

  // --- Marquer comme vendu ---
  async function markAsSold() {
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'sold' }),
      })
      if (res.ok) {
        router.push('/dashboard')
      }
    } catch {
      setIsSubmitting(false)
    }
  }

  // --- Skeleton pendant le chargement ---
  if (loading || sessionPending) {
    return (
      <div className="mx-auto max-w-2xl animate-pulse px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-8 w-56 rounded-lg bg-[#E8E0D5]" />
        <div className="mt-8 space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-28 rounded bg-[#F0EBE3]" />
              <div className="h-10 w-full rounded-lg bg-[#F0EBE3]" />
            </div>
          ))}
          {/* Photos existantes skeleton */}
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-lg bg-[#F0EBE3]" />
            ))}
          </div>
          <div className="flex justify-end gap-3">
            <div className="h-10 w-28 rounded-lg bg-[#E8E0D5]" />
            <div className="h-10 w-44 rounded-lg bg-[#E8E0D5]" />
          </div>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-[#E63946]">{loadError}</p>
      </div>
    )
  }

  const totalPhotos = existingPhotos.length + newPhotos.length

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      {/* --- Titre de la page --- */}
      <h1 className="font-[var(--font-display)] text-2xl font-bold text-[#2D6A4F] sm:text-3xl">
        {t('editTitle')}
      </h1>

      {/* --- Formulaire d'édition --- */}
      <form
        className="mt-8 space-y-6"
        onSubmit={(e) => e.preventDefault()}
      >
        {/* Titre */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            {t('titleLabel')} <span className="text-[#E63946]">*</span>
          </label>
          <input
            id="title"
            type="text"
            {...register('title')}
            placeholder={t('titlePlaceholder')}
            className="mt-1 block w-full rounded-lg border border-[#E8E0D5] bg-white px-3 py-2.5 text-sm placeholder:text-gray-400 focus:border-[#2D6A4F] focus:outline-none focus:ring-1 focus:ring-[#2D6A4F]"
          />
          {errors.title && (
            <p className="mt-1 text-xs text-[#E63946]">{errors.title.message}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            {tListing('description')}
          </label>
          <textarea
            id="description"
            rows={4}
            {...register('description')}
            placeholder={t('descriptionPlaceholder')}
            className="mt-1 block w-full resize-y rounded-lg border border-[#E8E0D5] bg-white px-3 py-2.5 text-sm placeholder:text-gray-400 focus:border-[#2D6A4F] focus:outline-none focus:ring-1 focus:ring-[#2D6A4F]"
          />
          {errors.description && (
            <p className="mt-1 text-xs text-[#E63946]">{errors.description.message}</p>
          )}
        </div>

        {/* Prix et Surface */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="priceFcfa" className="block text-sm font-medium text-gray-700">
              {tListing('price')} (FCFA) <span className="text-[#E63946]">*</span>
            </label>
            <input
              id="priceFcfa"
              type="number"
              {...register('priceFcfa', { valueAsNumber: true })}
              className="mt-1 block w-full rounded-lg border border-[#E8E0D5] bg-white px-3 py-2.5 text-sm placeholder:text-gray-400 focus:border-[#2D6A4F] focus:outline-none focus:ring-1 focus:ring-[#2D6A4F]"
            />
            {errors.priceFcfa && (
              <p className="mt-1 text-xs text-[#E63946]">{errors.priceFcfa.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="surfaceM2" className="block text-sm font-medium text-gray-700">
              {tListing('surface')} (m&sup2;) <span className="text-[#E63946]">*</span>
            </label>
            <input
              id="surfaceM2"
              type="number"
              step="0.01"
              {...register('surfaceM2', { valueAsNumber: true })}
              className="mt-1 block w-full rounded-lg border border-[#E8E0D5] bg-white px-3 py-2.5 text-sm placeholder:text-gray-400 focus:border-[#2D6A4F] focus:outline-none focus:ring-1 focus:ring-[#2D6A4F]"
            />
            {errors.surfaceM2 && (
              <p className="mt-1 text-xs text-[#E63946]">{errors.surfaceM2.message}</p>
            )}
          </div>
        </div>

        {/* Type de terrain */}
        <div>
          <label htmlFor="terrainType" className="block text-sm font-medium text-gray-700">
            {tListing('type')} <span className="text-[#E63946]">*</span>
          </label>
          <select
            id="terrainType"
            {...register('terrainType')}
            className="mt-1 block w-full rounded-lg border border-[#E8E0D5] bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-[#2D6A4F] focus:outline-none focus:ring-1 focus:ring-[#2D6A4F]"
          >
            <option value="">{t('selectType')}</option>
            {TERRAIN_TYPES.map((type) => (
              <option key={type} value={type}>
                {tTerrain(type)}
              </option>
            ))}
          </select>
          {errors.terrainType && (
            <p className="mt-1 text-xs text-[#E63946]">{errors.terrainType.message}</p>
          )}
        </div>

        {/* Ville et Quartier */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700">
              {tListing('city')} <span className="text-[#E63946]">*</span>
            </label>
            <select
              id="city"
              {...register('city')}
              className="mt-1 block w-full rounded-lg border border-[#E8E0D5] bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-[#2D6A4F] focus:outline-none focus:ring-1 focus:ring-[#2D6A4F]"
            >
              <option value="">{t('selectCity')}</option>
              {Object.entries(cities).map(([key, city]) => (
                <option key={key} value={key}>
                  {city.name}
                </option>
              ))}
            </select>
            {errors.city && (
              <p className="mt-1 text-xs text-[#E63946]">{errors.city.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="quarter" className="block text-sm font-medium text-gray-700">
              {tListing('quarter')}
            </label>
            <select
              id="quarter"
              {...register('quarter')}
              disabled={quarters.length === 0}
              className="mt-1 block w-full rounded-lg border border-[#E8E0D5] bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-[#2D6A4F] focus:outline-none focus:ring-1 focus:ring-[#2D6A4F] disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="">{t('selectQuarter')}</option>
              {quarters.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ========================================== */}
        {/* Champs : Coordonnées GPS (optionnel)        */}
        {/* ========================================== */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('coordinates')}
          </label>
          <p className="mt-0.5 text-xs text-gray-500">
            {t('coordinatesHint')}
          </p>
          <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="latitude" className="block text-xs font-medium text-gray-500">
                {t('latitude')}
              </label>
              <input
                id="latitude"
                type="number"
                step="any"
                {...register('latitude', { valueAsNumber: true })}
                placeholder={t('latitudePlaceholder')}
                className="mt-1 block w-full rounded-lg border border-[#E8E0D5] bg-white px-3 py-2.5 text-sm placeholder:text-gray-400 focus:border-[#2D6A4F] focus:outline-none focus:ring-1 focus:ring-[#2D6A4F]"
              />
              {errors.latitude && (
                <p className="mt-1 text-xs text-[#E63946]">{errors.latitude.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="longitude" className="block text-xs font-medium text-gray-500">
                {t('longitude')}
              </label>
              <input
                id="longitude"
                type="number"
                step="any"
                {...register('longitude', { valueAsNumber: true })}
                placeholder={t('longitudePlaceholder')}
                className="mt-1 block w-full rounded-lg border border-[#E8E0D5] bg-white px-3 py-2.5 text-sm placeholder:text-gray-400 focus:border-[#2D6A4F] focus:outline-none focus:ring-1 focus:ring-[#2D6A4F]"
              />
              {errors.longitude && (
                <p className="mt-1 text-xs text-[#E63946]">{errors.longitude.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* ========================================== */}
        {/* Section : Photos existantes + ajout        */}
        {/* ========================================== */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('addPhotos')}
          </label>
          <p className="mt-0.5 text-xs text-gray-500">
            {t('photoHint', { max: MAX_PHOTOS_PER_LISTING })}
          </p>

          {/* Grille des photos existantes (déjà sur Supabase) */}
          {existingPhotos.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {existingPhotos.map((photo) => (
                <div key={photo.id} className="relative aspect-square overflow-hidden rounded-lg border border-[#E8E0D5]">
                  <img
                    src={getPublicUrl(photo.storagePath) ?? ''}
                    alt="Photo existante"
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Zone de drag & drop pour nouvelles photos */}
          {totalPhotos < MAX_PHOTOS_PER_LISTING && (
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => photoInputRef.current?.click()}
              className="mt-2 flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#E8E0D5] bg-[#FAF7F2] p-6 transition-colors hover:border-[#2D6A4F]/40 hover:bg-[#FAF7F2]/80"
              role="button"
              tabIndex={0}
              aria-label={t('addPhotos')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  photoInputRef.current?.click()
                }
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-8 w-8 text-gray-400" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
              </svg>
              <p className="mt-2 text-sm text-gray-500">
                Glissez-déposez ou cliquez pour ajouter
              </p>
              <p className="mt-0.5 text-xs text-gray-400">
                {totalPhotos}/{MAX_PHOTOS_PER_LISTING} photos
              </p>
            </div>
          )}

          <input
            ref={photoInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            multiple
            onChange={(e) => {
              if (e.target.files) handlePhotos(e.target.files)
              e.target.value = ''
            }}
            className="hidden"
            aria-hidden="true"
          />

          {/* Grille des nouvelles photos (pas encore uploadées) */}
          {newPhotos.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {newPhotos.map((photo) => (
                <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-lg border border-[#E8E0D5]">
                  <img
                    src={photo.previewUrl}
                    alt="Nouvelle photo"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeNewPhoto(photo.id)
                    }}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#E63946] text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                    aria-label="Supprimer cette photo"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ========================================== */}
        {/* Section : Vidéo (existante + ajout/remplacement) */}
        {/* ========================================== */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('addVideo')}
          </label>
          <p className="mt-0.5 text-xs text-gray-500">
            {t('videoHint')}
          </p>

          {/* Vidéo existante (déjà sur Supabase) */}
          {existingVideoPath && !videoRemoved && (
            <div className="mt-2 overflow-hidden rounded-lg border border-[#E8E0D5]">
              <video
                src={getPublicUrl(existingVideoPath, STORAGE_BUCKETS.videos) ?? ''}
                controls
                className="w-full"
                style={{ maxHeight: '250px' }}
              />
              <div className="flex items-center justify-between bg-gray-50 px-3 py-2">
                <span className="text-xs text-gray-600">{tListing('video')}</span>
                <button
                  type="button"
                  onClick={removeExistingVideo}
                  className="text-xs font-medium text-[#E63946] hover:underline"
                >
                  {tCommon('delete')}
                </button>
              </div>
            </div>
          )}

          {/* Nouvelle vidéo sélectionnée (aperçu local) */}
          {newVideoFile && newVideoPreviewUrl && (
            <div className="mt-2 overflow-hidden rounded-lg border border-[#E8E0D5]">
              <video
                src={newVideoPreviewUrl}
                controls
                className="w-full"
                style={{ maxHeight: '250px' }}
              />
              <div className="flex items-center justify-between bg-gray-50 px-3 py-2">
                <span className="truncate text-xs text-gray-600">{newVideoFile.name}</span>
                <button
                  type="button"
                  onClick={removeNewVideo}
                  className="text-xs font-medium text-[#E63946] hover:underline"
                >
                  {tCommon('delete')}
                </button>
              </div>
            </div>
          )}

          {/* Zone de sélection — visible si aucune vidéo (ni existante ni nouvelle) */}
          {!newVideoFile && (!existingVideoPath || videoRemoved) && (
            <div
              onClick={() => videoInputRef.current?.click()}
              className="mt-2 flex min-h-[80px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#E8E0D5] bg-[#FAF7F2] p-4 transition-colors hover:border-[#2D6A4F]/40"
              role="button"
              tabIndex={0}
              aria-label={t('addVideo')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  videoInputRef.current?.click()
                }
              }}
            >
              {/* Icône vidéo */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6 text-gray-400" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
              <p className="mt-1 text-xs text-gray-500">Cliquez pour ajouter une vidéo</p>
            </div>
          )}

          {/* Input file caché pour la vidéo */}
          <input
            ref={videoInputRef}
            type="file"
            accept={ACCEPTED_VIDEO_TYPES.join(',')}
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleVideo(e.target.files[0])
              }
              e.target.value = ''
            }}
            className="hidden"
            aria-hidden="true"
          />

          {/* Message d'erreur de validation vidéo */}
          {videoError && (
            <p className="mt-1 text-xs text-[#E63946]">{videoError}</p>
          )}
        </div>

        {/* Erreur de soumission */}
        {submitError && (
          <div className="rounded-lg border border-[#E63946]/20 bg-[#E63946]/5 px-4 py-3">
            <p className="text-sm text-[#E63946]">{submitError}</p>
          </div>
        )}

        {/* Boutons d'action */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          {/* Bouton "Marquer comme vendu" — change le statut */}
          {listing?.status === 'active' && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={markAsSold}
              className="rounded-lg border border-blue-200 bg-blue-50 px-5 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('markSold')}
            </button>
          )}

          <div className="flex flex-1 justify-end gap-3">
            {/* Bouton annuler */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => router.push(`/listings/${listingId}`)}
              className="rounded-lg border border-[#E8E0D5] bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {tCommon('cancel')}
            </button>

            {/* Bouton enregistrer */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit(onSubmit)}
              className="rounded-lg bg-[#2D6A4F] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#2D6A4F]/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? '...' : t('updateButton')}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
