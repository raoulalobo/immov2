/**
 * Skeleton de chargement de la page recherche.
 * Simule le panneau de filtres + la grille de résultats.
 *
 * Design system : skeleton #E8E0D5 animé vers #F0EBE3 (DESIGN.md)
 */
export default function SearchLoading() {
  return (
    <div className="mx-auto max-w-[1080px] animate-pulse px-4 py-8 sm:px-6">
      {/* Titre */}
      <div className="h-8 w-56 rounded-lg bg-[#E8E0D5]" />

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        {/* Panneau filtres skeleton */}
        <aside className="w-full space-y-4 rounded-xl border border-[#E8E0D5] bg-white p-5 lg:w-72 lg:shrink-0">
          {/* Titre filtres */}
          <div className="h-5 w-20 rounded bg-[#E8E0D5]" />
          {/* Champs de filtre */}
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-24 rounded bg-[#F0EBE3]" />
              <div className="h-10 w-full rounded-lg bg-[#F0EBE3]" />
            </div>
          ))}
          {/* Bouton rechercher */}
          <div className="h-10 w-full rounded-lg bg-[#E8E0D5]" />
        </aside>

        {/* Grille de résultats skeleton */}
        <div className="flex-1">
          {/* Compteur résultats */}
          <div className="mb-4 h-4 w-32 rounded bg-[#E8E0D5]" />

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-xl border border-[#E8E0D5] bg-white"
              >
                {/* Image placeholder */}
                <div className="h-44 bg-[#F0EBE3]" />
                {/* Contenu */}
                <div className="space-y-3 p-4">
                  <div className="h-5 w-3/4 rounded bg-[#E8E0D5]" />
                  <div className="h-4 w-1/2 rounded bg-[#E8E0D5]" />
                  <div className="h-px bg-[#E8E0D5]" />
                  <div className="h-3 w-2/3 rounded bg-[#E8E0D5]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
