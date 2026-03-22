/**
 * Composant client de la sidebar admin — gère la navigation et le lien actif.
 *
 * Rôle :
 *   Afficher la barre de navigation latérale du panneau d'administration.
 *   Sur mobile (< md), la sidebar se transforme en barre de navigation
 *   horizontale scrollable en haut de la page.
 *
 * Interactions :
 *   - @/i18n/navigation (Link, usePathname) : navigation i18n-aware + détection du lien actif
 *   - Reçoit les labels traduits en props depuis le layout serveur
 *
 * Exemple d'usage :
 *   <AdminSidebar labels={{ title: "Admin", reports: "Signalements", ... }} />
 */
'use client'

import { Link, usePathname } from '@/i18n/navigation'

/**
 * Props de la sidebar admin.
 * Les labels sont passés depuis le layout serveur pour éviter d'utiliser
 * useTranslations dans un composant qui reçoit déjà les traductions.
 */
interface AdminSidebarProps {
  labels: {
    title: string
    reports: string
    verification: string
    listings: string
    users: string
  }
}

/**
 * Liens de navigation de la sidebar.
 * Chaque lien correspond à une section du panneau d'administration.
 * L'icône SVG est inline pour éviter une dépendance à une bibliothèque d'icônes.
 */
const navItems = [
  {
    // Signalements — file de modération des annonces signalées
    href: '/admin/reports',
    key: 'reports' as const,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <line x1="4" x2="4" y1="22" y2="15" />
      </svg>
    ),
  },
  {
    // Vérification — file de revue des documents vendeur
    href: '/admin/verification',
    key: 'verification' as const,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  {
    // Annonces — gestion de toutes les annonces de la plateforme
    href: '/admin/listings',
    key: 'listings' as const,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        <line x1="3" x2="21" y1="9" y2="9" />
        <line x1="9" x2="9" y1="21" y2="9" />
      </svg>
    ),
  },
  {
    // Utilisateurs — gestion des comptes utilisateurs
    href: '/admin/users',
    key: 'users' as const,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
]

/**
 * AdminSidebar — Composant de navigation latérale du panneau admin.
 *
 * Comportement responsive :
 *   - Desktop (>= md) : sidebar verticale fixe à gauche, largeur 240px
 *   - Mobile (< md) : barre horizontale scrollable en haut du contenu
 *
 * Le lien actif est déterminé en comparant le pathname courant avec le href
 * du lien (en vérifiant si le pathname contient le href).
 */
export function AdminSidebar({ labels }: AdminSidebarProps) {
  // Récupérer le pathname courant pour highlight le lien actif
  const pathname = usePathname()

  return (
    <>
      {/* --- Navigation mobile : barre horizontale scrollable --- */}
      <nav className="flex overflow-x-auto border-b border-[#E5E0D8] bg-white px-4 py-2 md:hidden">
        {navItems.map((item) => {
          // Un lien est actif si le pathname contient son href
          const isActive = pathname.includes(item.href)

          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? // Style actif : fond vert avec texte blanc
                    'bg-[#2D6A4F] text-white'
                  : // Style inactif : texte gris, hover vert léger
                    'text-[#6B7280] hover:bg-[#2D6A4F]/10 hover:text-[#2D6A4F]'
              }`}
            >
              {item.icon}
              <span>{labels[item.key]}</span>
            </Link>
          )
        })}
      </nav>

      {/* --- Sidebar desktop : colonne verticale à gauche --- */}
      <aside className="hidden w-60 shrink-0 border-r border-[#E5E0D8] bg-white md:block">
        {/* Titre du panneau admin */}
        <div className="border-b border-[#E5E0D8] px-6 py-5">
          <h2 className="text-lg font-bold text-[#2D6A4F]">{labels.title}</h2>
        </div>

        {/* Liste des liens de navigation */}
        <nav className="flex flex-col gap-1 p-3">
          {navItems.map((item) => {
            const isActive = pathname.includes(item.href)

            return (
              <Link
                key={item.key}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#2D6A4F] text-white'
                    : 'text-[#6B7280] hover:bg-[#2D6A4F]/10 hover:text-[#2D6A4F]'
                }`}
              >
                {item.icon}
                <span>{labels[item.key]}</span>
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
