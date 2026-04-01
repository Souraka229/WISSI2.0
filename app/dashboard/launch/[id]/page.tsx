'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getQuiz, startSession } from '@/app/actions/quiz'
import { Button } from '@/components/ui/button'
import { Copy, Play, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function LaunchPage() {
  const params = useParams()
  const quizId = params.id as string
  const [quiz, setQuiz] = useState<any>(null)
  const [session, setSession] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLaunching, setIsLaunching] = useState(false)
  const [copied, setCopied] = useState(false)
  const [launchError, setLaunchError] = useState<string | null>(null)

  useEffect(() => {
    const loadQuiz = async () => {
      try {
        const data = await getQuiz(quizId)
        setQuiz(data)
      } catch (error) {
        console.error('Error loading quiz:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadQuiz()
  }, [quizId])

  const handleLaunchSession = async () => {
    if (!quiz) return

    setIsLaunching(true)
    setLaunchError(null)
    try {
      const newSession = await startSession(quizId)
      if (!newSession?.id) {
        throw new Error('Réponse serveur invalide')
      }
      setSession(newSession)
    } catch (error) {
      console.error('Error starting session:', error)
      const message =
        error instanceof Error ? error.message : 'Impossible de démarrer la session'
      setLaunchError(message)
    } finally {
      setIsLaunching(false)
    }
  }

  const copyToClipboard = () => {
    if (session?.pin_code) {
      navigator.clipboard.writeText(session.pin_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Quiz introuvable</h2>
          <Link href="/dashboard">
            <Button>Retour au tableau de bord</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Lancer une session</h1>
          </div>
        </div>
      </div>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          {!session ? (
            <div className="bg-card border border-border rounded-2xl p-12 text-center">
              <div className="w-20 h-20 bg-primary/15 rounded-full flex items-center justify-center mx-auto mb-8">
                <Play className="w-10 h-10 text-primary" />
              </div>

              <h2 className="text-3xl font-bold text-foreground mb-4">Prêt à lancer ?</h2>

              <div className="bg-muted/50 rounded-lg p-8 mb-8 text-left">
                <h3 className="font-semibold text-foreground mb-4">Détails du quiz</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Titre</span>
                    <span className="font-medium text-foreground">{quiz.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Questions</span>
                    <span className="font-medium text-foreground">
                      {quiz.questions?.length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Niveau</span>
                    <span className="font-medium text-foreground capitalize">{quiz.level}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Thème</span>
                    <span className="font-medium text-foreground capitalize">{quiz.theme}</span>
                  </div>
                </div>
              </div>

              <p className="text-muted-foreground mb-8">
                Les étudiants rejoignent avec le code PIN. Partagez-le après le lancement.
              </p>

              {launchError && (
                <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive text-left">
                  {launchError}
                </div>
              )}

              <Button
                onClick={handleLaunchSession}
                disabled={isLaunching || !quiz.questions?.length}
                size="lg"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
              >
                {isLaunching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Démarrage…
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" /> Lancer la session
                  </>
                )}
              </Button>

              {!quiz.questions?.length && (
                <p className="text-sm text-destructive mt-4">
                  Ajoutez au moins une question avant de lancer la session.
                </p>
              )}
            </div>
          ) : (
            <div className="bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/40 rounded-2xl p-12 text-center">
              <div className="w-20 h-20 bg-primary/30 rounded-full flex items-center justify-center mx-auto mb-8">
                <span className="text-4xl">✨</span>
              </div>

              <h2 className="text-3xl font-bold text-foreground mb-2">Session en direct</h2>
              <p className="text-muted-foreground mb-12">
                Partagez ce code PIN avec les participants
              </p>

              <div className="bg-card border-2 border-primary/40 rounded-xl p-8 mb-8">
                <p className="text-sm text-muted-foreground mb-3 font-semibold uppercase tracking-wider">
                  Code PIN
                </p>
                <p className="text-6xl font-black text-primary tracking-wider mb-4">
                  {session.pin_code}
                </p>
                <button
                  onClick={copyToClipboard}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary/15 hover:bg-primary/25 text-primary rounded-lg transition-colors font-semibold text-sm"
                >
                  <Copy className="w-4 h-4" />
                  {copied ? 'Copié !' : 'Copier le PIN'}
                </button>
              </div>

              <div className="space-y-3 text-sm mb-8">
                <div className="flex flex-wrap items-center justify-center gap-2 text-muted-foreground">
                  <span>Les étudiants ouvrent</span>
                  <Link
                    href="/join"
                    className="font-mono bg-muted px-2 py-1 rounded text-foreground underline-offset-4 hover:underline"
                  >
                    /join
                  </Link>
                  <span>et entrent le PIN.</span>
                </div>
              </div>

              <div className="space-y-3">
                <Button asChild size="lg" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                  <Link href="/dashboard">
                    Retour au tableau de bord
                  </Link>
                </Button>
              </div>

              <p className="text-xs text-muted-foreground mt-8">
                En attente des participants…
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
