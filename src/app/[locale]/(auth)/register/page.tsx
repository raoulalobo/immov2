/**
 * Page d'inscription — formulaire complet de creation de compte.
 *
 * Role :
 *   - Permet a un nouvel utilisateur de creer un compte ImmoV2.
 *   - Collecte : nom complet, email, telephone (optionnel), mot de passe, confirmation.
 *   - Valide tous les champs avec Zod v4 via react-hook-form (schema registerSchema).
 *   - Appelle authClient.signUp.email() de Better Auth pour creer le compte.
 *   - Redirige vers /dashboard apres une inscription reussie.
 *
 * Interactions :
 *   - Lien vers /login pour les utilisateurs qui ont deja un compte.
 *   - Affiche les erreurs de validation inline sous chaque champ.
 *   - Affiche une erreur generale si l'inscription echoue (ex: email deja utilise).
 *   - Le champ telephone est optionnel (accepte une chaine vide).
 *
 * Dependances :
 *   - react-hook-form + @hookform/resolvers/zod pour la gestion du formulaire
 *   - registerSchema de @/lib/validations/auth pour la validation Zod
 *   - authClient de @/lib/auth-client pour l'appel a Better Auth
 *   - useTranslations de next-intl pour l'internationalisation
 *   - Link et useRouter de @/i18n/navigation pour la navigation i18n
 *
 * Exemple d'utilisation :
 *   Accessible via /fr/register ou /en/register selon la locale.
 *   L'utilisateur remplit le formulaire, clique "Creer un compte",
 *   et est redirige vers /dashboard en cas de succes.
 */
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/navigation'
import { authClient } from '@/lib/auth-client'
import { registerSchema, type RegisterInput } from '@/lib/validations/auth'

export default function RegisterPage() {
  // Hook de traduction — namespace "auth" pour les labels specifiques a l'authentification
  const t = useTranslations('auth')
  // Hook de traduction — namespace "common" pour les textes generiques (boutons, messages)
  const tCommon = useTranslations('common')

  // Router i18n pour la redirection apres inscription reussie
  const router = useRouter()

  // Etat local pour l'erreur generale renvoyee par le serveur (ex: "Email deja utilise")
  const [serverError, setServerError] = useState<string | null>(null)

  // Configuration de react-hook-form avec le schema Zod de validation
  // Le schema registerSchema inclut un .refine() pour verifier que password === confirmPassword
  const {
    register,       // Enregistre un champ dans le formulaire
    handleSubmit,   // Wrapper de soumission qui valide avant d'appeler onSubmit
    formState: {
      errors,       // Erreurs de validation par champ (ex: errors.name.message)
      isSubmitting,  // true pendant la soumission asynchrone
    },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  })

  /**
   * Gestionnaire de soumission du formulaire.
   * Appele uniquement si la validation Zod passe (y compris la confirmation du mot de passe).
   *
   * Flux :
   *   1. Reset l'erreur serveur precedente
   *   2. Appelle authClient.signUp.email() avec les donnees du formulaire
   *   3. Si erreur -> affiche le message d'erreur en haut du formulaire
   *   4. Si succes -> redirige vers /dashboard
   *
   * Note : le champ "phone" n'est pas envoye a Better Auth par defaut.
   *        Il faudra l'ajouter via un plugin ou un champ supplementaire
   *        dans la configuration Better Auth si necessaire.
   *
   * @param data - Les donnees validees du formulaire (name, email, phone, password, confirmPassword)
   */
  async function onSubmit(data: RegisterInput) {
    setServerError(null)

    try {
      const result = await authClient.signUp.email({
        email: data.email,
        password: data.password,
        name: data.name,
      })

      // Better Auth retourne un objet avec error en cas d'echec
      if (result.error) {
        setServerError(result.error.message || tCommon('error'))
        return
      }

      // Inscription reussie — redirection vers le tableau de bord
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
          {t('registerTitle')}
        </h1>
        <p className="mt-1 text-sm text-foreground-secondary">
          {t('registerSubtitle')}
        </p>
      </div>

      {/* Message d'erreur generale (inscription echouee) */}
      {serverError && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error"
        >
          {serverError}
        </div>
      )}

      {/* Formulaire d'inscription */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {/* Champ nom complet */}
        <div>
          <label
            htmlFor="name"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            {t('name')}
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            placeholder="Jean Dupont"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'name-error' : undefined}
            className={`
              w-full rounded-lg border bg-background-elevated px-3.5 py-2.5 text-sm
              text-foreground placeholder:text-foreground-muted
              outline-none transition-colors
              focus:border-primary focus:ring-2 focus:ring-primary/20
              ${errors.name ? 'border-error' : 'border-border'}
            `}
            {...register('name')}
          />
          {/* Erreur inline sous le champ nom */}
          {errors.name && (
            <p id="name-error" className="mt-1 text-xs text-error">
              {errors.name.message}
            </p>
          )}
        </div>

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

        {/* Champ telephone (optionnel) */}
        <div>
          <label
            htmlFor="phone"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            {t('phone')}{' '}
            {/* Indication visuelle que le champ est optionnel */}
            <span className="font-normal text-foreground-muted">(optionnel)</span>
          </label>
          <input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder={t('phonePlaceholder')}
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? 'phone-error' : undefined}
            className={`
              w-full rounded-lg border bg-background-elevated px-3.5 py-2.5 text-sm
              text-foreground placeholder:text-foreground-muted
              outline-none transition-colors
              focus:border-primary focus:ring-2 focus:ring-primary/20
              ${errors.phone ? 'border-error' : 'border-border'}
            `}
            {...register('phone')}
          />
          {/* Erreur inline sous le champ telephone */}
          {errors.phone && (
            <p id="phone-error" className="mt-1 text-xs text-error">
              {errors.phone.message}
            </p>
          )}
        </div>

        {/* Champ mot de passe */}
        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            {t('password')}
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
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

        {/* Champ confirmation du mot de passe */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            {t('confirmPassword')}
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword}
            aria-describedby={
              errors.confirmPassword ? 'confirmPassword-error' : undefined
            }
            className={`
              w-full rounded-lg border bg-background-elevated px-3.5 py-2.5 text-sm
              text-foreground placeholder:text-foreground-muted
              outline-none transition-colors
              focus:border-primary focus:ring-2 focus:ring-primary/20
              ${errors.confirmPassword ? 'border-error' : 'border-border'}
            `}
            {...register('confirmPassword')}
          />
          {/* Erreur inline sous le champ confirmation — inclut l'erreur du .refine() Zod */}
          {errors.confirmPassword && (
            <p id="confirmPassword-error" className="mt-1 text-xs text-error">
              {errors.confirmPassword.message}
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
          {isSubmitting ? tCommon('loading') : tCommon('register')}
        </button>
      </form>

      {/* Lien vers la page de connexion */}
      <p className="mt-6 text-center text-sm text-foreground-secondary">
        {t('hasAccount')}{' '}
        <Link
          href="/login"
          className="font-semibold text-primary hover:text-primary-light transition-colors"
        >
          {tCommon('login')}
        </Link>
      </p>
    </>
  )
}
