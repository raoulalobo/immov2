/**
 * Schémas de validation Zod pour l'authentification.
 * Partagés entre les formulaires client et les API Routes.
 */
import { z } from 'zod'

// --- Inscription ---
export const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(100, 'Le nom ne doit pas dépasser 100 caractères'),
  email: z
    .string()
    .email('Adresse email invalide'),
  phone: z
    .string()
    .regex(/^\+?[0-9]{8,15}$/, 'Numéro de téléphone invalide (ex: +237 6XX XXX XXX)')
    .optional()
    .or(z.literal('')),
  password: z
    .string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .max(128, 'Le mot de passe ne doit pas dépasser 128 caractères'),
  confirmPassword: z
    .string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
})

export type RegisterInput = z.infer<typeof registerSchema>

// --- Connexion ---
export const loginSchema = z.object({
  email: z
    .string()
    .email('Adresse email invalide'),
  password: z
    .string()
    .min(1, 'Le mot de passe est obligatoire'),
})

export type LoginInput = z.infer<typeof loginSchema>
