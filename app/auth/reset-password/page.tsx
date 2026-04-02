'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScitiQuizAuthShell } from '@/components/auth/sciti-quiz-auth-shell'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    })
    if (resetError) setError(resetError.message)
    else setSent(true)
    setLoading(false)
  }

  return (
    <ScitiQuizAuthShell>
      <div className="rounded-2xl border border-border bg-card/80 p-8 shadow-xl shadow-violet-500/5 backdrop-blur-sm dark:bg-card/50">
        <h1 className="text-3xl font-black tracking-tight text-foreground">Mot de passe oublié</h1>
        {sent ? (
          <div className="mt-6">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Un e-mail de réinitialisation a été envoyé à <strong className="text-foreground">{email}</strong>.
              Vérifiez votre boîte de réception (et le dossier indésirables).
            </p>
            <Button className="mt-6 w-full rounded-xl" variant="outline" asChild>
              <Link href="/auth/login">Retour à la connexion</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleReset} className="mt-8 space-y-5">
            <Input
              type="email"
              placeholder="votre@email.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="h-12 rounded-xl border-border bg-background"
              autoComplete="email"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="submit"
              disabled={loading || !email}
              className="h-12 w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 font-bold text-white shadow-lg shadow-violet-500/25"
            >
              {loading ? 'Envoi…' : 'Envoyer le lien de réinitialisation'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <Link
                href="/auth/login"
                className="font-semibold text-violet-600 underline-offset-4 hover:underline dark:text-violet-400"
              >
                Retour à la connexion
              </Link>
            </p>
          </form>
        )}
      </div>
    </ScitiQuizAuthShell>
  )
}
