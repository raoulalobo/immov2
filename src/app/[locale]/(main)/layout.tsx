/**
 * Layout principal — navbar + contenu + footer.
 * Utilisé pour toutes les pages publiques et authentifiées (hors auth).
 */
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  )
}
