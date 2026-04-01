'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowRight, ArrowLeft, Check } from 'lucide-react'

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

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex flex-col p-6 lg:p-12">
        {/* Back Link */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Retour à l&apos;accueil
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-sm">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-12">
              <div className="w-8 h-8 bg-foreground rounded-md flex items-center justify-center">
                <span className="text-background font-bold text-sm">Q</span>
              </div>
              <span className="text-lg font-semibold">QuizLive</span>
            </div>

            {/* Form */}
            <div>
              <h1 className="text-3xl font-bold mb-2">Créer un compte</h1>
              <p className="text-muted-foreground mb-8">Commencez à créer des quiz engageants</p>

              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="vous@exemple.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="bg-input border-border"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Mot de passe</label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Minimum 8 caractères"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="bg-input border-border"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Confirmer le mot de passe</label>
                  <Input
                    id="repeat-password"
                    type="password"
                    placeholder="Confirmez votre mot de passe"
                    required
                    value={repeatPassword}
                    onChange={(e) => setRepeatPassword(e.target.value)}
                    disabled={isLoading}
                    className="bg-input border-border"
                  />
                </div>

                {error && (
                  <div className="bg-destructive/15 border border-destructive/40 text-destructive text-sm p-3 rounded-lg">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isLoading || !email || !password}
                  className="w-full bg-foreground text-background hover:bg-foreground/90 gap-2 h-11 mt-2"
                >
                  {isLoading ? 'Création en cours...' : 'Créer mon compte'} 
                  {!isLoading && <ArrowRight className="w-4 h-4" />}
                </Button>
              </form>

              <div className="mt-8 pt-8 border-t border-border">
                <p className="text-center text-sm text-muted-foreground">
                  Vous avez déjà un compte ?{' '}
                  <Link href="/auth/login" className="text-secondary hover:text-secondary/80 font-medium">
                    Se connecter
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Benefits */}
      <div className="hidden lg:flex flex-1 bg-card border-l border-border p-12 items-center justify-center">
        <div className="max-w-md">
          <h2 className="text-2xl font-bold mb-8">Tout ce dont vous avez besoin pour engager vos étudiants</h2>
          
          <ul className="space-y-6">
            <li className="flex items-start gap-4">
              <div className="w-6 h-6 bg-secondary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-3.5 h-3.5 text-secondary" />
              </div>
              <div>
                <p className="font-medium mb-1">Génération IA illimitée</p>
                <p className="text-sm text-muted-foreground">Créez des quiz complets en quelques secondes grâce à SuperPrompt</p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <div className="w-6 h-6 bg-secondary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-3.5 h-3.5 text-secondary" />
              </div>
              <div>
                <p className="font-medium mb-1">Sessions en temps réel</p>
                <p className="text-sm text-muted-foreground">Lancez des sessions interactives avec un simple code PIN</p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <div className="w-6 h-6 bg-secondary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-3.5 h-3.5 text-secondary" />
              </div>
              <div>
                <p className="font-medium mb-1">Analyses détaillées</p>
                <p className="text-sm text-muted-foreground">Suivez les performances et exportez vos rapports en PDF</p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <div className="w-6 h-6 bg-secondary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-3.5 h-3.5 text-secondary" />
              </div>
              <div>
                <p className="font-medium mb-1">Gratuit pour commencer</p>
                <p className="text-sm text-muted-foreground">Aucune carte de crédit requise. Passez à Pro quand vous êtes prêt.</p>
              </div>
            </li>
          </ul>

          <div className="mt-12 pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground mb-4">Ils nous font confiance</p>
            <div className="flex items-center gap-6 text-muted-foreground">
              <span className="text-sm font-medium">Sorbonne Université</span>
              <span className="text-sm font-medium">Sciences Po</span>
              <span className="text-sm font-medium">HEC Paris</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
