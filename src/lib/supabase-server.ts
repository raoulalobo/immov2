/**
 * Client Supabase côté serveur — accès avec la clé service_role.
 *
 * Rôle :
 *   Fournit un client Supabase avec les droits admin (service_role)
 *   pour les opérations backend : upload/suppression de fichiers dans Storage,
 *   gestion des buckets, etc.
 *
 * Interactions :
 *   - Utilisé par les routes API (ex: POST /api/listings/[id]/photos)
 *   - Lit NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY depuis .env
 *   - Ne doit JAMAIS être importé côté client (expose la clé service_role)
 *
 * Exemple :
 *   import { supabaseAdmin } from '@/lib/supabase-server'
 *   const { data, error } = await supabaseAdmin.storage
 *     .from('photos')
 *     .upload('listings/abc/photo.jpg', file)
 */
import { createClient } from '@supabase/supabase-js'

/**
 * Client Supabase admin — clé service_role (accès complet).
 *
 * ATTENTION : ce client a un accès illimité à toutes les ressources Supabase.
 * Ne jamais l'exposer côté client ou dans les réponses API.
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      // Désactiver la persistance de session côté serveur
      // (pas de cookie/localStorage en Node.js)
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
