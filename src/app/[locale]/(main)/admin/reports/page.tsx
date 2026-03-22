/**
 * Page de modération des signalements — liste tous les signalements en attente.
 *
 * Rôle :
 *   Afficher la file de modération pour les administrateurs.
 *   Chaque signalement affiche : titre de l'annonce, nom du signaleur,
 *   raison et date. L'admin peut confirmer ou rejeter chaque signalement.
 *
 * Interactions :
 *   - Prisma (db) : lecture de tous les signalements avec relations (listing, reporter)
 *   - next-intl (getTranslations) : traductions côté serveur
 *   - ReportActions : composant client pour les boutons d'action (confirmer/rejeter)
 *
 * Règles métier :
 *   - Si un signalement est confirmé et que l'annonce atteint 3+ confirmés,
 *     l'annonce est auto-suspendue (géré par l'API /api/admin/reports/[id])
 *   - Si le vendeur a 3+ signalements confirmés et est vérifié, son badge
 *     est révoqué (géré par l'API)
 *
 * URL : /[locale]/admin/reports
 */
import { db } from '@/lib/db'
import { getTranslations } from 'next-intl/server'
import { ReportActions } from './report-actions'

/**
 * ReportsPage — Page serveur listant les signalements.
 *
 * Flux :
 *   1. Récupérer les traductions admin.reports
 *   2. Charger tous les signalements (pending d'abord, puis les autres)
 *      avec les relations listing (titre) et reporter (nom)
 *   3. Afficher un tableau responsive avec les actions admin
 */
export default async function ReportsPage() {
  // --- 1. Récupérer les traductions ---
  const t = await getTranslations('admin.reports')

  // --- 2. Charger les signalements depuis la base de données ---
  // Les signalements "pending" apparaissent en premier (prioritaires)
  // On inclut l'annonce (titre) et le signaleur (nom) pour l'affichage
  const reports = await db.report.findMany({
    include: {
      listing: {
        select: { id: true, title: true },
      },
      reporter: {
        select: { id: true, name: true },
      },
    },
    orderBy: [
      // Les signalements pending en premier, puis par date décroissante
      { status: 'asc' },
      { createdAt: 'desc' },
    ],
  })

  return (
    <div>
      {/* Titre de la page */}
      <h1 className="mb-6 text-2xl font-bold text-[#2D6A4F]">{t('title')}</h1>

      {/* --- Cas vide : aucun signalement --- */}
      {reports.length === 0 ? (
        <div className="rounded-xl border border-[#E5E0D8] bg-white p-8 text-center text-[#6B7280]">
          {t('noReports')}
        </div>
      ) : (
        /* --- Tableau des signalements --- */
        <div className="overflow-x-auto rounded-xl border border-[#E5E0D8] bg-white">
          <table className="w-full text-left text-sm">
            {/* En-têtes du tableau */}
            <thead className="border-b border-[#E5E0D8] bg-[#F5F0EA]">
              <tr>
                <th className="px-4 py-3 font-semibold text-[#374151]">{t('listing')}</th>
                <th className="px-4 py-3 font-semibold text-[#374151]">{t('reporter')}</th>
                <th className="px-4 py-3 font-semibold text-[#374151]">{t('reason')}</th>
                <th className="px-4 py-3 font-semibold text-[#374151]">{t('date')}</th>
                <th className="px-4 py-3 font-semibold text-[#374151]">{t('status')}</th>
                <th className="px-4 py-3 font-semibold text-[#374151]">{t('actions')}</th>
              </tr>
            </thead>

            {/* Corps du tableau — une ligne par signalement */}
            <tbody className="divide-y divide-[#E5E0D8]">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-[#FAF7F2]">
                  {/* Titre de l'annonce signalée */}
                  <td className="max-w-[200px] truncate px-4 py-3 font-medium text-[#374151]">
                    {report.listing.title}
                  </td>

                  {/* Nom du signaleur */}
                  <td className="px-4 py-3 text-[#6B7280]">
                    {report.reporter.name}
                  </td>

                  {/* Raison du signalement (tronquée si trop longue) */}
                  <td className="max-w-[250px] truncate px-4 py-3 text-[#6B7280]">
                    {report.reason}
                  </td>

                  {/* Date de création du signalement */}
                  <td className="whitespace-nowrap px-4 py-3 text-[#6B7280]">
                    {new Date(report.createdAt).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </td>

                  {/* Badge de statut avec code couleur */}
                  <td className="px-4 py-3">
                    <StatusBadge status={report.status} t={t} />
                  </td>

                  {/* Boutons d'action — composant client pour les interactions */}
                  <td className="px-4 py-3">
                    {report.status === 'pending' ? (
                      <ReportActions
                        reportId={report.id}
                        labels={{
                          confirm: t('confirm'),
                          dismiss: t('dismiss'),
                          adminNote: t('adminNote'),
                          adminNotePlaceholder: t('adminNotePlaceholder'),
                          successConfirm: t('successConfirm'),
                          successDismiss: t('successDismiss'),
                        }}
                      />
                    ) : (
                      // Si déjà traité, afficher la note admin si elle existe
                      report.adminNote && (
                        <span className="text-xs italic text-[#6B7280]">
                          {report.adminNote}
                        </span>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/**
 * StatusBadge — Badge de statut avec couleur contextuelle.
 *
 * Couleurs :
 *   - pending  → jaune (warning) — en attente de traitement
 *   - confirmed → rouge (error) — signalement confirmé
 *   - dismissed → gris — signalement rejeté
 *
 * @param status - Statut du signalement ('pending' | 'confirmed' | 'dismissed')
 * @param t - Fonction de traduction pour le libellé du statut
 */
function StatusBadge({
  status,
  t,
}: {
  status: string
  t: (key: string) => string
}) {
  // Mappage des statuts vers des classes Tailwind
  const styles: Record<string, string> = {
    pending: 'bg-[#E9C46A]/20 text-[#92782D]',     // Jaune warning
    confirmed: 'bg-[#E63946]/10 text-[#E63946]',    // Rouge error
    dismissed: 'bg-[#6B7280]/10 text-[#6B7280]',    // Gris neutre
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
