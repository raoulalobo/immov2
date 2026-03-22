/**
 * Skeleton de chargement de la page détail d'annonce.
 * Simule la galerie photo + infos + sidebar vendeur.
 *
 * Design system : skeleton #E8E0D5 animé vers #F0EBE3 (DESIGN.md)
 */
export default function ListingDetailLoading() {
  return (
    <div className="mx-auto max-w-[1080px] animate-pulse px-4 py-6 sm:px-6 lg:py-10">
      {/* Barre de navigation */}
      <div className="mb-4 flex items-center justify-between">
        <div className="h-4 w-32 rounded bg-[#E8E0D5]" />
        <div className="h-9 w-24 rounded-lg bg-[#E8E0D5]" />
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Colonne principale (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Galerie photo principale */}
          <div className="h-64 rounded-xl bg-[#F0EBE3] sm:h-80 lg:h-96" />

          {/* Miniatures */}
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-[#F0EBE3] sm:h-20" />
            ))}
          </div>

          {/* Titre */}
          <div className="space-y-3">
            <div className="h-7 w-3/4 rounded-lg bg-[#E8E0D5]" />
            {/* Prix */}
            <div className="h-8 w-48 rounded-lg bg-[#E8E0D5]" />
            {/* Localisation */}
            <div className="h-4 w-40 rounded bg-[#F0EBE3]" />
          </div>

          {/* Description */}
          <div className="space-y-2 rounded-xl border border-[#E8E0D5] bg-white p-5">
            <div className="h-5 w-28 rounded bg-[#E8E0D5]" />
            <div className="h-3 w-full rounded bg-[#F0EBE3]" />
            <div className="h-3 w-5/6 rounded bg-[#F0EBE3]" />
            <div className="h-3 w-4/6 rounded bg-[#F0EBE3]" />
          </div>

          {/* Spécifications */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-[#E8E0D5] bg-white p-4">
                <div className="h-3 w-16 rounded bg-[#F0EBE3]" />
                <div className="mt-2 h-5 w-20 rounded bg-[#E8E0D5]" />
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar vendeur (1/3) */}
        <div className="space-y-4">
          <div className="rounded-xl border border-[#E8E0D5] bg-white p-5">
            {/* Avatar + nom */}
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-[#F0EBE3]" />
              <div className="space-y-2">
                <div className="h-4 w-28 rounded bg-[#E8E0D5]" />
                <div className="h-3 w-20 rounded bg-[#F0EBE3]" />
              </div>
            </div>
            {/* Bouton WhatsApp */}
            <div className="mt-4 h-11 w-full rounded-lg bg-[#E8E0D5]" />
            {/* Bouton Signaler */}
            <div className="mt-2 h-9 w-full rounded-lg bg-[#F0EBE3]" />
          </div>
        </div>
      </div>
    </div>
  )
}
