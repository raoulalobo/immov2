/**
 * Page de creation d'annonce — composant CLIENT.
 *
 * Role :
 *   Formulaire complet pour creer une nouvelle annonce de terrain.
 *   Permet de saisir : titre, description, prix, surface, type de terrain,
 *   ville, quartier, photos (avec compression) et video (apercu).
 *
 * Interactions :
 *   - react-hook-form + zodResolver : validation du formulaire avec createListingSchema
 *   - browser-image-compression : compression des photos avant upload
 *   - API POST /api/listings : envoi des donnees du formulaire
 *   - cities.json : donnees des villes et quartiers camerounais
 *   - next-intl : traductions i18n (namespace "createListing", "listing", "terrainType")
 *   - Navigation i18n : redirection apres creation reussie
 *
 * Flux utilisateur :
 *   1. Remplir le formulaire (titre, prix, surface, type, ville, quartier)
 *   2. Optionnel : ajouter des photos (drag & drop ou clic, max 10)
 *   3. Optionnel : ajouter une video (max 50 Mo, 30s)
 *   4. Cliquer sur "Publier" (status=active) ou "Brouillon" (status=draft)
 *   5. Redirection vers la page detail de l'annonce creee
 *
 * Exemple d'URL :
 *   /fr/listings/new — formulaire en francais
 *   /en/listings/new — formulaire en anglais
 */
'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
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

// --- Types internes ---

/** Represente une photo avec son apercu local (pas encore uploadee sur Supabase) */
interface PhotoPreview {
  /** Identifiant unique cote client (pour le key React) */
  id: string
  /** Fichier compresse pret pour l'upload */
  file: File
  /** URL blob pour l'apercu dans le navigateur */
  previewUrl: string
}

/** Structure des donnees de villes chargees depuis cities.json */
interface CityData {
  name: string
  lat: number
  lng: number
  quarters: string[]
}

export default function CreateListingPage() {
  // --- Vérification de session ---
  // Redirige vers /login si l'utilisateur n'est pas connecté
  const { data: session, isPending } = authClient.useSession()
  const router = useRouter()

  useEffect(() => {
    if (!isPending && !session) {
      router.push('/login')
    }
  }, [isPending, session, router])

  // --- Traductions ---
  const t = useTranslations('createListing')
  const tListing = useTranslations('listing')
  const tTerrain = useTranslations('terrainType')

  // --- Etat du formulaire via react-hook-form ---
  // zodResolver valide automatiquement chaque champ avec createListingSchema
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateListingInput>({
    resolver: zodResolver(createListingSchema),
    defaultValues: {
      title: '',
      description: '',
      priceFcfa: undefined,
      surfaceM2: undefined,
      terrainType: undefined,
      city: '',
      quarter: '',
    },
  })

  // --- Etat des villes et quartiers ---
  // cities : donnees chargees depuis /data/cities.json
  const [cities, setCities] = useState<Record<string, CityData>>({})
  // quarters : quartiers de la ville selectionnee (mis a jour dynamiquement)
  const [quarters, setQuarters] = useState<string[]>([])

  // Observer la ville selectionnee pour mettre a jour les quartiers
  const selectedCity = watch('city')

  // --- Etat des medias ---
  // photos : liste des photos selectionnees avec apercu
  const [photos, setPhotos] = useState<PhotoPreview[]>([])
  // videoFile : fichier video selectionne (null si aucun)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  // videoPreviewUrl : URL blob de la video pour l'apercu
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
  // videoError : message d'erreur de validation de la video
  const [videoError, setVideoError] = useState<string | null>(null)

  // --- Etat de soumission ---
  // isSubmitting : true pendant l'envoi du formulaire (empeche les double-clics)
  const [isSubmitting, setIsSubmitting] = useState(false)
  // submitError : message d'erreur retourne par l'API
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Ref pour l'input file photo (cache, declenche via bouton)
  const photoInputRef = useRef<HTMLInputElement>(null)
  // Ref pour l'input file video
  const videoInputRef = useRef<HTMLInputElement>(null)

  // --- Chargement des villes au montage ---
  useEffect(() => {
    // Fetch les donnees des villes camerounaises depuis le fichier statique
    fetch('/data/cities.json')
      .then((res) => res.json())
      .then((data: Record<string, CityData>) => setCities(data))
      .catch((err) => console.error('Erreur chargement cities.json:', err))
  }, [])

  // --- Mise a jour des quartiers quand la ville change ---
  useEffect(() => {
    if (selectedCity && cities[selectedCity]) {
      // Recuperer les quartiers de la ville selectionnee
      setQuarters(cities[selectedCity].quarters)
      // Reinitialiser le quartier selectionne
      setValue('quarter', '')
    } else {
      setQuarters([])
    }
  }, [selectedCity, cities, setValue])

  // --- Gestion des photos ---

  /**
   * Compresse et ajoute des photos a la liste.
   * Utilise browser-image-compression pour reduire la taille avant upload.
   *
   * Options de compression :
   *   - maxSizeMB: 1 Mo max apres compression
   *   - maxWidthOrHeight: 1920px max
   *   - useWebWorker: true pour ne pas bloquer l'UI
   *
   * @param files - Liste de fichiers selectionnes par l'utilisateur
   */
  const handlePhotos = useCallback(
    async (files: FileList | File[]) => {
      // Verifier la limite de photos
      const remaining = MAX_PHOTOS_PER_LISTING - photos.length
      const filesToProcess = Array.from(files).slice(0, remaining)

      for (const file of filesToProcess) {
        // Verifier le type MIME
        if (!ACCEPTED_IMAGE_TYPES.includes(file.type as typeof ACCEPTED_IMAGE_TYPES[number])) {
          continue
        }

        try {
          // Compresser l'image avec browser-image-compression
          const compressedFile = await imageCompression(file, {
            maxSizeMB: 1,              // Taille max apres compression : 1 Mo
            maxWidthOrHeight: 1920,     // Dimension max : 1920px
            useWebWorker: true,         // Compression en arriere-plan
          })

          // Creer un apercu local (URL blob)
          const previewUrl = URL.createObjectURL(compressedFile)

          // Ajouter a la liste des photos
          setPhotos((prev) => [
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
    [photos.length]
  )

  /**
   * Supprime une photo de la liste par son identifiant.
   * Libere egalement l'URL blob pour eviter les fuites memoire.
   *
   * @param photoId - Identifiant unique de la photo a supprimer
   */
  const removePhoto = useCallback((photoId: string) => {
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === photoId)
      if (photo) {
        // Liberer l'URL blob
        URL.revokeObjectURL(photo.previewUrl)
      }
      return prev.filter((p) => p.id !== photoId)
    })
  }, [])

  // --- Gestion du drag & drop ---

  /**
   * Empeche le comportement par defaut du navigateur lors du drag over.
   * Necessaire pour que le drop fonctionne.
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  /**
   * Gere le drop de fichiers dans la zone de depot.
   * Filtre les fichiers pour ne garder que les images.
   */
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const files = e.dataTransfer.files
      if (files.length > 0) {
        handlePhotos(files)
      }
    },
    [handlePhotos]
  )

  // --- Gestion de la video ---

  /**
   * Valide et selectionne un fichier video.
   * Verifications :
   *   - Format : mp4 ou webm uniquement
   *   - Taille : max 50 Mo (MAX_VIDEO_SIZE)
   *   - Duree : max 30 secondes (MAX_VIDEO_DURATION)
   *
   * @param file - Fichier video selectionne par l'utilisateur
   */
  const handleVideo = useCallback((file: File) => {
    setVideoError(null)

    // Verifier le format
    if (!ACCEPTED_VIDEO_TYPES.includes(file.type as typeof ACCEPTED_VIDEO_TYPES[number])) {
      setVideoError('Format non supporte. Utilisez MP4 ou WebM.')
      return
    }

    // Verifier la taille (50 Mo max)
    if (file.size > MAX_VIDEO_SIZE) {
      setVideoError(`La video ne doit pas depasser ${MAX_VIDEO_SIZE / (1024 * 1024)} Mo.`)
      return
    }

    // Verifier la duree via un element <video> temporaire
    const video = document.createElement('video')
    video.preload = 'metadata'

    video.onloadedmetadata = () => {
      // Liberer l'URL apres chargement des metadonnees
      URL.revokeObjectURL(video.src)

      if (video.duration > MAX_VIDEO_DURATION) {
        setVideoError(`La video ne doit pas depasser ${MAX_VIDEO_DURATION} secondes.`)
        return
      }

      // Video valide — creer l'apercu
      // Liberer l'ancien apercu si existant
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl)
      }

      setVideoFile(file)
      setVideoPreviewUrl(URL.createObjectURL(file))
    }

    video.onerror = () => {
      setVideoError('Impossible de lire cette video.')
    }

    video.src = URL.createObjectURL(file)
  }, [videoPreviewUrl])

  /**
   * Supprime la video selectionnee et libere les ressources.
   */
  const removeVideo = useCallback(() => {
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl)
    }
    setVideoFile(null)
    setVideoPreviewUrl(null)
    setVideoError(null)
  }, [videoPreviewUrl])

  // --- Soumission du formulaire ---

  /**
   * Envoie les donnees du formulaire a l'API POST /api/listings.
   * Appele par react-hook-form apres validation Zod reussie.
   *
   * @param data - Donnees validees par createListingSchema
   * @param status - "active" pour publier, "draft" pour sauvegarder en brouillon
   */
  async function onSubmit(data: CreateListingInput, status: 'active' | 'draft') {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      // --- 1. Envoi des donnees de l'annonce ---
      const response = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          status, // "active" ou "draft"
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la creation')
      }

      const { listing } = await response.json()

      // --- 2. Upload des photos vers Supabase Storage ---
      // Les photos sont envoyées après la création de l'annonce
      // car on a besoin de l'ID pour le chemin de stockage
      if (photos.length > 0) {
        const formData = new FormData()
        for (const photo of photos) {
          formData.append('photos', photo.file)
        }

        const uploadRes = await fetch(`/api/listings/${listing.id}/photos`, {
          method: 'POST',
          body: formData,
        })

        if (!uploadRes.ok) {
          // L'annonce est créée mais les photos ont échoué
          // On redirige quand même, l'utilisateur pourra réessayer
          console.error('Erreur upload photos:', await uploadRes.text())
        }
      }

      // --- 3. Upload de la vidéo vers Supabase Storage ---
      // La vidéo est envoyée après la création car on a besoin de l'ID
      if (videoFile) {
        const videoFormData = new FormData()
        videoFormData.append('video', videoFile)

        const videoRes = await fetch(`/api/listings/${listing.id}/video`, {
          method: 'POST',
          body: videoFormData,
        })

        if (!videoRes.ok) {
          // L'annonce est créée mais la vidéo a échoué
          console.error('Erreur upload vidéo:', await videoRes.text())
        }
      }

      // --- 4. Redirection vers la page detail de l'annonce creee ---
      router.push(`/listings/${listing.id}`)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Erreur inconnue')
      setIsSubmitting(false)
    }
  }

  // Skeleton pendant la vérification de session
  if (isPending || !session) {
    return (
      <div className="mx-auto max-w-2xl animate-pulse px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-8 w-56 rounded-lg bg-[#E8E0D5]" />
        <div className="mt-8 space-y-6">
          {/* Champs du formulaire */}
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-28 rounded bg-[#F0EBE3]" />
              <div className="h-10 w-full rounded-lg bg-[#F0EBE3]" />
            </div>
          ))}
          {/* Zone photos */}
          <div className="h-32 w-full rounded-lg border-2 border-dashed border-[#E8E0D5] bg-[#FAF7F2]" />
          {/* Boutons */}
          <div className="flex justify-end gap-3">
            <div className="h-10 w-44 rounded-lg bg-[#E8E0D5]" />
            <div className="h-10 w-36 rounded-lg bg-[#E8E0D5]" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      {/* --- Titre de la page --- */}
      <h1 className="font-[var(--font-display)] text-2xl font-bold text-[#2D6A4F] sm:text-3xl">
        {t('title')}
      </h1>

      {/* --- Formulaire principal --- */}
      <form
        className="mt-8 space-y-6"
        onSubmit={(e) => e.preventDefault()} // Empecher la soumission native (gere par les boutons)
      >
        {/* ========================================== */}
        {/* Champ : Titre de l'annonce                 */}
        {/* ========================================== */}
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
          {/* Message d'erreur de validation */}
          {errors.title && (
            <p className="mt-1 text-xs text-[#E63946]">{errors.title.message}</p>
          )}
        </div>

        {/* ========================================== */}
        {/* Champ : Description (optionnel)            */}
        {/* ========================================== */}
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

        {/* ========================================== */}
        {/* Champs : Prix (FCFA) et Surface (m2)       */}
        {/* Disposition cote a cote sur desktop        */}
        {/* ========================================== */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Prix en FCFA */}
          <div>
            <label htmlFor="priceFcfa" className="block text-sm font-medium text-gray-700">
              {tListing('price')} (FCFA) <span className="text-[#E63946]">*</span>
            </label>
            <input
              id="priceFcfa"
              type="number"
              {...register('priceFcfa', { valueAsNumber: true })}
              placeholder={t('pricePlaceholder')}
              className="mt-1 block w-full rounded-lg border border-[#E8E0D5] bg-white px-3 py-2.5 text-sm placeholder:text-gray-400 focus:border-[#2D6A4F] focus:outline-none focus:ring-1 focus:ring-[#2D6A4F]"
            />
            {errors.priceFcfa && (
              <p className="mt-1 text-xs text-[#E63946]">{errors.priceFcfa.message}</p>
            )}
          </div>

          {/* Surface en m2 */}
          <div>
            <label htmlFor="surfaceM2" className="block text-sm font-medium text-gray-700">
              {tListing('surface')} (m&sup2;) <span className="text-[#E63946]">*</span>
            </label>
            <input
              id="surfaceM2"
              type="number"
              step="0.01"
              {...register('surfaceM2', { valueAsNumber: true })}
              placeholder={t('surfacePlaceholder')}
              className="mt-1 block w-full rounded-lg border border-[#E8E0D5] bg-white px-3 py-2.5 text-sm placeholder:text-gray-400 focus:border-[#2D6A4F] focus:outline-none focus:ring-1 focus:ring-[#2D6A4F]"
            />
            {errors.surfaceM2 && (
              <p className="mt-1 text-xs text-[#E63946]">{errors.surfaceM2.message}</p>
            )}
          </div>
        </div>

        {/* ========================================== */}
        {/* Champ : Type de terrain (dropdown)         */}
        {/* ========================================== */}
        <div>
          <label htmlFor="terrainType" className="block text-sm font-medium text-gray-700">
            {tListing('type')} <span className="text-[#E63946]">*</span>
          </label>
          <select
            id="terrainType"
            {...register('terrainType')}
            className="mt-1 block w-full rounded-lg border border-[#E8E0D5] bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-[#2D6A4F] focus:outline-none focus:ring-1 focus:ring-[#2D6A4F]"
          >
            {/* Option vide par defaut */}
            <option value="">{t('selectType')}</option>
            {/* Options generees a partir des constantes TERRAIN_TYPES */}
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

        {/* ========================================== */}
        {/* Champs : Ville et Quartier (dropdowns)     */}
        {/* Le quartier se met a jour quand la ville   */}
        {/* change (dependance dynamique)              */}
        {/* ========================================== */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Ville */}
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
              {/* Generer les options a partir des cles de cities.json */}
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

          {/* Quartier — depend de la ville selectionnee */}
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
              {quarters.map((quarter) => (
                <option key={quarter} value={quarter}>
                  {quarter}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ========================================== */}
        {/* Champs : Coordonnées GPS (optionnel)        */}
        {/* Latitude et longitude du terrain             */}
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
        {/* Section : Upload de photos                  */}
        {/* Drag & drop ou clic, max 10 photos          */}
        {/* Compression automatique via browser-image-  */}
        {/* compression avant stockage local            */}
        {/* ========================================== */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('addPhotos')}
          </label>
          <p className="mt-0.5 text-xs text-gray-500">
            {t('photoHint', { max: MAX_PHOTOS_PER_LISTING })}
          </p>

          {/* Zone de drag & drop */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => photoInputRef.current?.click()}
            className="mt-2 flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#E8E0D5] bg-[#FAF7F2] p-6 transition-colors hover:border-[#2D6A4F]/40 hover:bg-[#FAF7F2]/80"
            role="button"
            tabIndex={0}
            aria-label={t('addPhotos')}
            onKeyDown={(e) => {
              // Permettre l'activation au clavier (accessibilite)
              if (e.key === 'Enter' || e.key === ' ') {
                photoInputRef.current?.click()
              }
            }}
          >
            {/* Icone de telechargement */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-8 w-8 text-gray-400" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
            </svg>
            <p className="mt-2 text-sm text-gray-500">
              Glissez-deposez ou cliquez pour ajouter
            </p>
            <p className="mt-0.5 text-xs text-gray-400">
              {photos.length}/{MAX_PHOTOS_PER_LISTING} photos
            </p>
          </div>

          {/* Input file cache — declenche via la zone de drag & drop */}
          <input
            ref={photoInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            multiple
            onChange={(e) => {
              if (e.target.files) {
                handlePhotos(e.target.files)
              }
              // Reset pour permettre de re-selectionner le meme fichier
              e.target.value = ''
            }}
            className="hidden"
            aria-hidden="true"
          />

          {/* Grille d'apercus des photos selectionnees */}
          {photos.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {photos.map((photo) => (
                <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-lg border border-[#E8E0D5]">
                  {/* Apercu de la photo compressee */}
                  <img
                    src={photo.previewUrl}
                    alt="Apercu"
                    className="h-full w-full object-cover"
                  />
                  {/* Bouton de suppression — visible au survol */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      removePhoto(photo.id)
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
        {/* Section : Upload de video                   */}
        {/* Max 50 Mo, 30 secondes, format MP4/WebM     */}
        {/* Pour le moment : apercu local uniquement    */}
        {/* (upload Supabase sera ajoute plus tard)     */}
        {/* ========================================== */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('addVideo')}
          </label>
          <p className="mt-0.5 text-xs text-gray-500">
            {t('videoHint')}
          </p>

          {!videoFile ? (
            /* Zone de selection de video */
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
              {/* Icone video */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6 text-gray-400" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
              <p className="mt-1 text-xs text-gray-500">Cliquez pour ajouter une video</p>
            </div>
          ) : (
            /* Apercu de la video selectionnee */
            <div className="mt-2 overflow-hidden rounded-lg border border-[#E8E0D5]">
              <video
                src={videoPreviewUrl!}
                controls
                className="w-full"
                style={{ maxHeight: '250px' }}
              />
              {/* Nom du fichier et bouton de suppression */}
              <div className="flex items-center justify-between bg-gray-50 px-3 py-2">
                <span className="truncate text-xs text-gray-600">{videoFile.name}</span>
                <button
                  type="button"
                  onClick={removeVideo}
                  className="text-xs font-medium text-[#E63946] hover:underline"
                >
                  Supprimer
                </button>
              </div>
            </div>
          )}

          {/* Input file cache pour la video */}
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

          {/* Message d'erreur de validation de la video */}
          {videoError && (
            <p className="mt-1 text-xs text-[#E63946]">{videoError}</p>
          )}
        </div>

        {/* ========================================== */}
        {/* Erreur globale de soumission                */}
        {/* ========================================== */}
        {submitError && (
          <div className="rounded-lg border border-[#E63946]/20 bg-[#E63946]/5 px-4 py-3">
            <p className="text-sm text-[#E63946]">{submitError}</p>
          </div>
        )}

        {/* ========================================== */}
        {/* Boutons d'action : Publier / Brouillon      */}
        {/* ========================================== */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          {/* Bouton "Enregistrer comme brouillon" — status=draft */}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit((data) => onSubmit(data, 'draft'))}
            className="rounded-lg border border-[#E8E0D5] bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('saveDraft')}
          </button>

          {/* Bouton "Publier l'annonce" — status=active */}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit((data) => onSubmit(data, 'active'))}
            className="rounded-lg bg-[#2D6A4F] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#2D6A4F]/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Publication...' : t('publishButton')}
          </button>
        </div>
      </form>
    </div>
  )
}
