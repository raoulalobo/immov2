/**
 * Schémas de validation Zod pour les annonces.
 * Partagés entre le client (react-hook-form) et le serveur (API Routes).
 *
 * Exemple d'usage côté client :
 *   import { createListingSchema } from '@/lib/validations/listing'
 *   const form = useForm({ resolver: zodResolver(createListingSchema) })
 *
 * Exemple d'usage côté serveur :
 *   const data = createListingSchema.parse(await req.json())
 */
import { z } from 'zod'
import { TERRAIN_TYPES, LISTING_STATUSES } from '@/lib/constants'

// --- Création d'annonce ---
// Utilisé dans le formulaire de création (POST /api/listings)
export const createListingSchema = z.object({
  title: z
    .string()
    .min(5, 'Le titre doit contenir au moins 5 caractères')
    .max(120, 'Le titre ne doit pas dépasser 120 caractères'),
  description: z
    .string()
    .max(2000, 'La description ne doit pas dépasser 2000 caractères')
    .optional(),
  priceFcfa: z
    .number()
    .int('Le prix doit être un nombre entier')
    .positive('Le prix doit être supérieur à 0')
    .max(10_000_000_000, 'Le prix ne peut pas dépasser 10 milliards FCFA'),
  surfaceM2: z
    .number()
    .positive('La surface doit être supérieure à 0')
    .max(1_000_000, 'La surface ne peut pas dépasser 1 000 000 m²'),
  terrainType: z.enum(TERRAIN_TYPES, {
    error: 'Type de terrain invalide',
  }),
  city: z
    .string()
    .min(1, 'La ville est obligatoire'),
  quarter: z
    .string()
    .optional(),
  latitude: z
    .number()
    .min(-90, 'Latitude invalide')
    .max(90, 'Latitude invalide')
    .optional(),
  longitude: z
    .number()
    .min(-180, 'Longitude invalide')
    .max(180, 'Longitude invalide')
    .optional(),
})

export type CreateListingInput = z.infer<typeof createListingSchema>

// --- Mise à jour d'annonce ---
// Tous les champs sont optionnels (PATCH /api/listings/[id])
export const updateListingSchema = createListingSchema.partial().extend({
  status: z
    .enum(LISTING_STATUSES, {
      error: 'Statut invalide',
    })
    .optional(),
  // videoPath : chemin Supabase Storage de la vidéo, ou null pour supprimer
  videoPath: z.string().nullable().optional(),
})

export type UpdateListingInput = z.infer<typeof updateListingSchema>

// --- Recherche d'annonces ---
// Utilisé pour les query params de la page /search
export const searchListingsSchema = z.object({
  city: z.string().optional(),
  quarter: z.string().optional(),
  terrainType: z.enum(TERRAIN_TYPES).optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  minSurface: z.coerce.number().positive().optional(),
  maxSurface: z.coerce.number().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(12),
})

export type SearchListingsInput = z.infer<typeof searchListingsSchema>
