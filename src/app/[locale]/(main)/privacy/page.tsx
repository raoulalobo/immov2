/**
 * Page Politique de confidentialité — contenu statique traduit via next-intl.
 *
 * Rôle :
 *   Détaille la collecte, l'utilisation et la protection des données personnelles
 *   conformément à la législation camerounaise.
 *
 * Sections :
 *   - Données collectées (identité, annonces, documents, navigation, technique)
 *   - Finalités du traitement (compte, annonces, contact, alertes, modération, stats)
 *   - Conservation des données (soft delete 30 jours)
 *   - Droits des utilisateurs (accès, rectification, suppression)
 *   - Cookies (essentiels uniquement)
 *   - Sécurité (Supabase/AWS, HTTPS, hash)
 *
 * Exemple d'URL :
 *   /fr/privacy — politique en français
 *   /en/privacy — privacy policy in English
 */
import { useTranslations } from 'next-intl'

export default function PrivacyPage() {
  const t = useTranslations('privacy')

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-[var(--font-display)] text-2xl font-bold text-[#2D6A4F] sm:text-3xl">
        {t('title')}
      </h1>

      <p className="mt-4 text-sm leading-relaxed text-foreground-secondary">
        {t('intro')}
      </p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground-secondary">
        {/* Données collectées */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">{t('dataCollected')}</h2>
          <p className="mt-2">{t('dataCollectedText')}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>{t('dataList.identity')}</li>
            <li>{t('dataList.listings')}</li>
            <li>{t('dataList.verification')}</li>
            <li>{t('dataList.usage')}</li>
            <li>{t('dataList.technical')}</li>
          </ul>
        </section>

        {/* Finalités */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">{t('purpose')}</h2>
          <p className="mt-2">{t('purposeText')}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>{t('purposeList.account')}</li>
            <li>{t('purposeList.listings')}</li>
            <li>{t('purposeList.contact')}</li>
            <li>{t('purposeList.alerts')}</li>
            <li>{t('purposeList.moderation')}</li>
            <li>{t('purposeList.stats')}</li>
          </ul>
        </section>

        {/* Conservation */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">{t('storage')}</h2>
          <p className="mt-2">{t('storageText')}</p>
        </section>

        {/* Droits */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">{t('rights')}</h2>
          <p className="mt-2">{t('rightsText')}</p>
        </section>

        {/* Cookies */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">{t('cookies')}</h2>
          <p className="mt-2">{t('cookiesText')}</p>
        </section>

        {/* Sécurité */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">{t('security')}</h2>
          <p className="mt-2">{t('securityText')}</p>
        </section>

        {/* Contact */}
        <section>
          <h2 className="text-lg font-semibold text-foreground">{t('contact')}</h2>
          <p className="mt-2">{t('contactText')}</p>
        </section>
      </div>
    </div>
  )
}
