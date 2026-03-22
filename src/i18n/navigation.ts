/**
 * Helpers de navigation i18n.
 * Wrappent les composants Next.js (Link, redirect, useRouter, usePathname)
 * pour injecter automatiquement la locale dans les URLs.
 *
 * Usage :
 *   import { Link, useRouter } from '@/i18n/navigation'
 *   <Link href="/search">Rechercher</Link>  // → /fr/search ou /en/search
 */
import { createNavigation } from 'next-intl/navigation'
import { routing } from './routing'

export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing)
