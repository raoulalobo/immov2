/**
 * Page de gestion des demandes de vérification vendeur.
 *
 * Rôle :
 *   Afficher la file des demandes de vérification pour les administrateurs.
 *   Chaque demande affiche : nom du vendeur, type de document, numéro,
 *   date de soumission et les aperçus des documents (recto/verso).
 *   L'admin peut approuver ou rejeter chaque demande.
 *
 * Interactions :
 *   - Prisma (db) : lecture des demandes de vérification avec relation vendor
 *   - next-intl (getTranslations) : traductions côté serveur
 *   - VerificationActions : composant client pour les boutons d'action
 *
 * Règles métier :
 *   - Si approuvé : le vendeur reçoit le badge "Vendeur vérifié" (isVerified=true)
 *   - Si rejeté : un motif de rejet est enregistré et affiché au vendeur
 *   - SLA : 48 heures ouvrées pour traiter une demande
 *
 * URL : /[locale]/admin/verification
 */
import { db } from '@/lib/db'
import { getTranslations } from 'next-intl/server'
import { VerificationActions } from './verification-actions'

/**
 * VerificationPage — Page serveur listant les demandes de vérification.
 *
 * Flux :
 *   1. Récupérer les traductions admin.verification
 *   2. Charger toutes les demandes (pending d'abord) avec le vendeur associé
 *   3. Afficher un tableau responsive avec aperçus documents et actions
 */
export default async function VerificationPage() {
  // --- 1. Récupérer les traductions ---
  const t = await getTranslations('admin.verification')

  // --- 2. Charger les demandes de vérification ---
  // Les demandes "pending" apparaissent en premier (SLA 48h à respecter)
  const requests = await db.verificationRequest.findMany({
    include: {
      vendor: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: [
      { status: 'asc' },
      { createdAt: 'desc' },
    ],
  })

  return (
    <div>
      {/* Titre de la page */}
      <h1 className="mb-6 text-2xl font-bold text-[#2D6A4F]">{t('title')}</h1>

      {/* --- Cas vide : aucune demande --- */}
      {requests.length === 0 ? (
        <div className="rounded-xl border border-[#E5E0D8] bg-white p-8 text-center text-[#6B7280]">
          {t('noRequests')}
        </div>
      ) : (
        /* --- Grille de cartes (plutôt qu'un tableau pour afficher les images) --- */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {requests.map((req) => (
            <div
              key={req.id}
              className="rounded-xl border border-[#E5E0D8] bg-white p-5 transition-shadow hover:shadow-sm"
            >
              {/* --- En-tête de la carte : vendeur + statut --- */}
              <div className="flex items-start justify-between">
                <div>
                  {/* Nom du vendeur */}
                  <h3 className="font-semibold text-[#374151]">
                    {req.vendor.name}
                  </h3>
                  {/* Email du vendeur */}
                  <p className="text-sm text-[#6B7280]">{req.vendor.email}</p>
                </div>

                {/* Badge de statut */}
                <VerificationStatusBadge status={req.status} t={t} />
              </div>

              {/* --- Informations du document --- */}
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                {/* Type de document (CNI ou Passeport) */}
                <div>
                  <span className="text-[#6B7280]">{t('documentType')} : </span>
                  <span className="font-medium text-[#374151]">
                    {req.documentType === 'cni'
                      ? 'Carte Nationale d\'Identité'
                      : 'Passeport'}
                  </span>
                </div>

                {/* Numéro du document */}
                <div>
                  <span className="text-[#6B7280]">{t('documentNumber')} : </span>
                  <span className="font-medium text-[#374151]">
                    {req.documentNumber}
                  </span>
                </div>

                {/* Date de soumission */}
                <div>
                  <span className="text-[#6B7280]">{t('date')} : </span>
                  <span className="font-medium text-[#374151]">
                    {new Date(req.createdAt).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              {/* --- Aperçu des documents (recto/verso) --- */}
              {/* Pour l'instant, placeholder car Supabase Storage n'est pas encore connecté */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                {/* Recto du document */}
                <div className="overflow-hidden rounded-lg border border-[#E5E0D8]">
                  <div className="bg-[#F5F0EA] px-3 py-1.5 text-xs font-medium text-[#6B7280]">
                    {t('rectoLabel')}
                  </div>
                  <div className="flex h-32 items-center justify-center bg-[#FAF7F2] text-sm text-[#9CA3AF]">
                    {/* Placeholder — sera remplacé par <Image> quand Supabase Storage sera connecté */}
                    {t('noDocumentPreview')}
                    <br />
                    <span className="mt-1 block text-xs">{req.rectoPath}</span>
                  </div>
                </div>

                {/* Verso du document */}
                <div className="overflow-hidden rounded-lg border border-[#E5E0D8]">
                  <div className="bg-[#F5F0EA] px-3 py-1.5 text-xs font-medium text-[#6B7280]">
                    {t('versoLabel')}
                  </div>
                  <div className="flex h-32 items-center justify-center bg-[#FAF7F2] text-sm text-[#9CA3AF]">
                    {t('noDocumentPreview')}
                    <br />
                    <span className="mt-1 block text-xs">{req.versoPath}</span>
                  </div>
                </div>
              </div>

              {/* --- Actions admin (uniquement pour les demandes pending) --- */}
              {req.status === 'pending' ? (
                <div className="mt-4 border-t border-[#E5E0D8] pt-4">
                  <VerificationActions
                    requestId={req.id}
                    labels={{
                      approve: t('approve'),
                      reject: t('reject'),
                      rejectionReason: t('rejectionReason'),
                      rejectionReasonPlaceholder: t('rejectionReasonPlaceholder'),
                      successApprove: t('successApprove'),
                      successReject: t('successReject'),
                    }}
                  />
                </div>
              ) : (
                // Afficher le motif de rejet si la demande a été rejetée
                req.status === 'rejected' && req.rejectionReason && (
                  <div className="mt-4 rounded-lg bg-[#E63946]/5 p-3 text-sm text-[#E63946]">
                    <strong>{t('rejectionReason')} :</strong> {req.rejectionReason}
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * VerificationStatusBadge — Badge de statut pour une demande de vérification.
 *
 * Couleurs :
 *   - pending  → jaune (en attente)
 *   - approved → vert (approuvé)
 *   - rejected → rouge (rejeté)
 */
function VerificationStatusBadge({
  status,
  t,
}: {
  status: string
  t: (key: string) => string
}) {
  const styles: Record<string, string> = {
    pending: 'bg-[#E9C46A]/20 text-[#92782D]',
    approved: 'bg-[#2D6A4F]/10 text-[#2D6A4F]',
    rejected: 'bg-[#E63946]/10 text-[#E63946]',
  }

  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
        styles[status] || styles.pending
      }`}
    >
      {t(status)}
    </span>
  )
}
