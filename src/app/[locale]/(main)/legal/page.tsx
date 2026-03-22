/**
 * Page Mentions légales — contenu statique traduit via next-intl.
 *
 * Rôle :
 *   Affiche les informations légales obligatoires : éditeur, hébergement,
 *   propriété intellectuelle, responsabilité, règlement des litiges.
 *
 * Exemple d'URL :
 *   /fr/legal — mentions légales en français
 *   /en/legal — legal notice in English
 */
import { useTranslations } from 'next-intl'

export default function LegalPage() {
  const t = useTranslations('legal')

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-[var(--font-display)] text-2xl font-bold text-[#2D6A4F] sm:text-3xl">
        {t('title')}
      </h1>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground-secondary">
        {/* Éditeur du site */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">{t('editor')}</h2>
          <p className="mt-2">{t('editorText')}</p>
          <p className="mt-1 font-medium text-foreground">{t('companyName')}</p>
          <p className="mt-1">{t('email')}</p>
        </section>

        {/* Hébergement */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">{t('hosting')}</h2>
          <p className="mt-2">{t('hostingText')}</p>
        </section>

        {/* Propriété intellectuelle */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">{t('intellectualProperty')}</h2>
          <p className="mt-2">{t('intellectualPropertyText')}</p>
        </section>

        {/* Responsabilité */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">{t('responsibility')}</h2>
          <p className="mt-2">{t('responsibilityText')}</p>
        </section>

        {/* Règlement des litiges */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">{t('disputeResolution')}</h2>
          <p className="mt-2">{t('disputeResolutionText')}</p>
        </section>
      </div>
    </div>
  )
}
