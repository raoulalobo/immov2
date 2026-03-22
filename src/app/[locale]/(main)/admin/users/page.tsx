/**
 * Page de gestion des utilisateurs — vue tableau pour l'admin.
 *
 * Rôle :
 *   Afficher un tableau de tous les utilisateurs de la plateforme avec :
 *   nom, email, rôle, statut vendeur, statut vérifié, statut du compte
 *   et nombre d'annonces. L'admin peut suspendre ou réactiver un utilisateur.
 *
 * Interactions :
 *   - Prisma (db) : lecture de tous les utilisateurs avec comptage des annonces
 *   - next-intl (getTranslations) : traductions côté serveur
 *   - UserActions : composant client pour les boutons de gestion
 *
 * URL : /[locale]/admin/users
 */
import { db } from '@/lib/db'
import { getTranslations } from 'next-intl/server'
import { UserActions } from './user-actions'

/**
 * AdminUsersPage — Page serveur listant tous les utilisateurs.
 *
 * Flux :
 *   1. Récupérer les traductions admin.users
 *   2. Charger tous les utilisateurs avec le nombre d'annonces (_count)
 *   3. Afficher un tableau responsive avec les actions de modération
 */
export default async function AdminUsersPage() {
  // --- 1. Récupérer les traductions ---
  const t = await getTranslations('admin.users')

  // --- 2. Charger tous les utilisateurs ---
  // Triés par date de création décroissante
  // _count.listings donne le nombre d'annonces sans charger les données
  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isVendor: true,
      isVerified: true,
      status: true,
      createdAt: true,
      // Comptage des annonces sans charger les données complètes
      _count: {
        select: { listings: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div>
      {/* Titre de la page */}
      <h1 className="mb-6 text-2xl font-bold text-[#2D6A4F]">{t('title')}</h1>

      {/* --- Cas vide : aucun utilisateur --- */}
      {users.length === 0 ? (
        <div className="rounded-xl border border-[#E5E0D8] bg-white p-8 text-center text-[#6B7280]">
          {t('noUsers')}
        </div>
      ) : (
        /* --- Tableau des utilisateurs --- */
        <div className="overflow-x-auto rounded-xl border border-[#E5E0D8] bg-white">
          <table className="w-full text-left text-sm">
            {/* En-têtes du tableau */}
            <thead className="border-b border-[#E5E0D8] bg-[#F5F0EA]">
              <tr>
                <th className="px-4 py-3 font-semibold text-[#374151]">{t('name')}</th>
                <th className="px-4 py-3 font-semibold text-[#374151]">{t('email')}</th>
                <th className="px-4 py-3 font-semibold text-[#374151]">{t('role')}</th>
                <th className="px-4 py-3 font-semibold text-[#374151]">{t('isVendor')}</th>
                <th className="px-4 py-3 font-semibold text-[#374151]">{t('isVerified')}</th>
                <th className="px-4 py-3 font-semibold text-[#374151]">{t('status')}</th>
                <th className="px-4 py-3 font-semibold text-[#374151]">{t('listingsCount')}</th>
                <th className="px-4 py-3 font-semibold text-[#374151]">{t('actions')}</th>
              </tr>
            </thead>

            {/* Corps du tableau — une ligne par utilisateur */}
            <tbody className="divide-y divide-[#E5E0D8]">
              {users.map((user: typeof users[number]) => (
                <tr key={user.id} className="hover:bg-[#FAF7F2]">
                  {/* Nom de l'utilisateur */}
                  <td className="px-4 py-3 font-medium text-[#374151]">
                    {user.name}
                  </td>

                  {/* Email */}
                  <td className="px-4 py-3 text-[#6B7280]">
                    {user.email}
                  </td>

                  {/* Rôle (user ou admin) avec badge */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        user.role === 'admin'
                          ? 'bg-[#457B9D]/10 text-[#457B9D]'  // Bleu info pour les admins
                          : 'bg-[#6B7280]/10 text-[#6B7280]'  // Gris pour les utilisateurs
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>

                  {/* Statut vendeur (Oui/Non) */}
                  <td className="px-4 py-3 text-[#6B7280]">
                    {user.isVendor ? (
                      <span className="text-[#2D6A4F] font-medium">{t('yes')}</span>
                    ) : (
                      <span className="text-[#9CA3AF]">{t('no')}</span>
                    )}
                  </td>

                  {/* Badge vendeur vérifié */}
                  <td className="px-4 py-3">
                    {user.isVerified ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#2D6A4F]/10 px-2.5 py-0.5 text-xs font-medium text-[#2D6A4F]">
                        {/* Icone check pour le badge vérifié */}
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        {t('yes')}
                      </span>
                    ) : (
                      <span className="text-[#9CA3AF] text-xs">{t('no')}</span>
                    )}
                  </td>

                  {/* Badge de statut du compte */}
                  <td className="px-4 py-3">
                    <UserStatusBadge status={user.status} />
                  </td>

                  {/* Nombre d'annonces */}
                  <td className="px-4 py-3 text-center text-[#6B7280]">
                    {user._count.listings}
                  </td>

                  {/* Boutons d'action — composant client */}
                  <td className="px-4 py-3">
                    <UserActions
                      userId={user.id}
                      currentStatus={user.status}
                      userRole={user.role}
                      labels={{
                        activate: t('activate'),
                        suspend: t('suspend'),
                      }}
                    />
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
 * UserStatusBadge — Badge de statut pour un utilisateur.
 *
 * Couleurs :
 *   - active    → vert (compte actif)
 *   - suspended → rouge (suspendu par admin)
 *   - deleted   → gris (soft delete, purge dans 30j)
 *
 * @param status - Statut du compte utilisateur
 */
function UserStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-[#2D6A4F]/10 text-[#2D6A4F]',
    suspended: 'bg-[#E63946]/10 text-[#E63946]',
    deleted: 'bg-[#6B7280]/10 text-[#6B7280]',
  }

  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
        styles[status] || styles.active
      }`}
    >
      {status}
    </span>
  )
}
