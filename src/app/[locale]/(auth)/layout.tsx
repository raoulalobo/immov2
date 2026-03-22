/**
 * Layout d'authentification — conteneur minimal centre sans navbar ni footer.
 *
 * Role :
 *   - Affiche un fond neutre (bg-background) avec le logo ImmoV2 centre en haut.
 *   - Centre verticalement et horizontalement le contenu (formulaire login/register).
 *   - Ne charge aucune barre de navigation pour garder l'interface epuree.
 *
 * Interactions :
 *   - Le logo est un lien cliquable qui ramene a la page d'accueil ("/").
 *   - Le slot {children} recoit la page login ou register.
 *
 * Exemple de rendu :
 *   /fr/login  -> layout centre + formulaire de connexion
 *   /en/register -> layout centre + formulaire d'inscription
 */
import { Link } from '@/i18n/navigation'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8">
      {/* Logo ImmoV2 — lien vers l'accueil */}
      <Link
        href="/"
        className="mb-8 flex items-center gap-1 text-3xl font-bold font-display tracking-tight"
        aria-label="Retour à l'accueil ImmoV2"
      >
        {/* "Immo" en couleur primaire (vert foret) */}
        <span className="text-primary">Immo</span>
        {/* "V2" en couleur secondaire (ocre/terre de sienne) */}
        <span className="text-secondary">V2</span>
      </Link>

      {/* Conteneur principal du formulaire — carte elevee avec ombre douce */}
      <main className="w-full max-w-md rounded-2xl bg-background-elevated border border-border p-6 sm:p-8 shadow-sm">
        {children}
      </main>
    </div>
  )
}
