'use client'

import { createClient } from '@/lib/supabase/client'
import { safeAuthRedirectPath } from '@/lib/auth-redirect'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { ScitiQuizAuthShell } from '@/components/auth/sciti-quiz-auth-shell'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      await new Promise((resolve) => setTimeout(resolve, 100))
      const redirectTo = safeAuthRedirectPath(
        searchParams.get('redirect'),
        '/dashboard',
      )
      router.push(redirectTo)
      router.refresh()
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Une erreur est survenue')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ScitiQuizAuthShell>
      <div className="rounded-2xl border border-border bg-card/80 p-8 shadow-xl shadow-violet-500/5 backdrop-blur-sm dark:bg-card/50">
        <p className="text-xs font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400">
          Espace animateur
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">Connexion</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Accédez à votre tableau de bord pour créer des quiz et lancer des sessions en direct.
        </p>

        <form onSubmit={handleLogin} className="mt-8 space-y-5">
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
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="password" className="text-sm font-semibold text-foreground">
                Mot de passe
              </label>
              <Link
                href="/auth/reset-password"
                className="text-xs text-muted-foreground underline-offset-4 hover:text-violet-600 hover:underline dark:hover:text-violet-400"
              >
                Mot de passe oublié ?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="h-12 rounded-xl border-border bg-background text-base"
              autoComplete="current-password"
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
            {isLoading ? 'Connexion…' : 'Se connecter'}
            {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </form>

        <div className="mt-8 border-t border-border pt-8">
          <p className="text-center text-sm text-muted-foreground">
            Pas encore de compte ?{' '}
            <Link
              href="/auth/sign-up"
              className="font-bold text-violet-600 underline-offset-4 hover:underline dark:text-violet-400"
            >
              Créer un compte
            </Link>
          </p>
        </div>
      </div>
    </ScitiQuizAuthShell>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground text-sm">
          Chargement…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
