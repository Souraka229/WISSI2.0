'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScitiQuizAuthShell } from '@/components/auth/sciti-quiz-auth-shell'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setReady(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <ScitiQuizAuthShell>
      <div className="rounded-2xl border border-border bg-card/80 p-8 shadow-xl shadow-violet-500/5 backdrop-blur-sm dark:bg-card/50">
        <h1 className="text-3xl font-black tracking-tight text-foreground">Nouveau mot de passe</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Choisissez un nouveau mot de passe pour votre compte SCITI-Quiz.
        </p>

        {!ready ? (
          <p className="mt-6 text-sm text-muted-foreground">
            Ouverture du lien de réinitialisation… Si rien ne se passe, demandez un nouveau lien depuis{' '}
            <Link href="/auth/reset-password" className="text-violet-600 underline-offset-4 hover:underline">
              mot de passe oublié
            </Link>
            .
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <label htmlFor="new-password" className="text-sm font-semibold text-foreground">
                Nouveau mot de passe
              </label>
              <Input
                id="new-password"
                type="password"
                placeholder="••••••••"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="h-12 rounded-xl border-border bg-background"
                autoComplete="new-password"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="submit"
              disabled={loading || !password}
              className="h-12 w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 font-bold text-white"
            >
              {loading ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
            </Button>
          </form>
        )}
      </div>
    </ScitiQuizAuthShell>
  )
}
