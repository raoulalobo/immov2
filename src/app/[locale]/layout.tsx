/**
 * Layout avec locale — enveloppe toutes les pages i18n.
 * Charge les fonts Google (General Sans + DM Sans), les meta tags,
 * et fournit le contexte next-intl.
 */
import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import '../globals.css'

// DM Sans — police body (voir DESIGN.md)
// General Sans n'est pas sur Google Fonts, on l'importe via CSS @font-face
const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: {
    default: 'ImmoV2 — Terrains au Cameroun',
    template: '%s | ImmoV2',
  },
  description:
    'ImmoV2 est la première plateforme dédiée au marché foncier camerounais. Trouvez et publiez des annonces de terrains en toute confiance.',
  keywords: [
    'terrain', 'cameroun', 'immobilier', 'foncier', 'achat terrain',
    'vente terrain', 'douala', 'yaoundé', 'parcelle',
  ],
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  // Vérifie que la locale est supportée, sinon 404
  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  // Charge les messages de traduction pour cette locale
  const messages = (await import(`@/messages/${locale}.json`)).default

  return (
    <html lang={locale} className={`${dmSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground font-[var(--font-dm-sans)]">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
