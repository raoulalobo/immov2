/**
 * Skeleton de chargement du dashboard vendeur.
 * Simule les stats + liste des annonces.
 *
 * Design system : skeleton #E8E0D5 animé vers #F0EBE3 (DESIGN.md)
 */
export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse px-4 py-8 sm:px-6 lg:px-8">
      {/* En-tête */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-8 w-56 rounded-lg bg-[#E8E0D5]" />
          <div className="h-4 w-32 rounded bg-[#F0EBE3]" />
        </div>
        <div className="h-10 w-48 rounded-lg bg-[#E8E0D5]" />
      </div>

      {/* Cartes de statistiques */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[#E8E0D5] bg-white p-5">
            <div className="h-3 w-28 rounded bg-[#F0EBE3]" />
            <div className="mt-3 h-9 w-16 rounded-lg bg-[#E8E0D5]" />
          </div>
        ))}
      </div>

      {/* Statut vérification */}
      <div className="mt-6 flex items-center gap-3 rounded-xl border border-[#E8E0D5] bg-white p-4">
        <div className="h-4 w-36 rounded bg-[#F0EBE3]" />
        <div className="h-6 w-28 rounded-full bg-[#E8E0D5]" />
      </div>

      {/* Titre section annonces */}
      <div className="mt-8">
        <div className="h-5 w-32 rounded bg-[#E8E0D5]" />
      </div>

      {/* Liste des annonces skeleton */}
      <div className="mt-4 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-xl border border-[#E8E0D5] bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            {/* Gauche : titre + badge */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-4 w-48 rounded bg-[#E8E0D5]" />
                <div className="h-5 w-16 rounded-full bg-[#F0EBE3]" />
              </div>
              <div className="h-3 w-36 rounded bg-[#F0EBE3]" />
            </div>
            {/* Droite : bouton + meta */}
            <div className="flex items-center gap-4">
              <div className="h-7 w-20 rounded-lg bg-[#E8E0D5]" />
              <div className="h-3 w-12 rounded bg-[#F0EBE3]" />
              <div className="h-3 w-20 rounded bg-[#F0EBE3]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
