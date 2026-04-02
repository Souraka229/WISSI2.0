'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { ScitiQuizAuthShell } from '@/components/auth/sciti-quiz-auth-shell'

const BENEFITS = [
  {
    title: 'Génération IA (SuperPrompt)',
    text: 'Créez des QCM complets en quelques secondes.',
  },
  {
    title: 'Sessions en temps réel',
    text: 'Lancez une partie avec un code PIN et un QR code.',
  },
  {
    title: 'Classement live',
    text: 'Podium et scores synchronisés pour toute la classe.',
  },
  {
    title: 'Gratuit pour commencer',
    text: 'Créez un compte et lancez votre première session sans carte bancaire.',
  },
]

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    if (password !== repeatPassword) {
      setError('Les mots de passe ne correspondent pas')
      setIsLoading(false)
      return
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères')
      setIsLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
            `${window.location.origin}/dashboard`,
        },
      })
      if (error) throw error
      router.push('/auth/sign-up-success')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Une erreur est survenue')
    } finally {
      setIsLoading(false)
    }
  }

  const sideExtra = (
    <div>
      <p className="mb-4 text-xs font-bold uppercase tracking-widest text-white/70">
        Ce que vous obtenez
      </p>
      <ul className="space-y-4">
        {BENEFITS.map((b) => (
          <li key={b.title} className="flex gap-3 text-sm">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/25">
              <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
            </span>
            <span>
              <span className="font-bold text-white">{b.title}</span>
              <span className="mt-0.5 block font-normal text-white/85">{b.text}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )

  return (
    <ScitiQuizAuthShell sideExtra={sideExtra}>
      <div className="rounded-2xl border border-border bg-card/80 p-8 shadow-xl shadow-violet-500/5 backdrop-blur-sm dark:bg-card/50">
        <p className="text-xs font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400">
          Rejoindre SCITI-Quiz
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">Créer un compte</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Quiz multijoueur en temps réel : sessions par PIN, classement live, idéal pour la classe et le
          team building.
        </p>

        <form onSubmit={handleSignUp} className="mt-8 space-y-5">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-semibold text-foreground">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="vous@exemple.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="h-12 rounded-xl border-border bg-background text-base"
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-semibold text-foreground">
              Mot de passe
            </label>
            <Input
              id="password"
              type="password"
              placeholder="Minimum 8 caractères"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="h-12 rounded-xl border-border bg-background text-base"
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="repeat-password" className="text-sm font-semibold text-foreground">
              Confirmer le mot de passe
            </label>
            <Input
              id="repeat-password"
              type="password"
              placeholder="Confirmez votre mot de passe"
              required
              value={repeatPassword}
              onChange={(e) => setRepeatPassword(e.target.value)}
              disabled={isLoading}
              className="h-12 rounded-xl border-border bg-background text-base"
              autoComplete="new-password"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading || !email || !password}
            className="h-12 w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-base font-bold text-white shadow-lg shadow-violet-500/25 transition hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50"
          >
            {isLoading ? 'Création…' : 'Créer mon compte'}
            {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </form>

        <div className="mt-8 border-t border-border pt-8">
          <p className="text-center text-sm text-muted-foreground">
            Déjà inscrit ?{' '}
            <Link
              href="/auth/login"
              className="font-bold text-violet-600 underline-offset-4 hover:underline dark:text-violet-400"
            >
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </ScitiQuizAuthShell>
  )
}
