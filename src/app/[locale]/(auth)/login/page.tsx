/**
 * Page de connexion — formulaire email + mot de passe.
 *
 * Role :
 *   - Permet a un utilisateur existant de se connecter a son espace ImmoV2.
 *   - Valide les champs avec Zod v4 via react-hook-form avant soumission.
 *   - Appelle authClient.signIn.email() de Better Auth pour authentifier.
 *   - Redirige vers /dashboard apres une connexion reussie.
 *
 * Interactions :
 *   - Lien vers /register pour les utilisateurs sans compte.
 *   - Lien "Mot de passe oublie ?" (placeholder, a implementer plus tard).
 *   - Affiche les erreurs de validation inline sous chaque champ.
 *   - Affiche une erreur generale si l'authentification echoue (ex: identifiants incorrects).
 *
 * Dependances :
 *   - react-hook-form + @hookform/resolvers/zod pour la gestion du formulaire
 *   - loginSchema de @/lib/validations/auth pour la validation Zod
 *   - authClient de @/lib/auth-client pour l'appel a Better Auth
 *   - useTranslations de next-intl pour l'internationalisation
 *   - Link et useRouter de @/i18n/navigation pour la navigation i18n
 *
 * Exemple d'utilisation :
 *   Accessible via /fr/login ou /en/login selon la locale.
 *   L'utilisateur saisit email + mot de passe, clique "Connexion",
 *   et est redirige vers /dashboard en cas de succes.
 */
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/navigation'
import { authClient } from '@/lib/auth-client'
import { loginSchema, type LoginInput } from '@/lib/validations/auth'

export default function LoginPage() {
  // Hook de traduction — namespace "auth" pour les labels du formulaire
  const t = useTranslations('auth')
  // Hook de traduction — namespace "common" pour les textes generiques (boutons, etc.)
  const tCommon = useTranslations('common')

  // Router i18n pour la redirection apres connexion reussie
  const router = useRouter()

  // Etat local pour l'erreur generale renvoyee par le serveur (ex: "Identifiants incorrects")
  const [serverError, setServerError] = useState<string | null>(null)

  // Configuration de react-hook-form avec le schema Zod de validation
  const {
    register,       // Enregistre un champ dans le formulaire
    handleSubmit,   // Wrapper de soumission qui valide avant d'appeler onSubmit
    formState: {
      errors,       // Erreurs de validation par champ (ex: errors.email.message)
      isSubmitting,  // true pendant la soumission asynchrone
    },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  /**
   * Gestionnaire de soumission du formulaire.
   * Appele uniquement si la validation Zod passe.
   *
   * Flux :
   *   1. Reset l'erreur serveur precedente
   *   2. Appelle authClient.signIn.email() avec email + password
   *   3. Si erreur -> affiche le message d'erreur en haut du formulaire
   *   4. Si succes -> redirige vers /dashboard
   *
   * @param data - Les donnees validees du formulaire (email, password)
   */
  async function onSubmit(data: LoginInput) {
    setServerError(null)

    try {
      const result = await authClient.signIn.email({
        email: data.email,
        password: data.password,
      })

      // Better Auth retourne un objet avec error en cas d'echec
      if (result.error) {
        setServerError(result.error.message || tCommon('error'))
        return
      }

      // Connexion reussie — redirection vers le tableau de bord
      router.push('/dashboard')
    } catch {
      // Erreur reseau ou inattendue
      setServerError(tCommon('error'))
    }
  }

  return (
    <>
      {/* En-tete du formulaire — titre et sous-titre */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold font-display text-foreground">
          {t('loginTitle')}
        </h1>
        <p className="mt-1 text-sm text-foreground-secondary">
          {t('loginSubtitle')}
        </p>
      </div>

      {/* Message d'erreur generale (authentification echouee) */}
      {serverError && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error"
        >
          {serverError}
        </div>
      )}

      {/* Formulaire de connexion */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {/* Champ email */}
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            {t('email')}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="exemple@email.com"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
            className={`
              w-full rounded-lg border bg-background-elevated px-3.5 py-2.5 text-sm
              text-foreground placeholder:text-foreground-muted
              outline-none transition-colors
              focus:border-primary focus:ring-2 focus:ring-primary/20
              ${errors.email ? 'border-error' : 'border-border'}
            `}
            {...register('email')}
          />
          {/* Erreur inline sous le champ email */}
          {errors.email && (
            <p id="email-error" className="mt-1 text-xs text-error">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Champ mot de passe */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label
              htmlFor="password"
              className="text-sm font-medium text-foreground"
            >
              {t('password')}
            </label>
            {/* Lien "Mot de passe oublie" — a implementer ulterieurement */}
            <Link
              href="/forgot-password"
              className="text-xs text-primary hover:text-primary-light transition-colors"
            >
              {t('forgotPassword')}
            </Link>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'password-error' : undefined}
            className={`
              w-full rounded-lg border bg-background-elevated px-3.5 py-2.5 text-sm
              text-foreground placeholder:text-foreground-muted
              outline-none transition-colors
              focus:border-primary focus:ring-2 focus:ring-primary/20
              ${errors.password ? 'border-error' : 'border-border'}
            `}
            {...register('password')}
          />
          {/* Erreur inline sous le champ mot de passe */}
          {errors.password && (
            <p id="password-error" className="mt-1 text-xs text-error">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Bouton de soumission — desactive pendant le chargement */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="
            w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white
            transition-colors hover:bg-primary-dark
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary
            disabled:cursor-not-allowed disabled:opacity-60
          "
        >
          {isSubmitting ? tCommon('loading') : tCommon('login')}
        </button>
      </form>

      {/* Lien vers la page d'inscription */}
      <p className="mt-6 text-center text-sm text-foreground-secondary">
        {t('noAccount')}{' '}
        <Link
          href="/register"
          className="font-semibold text-primary hover:text-primary-light transition-colors"
        >
          {tCommon('register')}
        </Link>
      </p>
    </>
  )
}
