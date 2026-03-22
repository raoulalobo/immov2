/**
 * Source unique de vérité pour toutes les valeurs enum du projet.
 * Utilisé par : Prisma (schéma), Zod (validation), composants UI (dropdowns),
 * et les clés i18n (traductions).
 *
 * Exemple d'usage :
 *   import { TERRAIN_TYPES, LISTING_STATUSES } from '@/lib/constants'
 *   TERRAIN_TYPES.map(t => <option key={t} value={t}>{t}</option>)
 */

// --- Rôles utilisateur ---
// 'user' = utilisateur standard (peut acheter et vendre)
// 'admin' = administrateur (modération, vérification, gestion)
export const USER_ROLES = ['user', 'admin'] as const
export type UserRole = (typeof USER_ROLES)[number]

// --- Statuts utilisateur ---
// 'active' = compte actif
// 'suspended' = compte suspendu par un admin
// 'deleted' = soft delete (anonymisé, purge 30j)
export const USER_STATUSES = ['active', 'suspended', 'deleted'] as const
export type UserStatus = (typeof USER_STATUSES)[number]

// --- Types de terrain ---
// Les 3 types disponibles au MVP, extensibles par l'admin
export const TERRAIN_TYPES = ['residential', 'commercial', 'agricultural'] as const
export type TerrainType = (typeof TERRAIN_TYPES)[number]

// --- Statuts d'annonce ---
// Cycle de vie : draft → active → sold | expired | suspended
export const LISTING_STATUSES = ['draft', 'active', 'sold', 'expired', 'suspended'] as const
export type ListingStatus = (typeof LISTING_STATUSES)[number]

// --- Statuts de signalement ---
// 'pending' = en attente de revue admin
// 'confirmed' = signalement confirmé par l'admin
// 'dismissed' = signalement rejeté par l'admin
export const REPORT_STATUSES = ['pending', 'confirmed', 'dismissed'] as const
export type ReportStatus = (typeof REPORT_STATUSES)[number]

// --- Types de document de vérification ---
// CNI = Carte Nationale d'Identité camerounaise
// passport = Passeport
export const DOCUMENT_TYPES = ['cni', 'passport'] as const
export type DocumentType = (typeof DOCUMENT_TYPES)[number]

// --- Statuts de demande de vérification ---
// 'pending' = en attente de revue admin (SLA 48h ouvrées)
// 'approved' = approuvé → badge "Vendeur vérifié" actif
// 'rejected' = rejeté avec motif
export const VERIFICATION_STATUSES = ['pending', 'approved', 'rejected'] as const
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number]

// --- Durées et limites ---
// Durée de vie par défaut d'une annonce en jours
export const LISTING_EXPIRY_DAYS = 90
// Nombre de jours avant expiration pour envoyer l'email d'avertissement
export const EXPIRY_WARNING_DAYS = 7
// Nombre de signalements avant suspension automatique
export const AUTO_SUSPEND_REPORT_COUNT = 3
// Nombre de signalements confirmés avant révocation du badge vérifié
export const BADGE_REVOCATION_REPORT_COUNT = 3
// Durée de rétention des données après soft delete (jours)
export const SOFT_DELETE_RETENTION_DAYS = 30

// --- Upload ---
// Taille maximale d'une photo (avant compression client, en octets) : 10 Mo
export const MAX_PHOTO_SIZE = 10 * 1024 * 1024
// Taille maximale d'une vidéo (en octets) : 50 Mo
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024
// Durée maximale d'une vidéo (en secondes)
export const MAX_VIDEO_DURATION = 30
// Nombre maximum de photos par annonce
export const MAX_PHOTOS_PER_LISTING = 10
// Formats de photo acceptés
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
// Formats de vidéo acceptés
export const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm'] as const

// --- Rate limiting ---
// Limites par fenêtre de temps
export const RATE_LIMITS = {
  auth: { requests: 5, window: '1m' },       // 5 requêtes/min sur les routes auth
  contact: { requests: 10, window: '1h' },    // 10 clics Contacter/h par listing
  report: { requests: 3, window: '1h' },      // 3 signalements/h par utilisateur
} as const

// --- Locales supportées ---
export const LOCALES = ['fr', 'en'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'fr'
