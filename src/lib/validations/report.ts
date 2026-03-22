/**
 * Schémas de validation pour les signalements et la vérification vendeur.
 */
import { z } from 'zod'
import { DOCUMENT_TYPES } from '@/lib/constants'

// --- Signalement d'annonce ---
export const createReportSchema = z.object({
  reason: z
    .string()
    .min(10, 'La raison doit contenir au moins 10 caractères')
    .max(500, 'La raison ne doit pas dépasser 500 caractères'),
})

export type CreateReportInput = z.infer<typeof createReportSchema>

// --- Demande de vérification vendeur ---
export const verificationRequestSchema = z.object({
  documentType: z.enum(DOCUMENT_TYPES, {
    error: 'Type de document invalide',
  }),
  documentNumber: z
    .string()
    .min(5, 'Le numéro de document doit contenir au moins 5 caractères')
    .max(50, 'Le numéro de document ne doit pas dépasser 50 caractères'),
})

export type VerificationRequestInput = z.infer<typeof verificationRequestSchema>

// --- Recherche sauvegardée ---
export const savedSearchSchema = z.object({
  city: z.string().optional(),
  quarter: z.string().optional(),
  terrainType: z.string().optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  minSurface: z.coerce.number().positive().optional(),
  maxSurface: z.coerce.number().positive().optional(),
})

export type SavedSearchInput = z.infer<typeof savedSearchSchema>
