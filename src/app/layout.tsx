/**
 * Layout racine — enveloppe TOUTES les pages.
 * Ce layout ne contient que le strict minimum (html, body).
 * Le contenu i18n est géré par [locale]/layout.tsx.
 */

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}
