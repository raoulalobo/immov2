/**
 * Navbar principale — présente sur toutes les pages.
 * Affiche le logo ImmoV2, les liens de navigation, et le bouton connexion.
 * Responsive : liens cachés en mobile, affichés en desktop.
 *
 * Design system : logo "Immo" en primary + "V2" en secondary (DESIGN.md)
 */
'use client'

import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import { useRouter } from '@/i18n/navigation'
import { useState } from 'react'
import { authClient } from '@/lib/auth-client'

export function Navbar() {
  const t = useTranslations('common')
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // --- Session utilisateur ---
  // Si connecté : afficher avatar + menu déconnexion
  // Si non connecté : afficher bouton "Se connecter"
  const { data: session } = authClient.useSession()

  // Liens de navigation — "Publier" et "Tableau de bord" réservés aux utilisateurs connectés
  const navLinks = [
    { href: '/search', label: t('search'), auth: false },
    { href: '/listings/new', label: t('publish'), auth: true },
    { href: '/dashboard', label: t('dashboard'), auth: true },
  ].filter(link => !link.auth || session?.user)

  return (
    <header className="sticky top-0 z-50 bg-background-elevated border-b border-border">
      <nav className="mx-auto flex max-w-[1080px] items-center justify-between px-4 py-3 sm:px-6">
        {/* Logo */}
        <Link href="/" className="font-[var(--font-display)] text-xl font-bold">
          <span className="text-primary">Immo</span>
          <span className="text-secondary">V2</span>
        </Link>

        {/* Navigation desktop */}
        <ul className="hidden items-center gap-6 sm:flex">
          {navLinks.map(link => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  pathname === link.href
                    ? 'text-primary'
                    : 'text-foreground-secondary'
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Actions desktop */}
        <div className="hidden items-center gap-3 sm:flex">
          {/* Sélecteur de langue */}
          <LanguageSwitcher />

          {session?.user ? (
            /* Utilisateur connecté : lien compte + bouton déconnexion */
            <>
              <Link
                href="/dashboard"
                className="text-sm font-medium text-foreground-secondary transition-colors hover:text-primary"
              >
                {t('myAccount')}
              </Link>
              <button
                onClick={async () => {
                  await authClient.signOut()
                  router.push('/')
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground-secondary transition-colors hover:bg-background-subtle"
              >
                {t('logout')}
              </button>
            </>
          ) : (
            /* Non connecté : bouton "Se connecter" */
            <Link
              href="/login"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
            >
              {t('login')}
            </Link>
          )}
        </div>

        {/* Bouton menu mobile (hamburger) */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 sm:hidden"
          aria-label="Menu"
        >
          <svg
            className="h-6 w-6 text-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </nav>

      {/* Menu mobile */}
      {mobileMenuOpen && (
        <div className="border-t border-border px-4 pb-4 sm:hidden">
          <ul className="flex flex-col gap-2 pt-3">
            {navLinks.map(link => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground-secondary hover:bg-background-subtle'
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center gap-3 border-t border-border pt-3">
            <LanguageSwitcher />

            {session?.user ? (
              <button
                onClick={async () => {
                  setMobileMenuOpen(false)
                  await authClient.signOut()
                  router.push('/')
                }}
                className="flex-1 rounded-lg border border-border px-4 py-2 text-center text-sm font-semibold text-foreground-secondary"
              >
                {t('logout')}
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 rounded-lg bg-primary px-4 py-2 text-center text-sm font-semibold text-white"
              >
                {t('login')}
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

/**
 * Sélecteur de langue FR/EN — switch entre les deux locales.
 */
function LanguageSwitcher() {
  const pathname = usePathname()

  return (
    <div className="flex overflow-hidden rounded-full border border-border text-xs font-medium">
      <Link
        href={pathname}
        locale="fr"
        className="px-3 py-1.5 transition-colors hover:bg-background-subtle data-[active=true]:bg-primary data-[active=true]:text-white"
      >
        FR
      </Link>
      <Link
        href={pathname}
        locale="en"
        className="border-l border-border px-3 py-1.5 transition-colors hover:bg-background-subtle data-[active=true]:bg-primary data-[active=true]:text-white"
      >
        EN
      </Link>
    </div>
  )
}
