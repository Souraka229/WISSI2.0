'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  getQuiz,
  getQuizzes,
  startSession,
  type GameMode,
} from '@/app/actions/quiz'
import { Button } from '@/components/ui/button'
import { JoinQrCode } from '@/components/join-qr-code'
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
  const [gameMode, setGameMode] = useState<GameMode>('challenge_free')
  const [secondaryQuizId, setSecondaryQuizId] = useState<string>('')
  const [otherQuizzes, setOtherQuizzes] = useState<{ id: string; title: string }[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const [data, list] = await Promise.all([getQuiz(quizId), getQuizzes()])
        setQuiz(data)
        setOtherQuizzes(
          (list ?? [])
            .filter((q: { id: string }) => q.id !== quizId)
            .map((q: { id: string; title: string }) => ({ id: q.id, title: q.title })),
        )
      } catch (error) {
        console.error('Error loading quiz:', error)
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [quizId])

  const handleLaunchSession = async () => {
    if (!quiz) return

    if (gameMode === 'prof_dual' && !secondaryQuizId) {
      setLaunchError('Choisissez le deuxième quiz pour le mode Défis du prof.')
      return
    }

    setIsLaunching(true)
    setLaunchError(null)
    try {
      const newSession = await startSession(quizId, {
        gameMode,
        secondaryQuizId:
          gameMode === 'prof_dual' ? secondaryQuizId : null,
      })
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
            <div className="rounded-2xl border border-border bg-card p-12 text-center">
              {!(quiz.questions?.length ?? 0) && (
                <div className="mb-8 rounded-xl border-2 border-amber-500/50 bg-amber-500/10 p-5 text-left">
                  <p className="font-bold text-amber-900 dark:text-amber-100">
                    Ce quiz n’a encore aucune question
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Ajoutez des questions depuis l’éditeur (SuperPrompt, import JSON ou saisie manuelle),
                    puis revenez ici.
                  </p>
                  <Button className="mt-4" variant="secondary" asChild>
                    <Link href={`/dashboard/quiz/${quizId}`}>Ouvrir l’éditeur du quiz</Link>
                  </Button>
                </div>
              )}
              <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-primary/15">
                <Play className="h-10 w-10 text-primary" />
              </div>

              <h2 className="mb-4 text-3xl font-bold text-foreground">Prêt à lancer ?</h2>

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

              <div className="mb-8 space-y-4 rounded-xl border border-border bg-muted/30 p-6 text-left">
                <p className="text-sm font-semibold text-foreground">Type de partie</p>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-transparent p-2 hover:bg-background/80">
                  <input
                    type="radio"
                    name="gameMode"
                    checked={gameMode === 'challenge_free'}
                    onChange={() => setGameMode('challenge_free')}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-medium">Challenge libre</span>
                    <span className="block text-xs text-muted-foreground">
                      Un quiz, session ouverte : les joueurs rejoignent en ligne avec le PIN.
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-transparent p-2 hover:bg-background/80">
                  <input
                    type="radio"
                    name="gameMode"
                    checked={gameMode === 'prof_dual'}
                    onChange={() => setGameMode('prof_dual')}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-medium">Défis du prof</span>
                    <span className="block text-xs text-muted-foreground">
                      Enchaîne deux quiz à la suite pour un double défi.
                    </span>
                  </span>
                </label>
                {gameMode === 'prof_dual' && (
                  <div>
                    <label className="mb-2 block text-xs font-medium text-muted-foreground">
                      Deuxième quiz
                    </label>
                    <select
                      value={secondaryQuizId}
                      onChange={(e) => setSecondaryQuizId(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                    >
                      <option value="">— Choisir —</option>
                      {otherQuizzes.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.title}
                        </option>
                      ))}
                    </select>
                    {otherQuizzes.length === 0 && (
                      <p className="mt-2 text-xs text-destructive">
                        Créez un autre quiz pour utiliser ce mode.
                      </p>
                    )}
                  </div>
                )}
              </div>

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
              <p className="text-muted-foreground mb-10">
                Code PIN ou QR : les élèves n’ont plus qu’à entrer leur pseudo.
              </p>

              <div className="mb-8 flex flex-col items-stretch gap-8 md:flex-row md:items-center md:justify-center">
                <JoinQrCode
                  pin={String(session.pin_code)}
                  size={200}
                  className="md:shrink-0"
                />
                <div className="bg-card border-2 border-primary/40 rounded-xl p-8 text-center md:min-w-[280px]">
                  <p className="text-sm text-muted-foreground mb-3 font-semibold uppercase tracking-wider">
                    Code PIN
                  </p>
                  <p className="text-5xl font-black text-primary tracking-wider mb-4 md:text-6xl">
                    {session.pin_code}
                  </p>
                  <button
                    type="button"
                    onClick={copyToClipboard}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary/15 hover:bg-primary/25 text-primary rounded-lg transition-colors font-semibold text-sm"
                  >
                    <Copy className="w-4 h-4" />
                    {copied ? 'Copié !' : 'Copier le PIN'}
                  </button>
                </div>
              </div>

              <div className="space-y-3 text-sm mb-8 text-center text-muted-foreground">
                <p>
                  Lien direct :{' '}
                  <Link
                    href={`/join?pin=${encodeURIComponent(String(session.pin_code))}`}
                    className="font-mono text-foreground underline-offset-4 hover:underline"
                  >
                    /join?pin={session.pin_code}
                  </Link>
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  asChild
                  size="lg"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                >
                  <Link href={`/dashboard/session/${session.id}/host`}>
                    Ouvrir le pupitre animateur
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="w-full">
                  <Link href="/dashboard">Retour au tableau de bord</Link>
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
