/**
 * Script d'initialisation du bucket Supabase Storage.
 *
 * Rôle :
 *   Crée le bucket "photos" dans Supabase Storage s'il n'existe pas,
 *   et le configure comme public (lecture sans authentification).
 *
 * Usage :
 *   npx tsx scripts/setup-storage.ts
 *
 * Prérequis :
 *   - Variables d'environnement NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY
 *     définies dans .env
 *
 * Ce script est idempotent : il peut être relancé sans risque.
 */
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const BUCKET_NAME = 'photos'

async function setupStorage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Variables manquantes : NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log(`🔧 Vérification du bucket "${BUCKET_NAME}"...`)

  // --- Vérifier si le bucket existe déjà ---
  const { data: buckets, error: listError } = await supabase.storage.listBuckets()

  if (listError) {
    console.error('❌ Erreur lors de la liste des buckets:', listError.message)
    process.exit(1)
  }

  const exists = buckets.some((b) => b.name === BUCKET_NAME)

  if (exists) {
    console.log(`✅ Le bucket "${BUCKET_NAME}" existe déjà.`)
  } else {
    // --- Créer le bucket ---
    // public: true = les fichiers sont accessibles sans token d'authentification
    // fileSizeLimit: 5 Mo max par fichier (les photos sont compressées à 1 Mo côté client)
    // allowedMimeTypes: uniquement JPEG, PNG, WebP
    const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024, // 5 Mo
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    })

    if (createError) {
      console.error('❌ Erreur lors de la création du bucket:', createError.message)
      process.exit(1)
    }

    console.log(`✅ Bucket "${BUCKET_NAME}" créé avec succès (public, 5 Mo max, images uniquement).`)
  }

  console.log('')
  console.log(`📸 URL publique des fichiers :`)
  console.log(`   ${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/<chemin>`)
}

setupStorage().catch((err) => {
  console.error('❌ Erreur inattendue:', err)
  process.exit(1)
})
