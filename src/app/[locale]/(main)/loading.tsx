/**
 * Skeleton de chargement global — affiché par Next.js (Suspense)
 * pendant le chargement de toute page sous /(main).
 *
 * Design system : skeleton #E8E0D5 animé vers #F0EBE3 (DESIGN.md)
 */
export default function MainLoading() {
  return (
    <div className="animate-pulse">
      {/* Hero skeleton */}
      <div className="bg-gradient-to-br from-primary-dark/80 to-primary/80 px-4 py-12 sm:py-16">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-4">
          {/* Titre hero */}
          <div className="h-8 w-3/4 rounded-lg bg-white/20" />
          {/* Sous-titre */}
          <div className="h-4 w-2/3 rounded bg-white/15" />
          {/* Barre de recherche */}
          <div className="mt-4 h-12 w-full rounded-lg bg-white/20" />
          {/* Chips villes */}
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 w-20 rounded-full bg-white/15" />
            ))}
          </div>
        </div>
      </div>

      {/* Grille d'annonces skeleton */}
      <div className="mx-auto max-w-[1080px] px-4 py-10 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="h-6 w-48 rounded bg-[#E8E0D5]" />
          <div className="h-4 w-24 rounded bg-[#E8E0D5]" />
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-xl border border-[#E8E0D5] bg-white"
            >
              <div className="h-44 bg-[#F0EBE3]" />
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
  )
}
