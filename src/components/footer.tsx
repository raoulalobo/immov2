/**
 * Footer — présent sur toutes les pages publiques.
 * Affiche les infos ImmoV2, liens légaux et le copyright.
 *
 * Interactions :
 *   - next-intl : traductions (namespace "footer")
 *   - Link i18n : liens vers /legal et /privacy avec locale automatique
 */
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

export function Footer() {
  const t = useTranslations('footer')

  return (
    <footer className="mt-auto border-t border-border bg-background-elevated">
      <div className="mx-auto max-w-[1080px] px-4 py-8 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2">
          {/* À propos */}
          <div>
            <h3 className="font-[var(--font-display)] text-sm font-semibold text-foreground">
              {t('about')}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-foreground-secondary">
              {t('aboutText')}
            </p>
          </div>

          {/* Liens */}
          <div className="flex gap-8">
            <div>
              <ul className="space-y-2 text-sm text-foreground-secondary">
                <li>
                  {/* Contact par email — ouvre le client mail de l'utilisateur */}
                  <a href="mailto:contact@immov2.cm" className="transition-colors hover:text-primary">
                    {t('contact')}
                  </a>
                </li>
                <li>
                  {/* Page mentions légales — route i18n /fr/legal ou /en/legal */}
                  <Link href="/legal" className="transition-colors hover:text-primary">
                    {t('legal')}
                  </Link>
                </li>
                <li>
                  {/* Page politique de confidentialité — route i18n /fr/privacy ou /en/privacy */}
                  <Link href="/privacy" className="transition-colors hover:text-primary">
                    {t('privacy')}
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-4 text-center text-xs text-foreground-muted">
          &copy; {new Date().getFullYear()} ImmoV2. Tous droits réservés.
        </div>
      </div>
    </footer>
  )
}
