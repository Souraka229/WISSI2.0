'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  getQuiz,
  getQuizzes,
  startSession,
  type GameMode,
  type SessionScoringMode,
} from '@/app/actions/quiz'
import {
  presetToDbMode,
  type LiveSessionPreset,
} from '@/lib/game-mode-live'
import { Button } from '@/components/ui/button'
import { JoinQrCode } from '@/components/join-qr-code'
import { Copy, Play, ArrowLeft, Loader2, Sparkles, Zap, Flame } from 'lucide-react'
import Link from 'next/link'

export default function LaunchPage() {
  const params = useParams()
  const quizId = params.id as string
  const [quiz, setQuiz] = useState<any>(null)
  const [session, setSession] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLaunching, setIsLaunching] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copiedJoinUrl, setCopiedJoinUrl] = useState(false)
  const [launchError, setLaunchError] = useState<string | null>(null)
  const [sessionPreset, setSessionPreset] = useState<LiveSessionPreset>('classic')
  const [secondaryQuizId, setSecondaryQuizId] = useState<string>('')
  const [otherQuizzes, setOtherQuizzes] = useState<{ id: string; title: string }[]>([])
  const [scoringMode, setScoringMode] = useState<SessionScoringMode>('classic')

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

    setIsLaunching(true)
    setLaunchError(null)
    try {
      const secondary =
        sessionPreset === 'battle_royale' || sessionPreset === 'boss_fight'
          ? secondaryQuizId.trim() || null
          : null
      const gameMode: GameMode = presetToDbMode(sessionPreset)
      const finalScoringMode: SessionScoringMode =
        sessionPreset === 'blitz' ? 'speed' : scoringMode
      const newSession = await startSession(quizId, {
        gameMode,
        secondaryQuizId: secondary,
        scoringMode: finalScoringMode,
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
      void navigator.clipboard.writeText(String(session.pin_code))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    }
  }

  const joinUrl =
    typeof window !== 'undefined' && session?.pin_code
      ? `${window.location.origin}/join?pin=${encodeURIComponent(String(session.pin_code))}`
      : ''

  const copyJoinInvitationUrl = () => {
    if (!joinUrl) return
    void navigator.clipboard.writeText(joinUrl)
    setCopiedJoinUrl(true)
    window.setTimeout(() => setCopiedJoinUrl(false), 2500)
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

              <div className="mb-6 space-y-3 rounded-xl border border-border bg-muted/30 p-6 text-left">
                <p className="text-sm font-semibold text-foreground">Mode de scoring</p>
                <p className="text-xs text-muted-foreground">
                  Le barème de chaque question (ex. 1000 pts) s’applique selon le mode choisi : en vitesse ou
                  précision, deux joueurs corrects n’auront pas forcément le même score.
                </p>
                <select
                  value={scoringMode}
                  onChange={(e) => setScoringMode(e.target.value as SessionScoringMode)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                >
                  <option value="classic">
                    Classique — bonne réponse = 100 % des points de la question (pas de bonus vitesse)
                  </option>
                  <option value="precision">
                    Précision — plein pot si bonne réponse dans la 1re moitié du chrono, sinon ~55 % du max
                  </option>
                  <option value="speed">
                    Vitesse — style Kahoot : bonne réponse = points qui décroissent avec le temps (0 → max,
                    fin du chrono → 0)
                  </option>
                </select>
              </div>

              <div className="mb-8 space-y-4 rounded-xl border border-border bg-muted/30 p-6 text-left">
                <p className="text-sm font-semibold text-foreground">Mode de jeu live</p>
                <p className="text-xs text-muted-foreground">
                  Les modes SCITI Live s’appuient sur la logique existante sans changer le design.
                </p>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-transparent p-3 transition-colors hover:bg-background/80 has-[:checked]:border-emerald-500/35 has-[:checked]:bg-emerald-500/5">
                  <input
                    type="radio"
                    name="gameMode"
                    checked={sessionPreset === 'classic'}
                    onChange={() => setSessionPreset('classic')}
                    className="mt-1"
                  />
                  <span className="flex-1">
                    <span className="flex flex-wrap items-center gap-2 font-medium">
                      Classic
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                        <Sparkles className="h-3 w-3" />
                        Live classe
                      </span>
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Questions séquentielles, timer standard et classement final.
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-transparent p-3 transition-colors hover:bg-background/80 has-[:checked]:border-amber-500/40 has-[:checked]:bg-amber-500/5">
                  <input
                    type="radio"
                    name="gameMode"
                    checked={sessionPreset === 'battle_royale'}
                    onChange={() => setSessionPreset('battle_royale')}
                    className="mt-1"
                  />
                  <span className="flex-1">
                    <span className="flex flex-wrap items-center gap-2 font-medium">
                      Battle Royale
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950 dark:text-amber-100">
                        <Zap className="h-3 w-3" />
                        Live défi
                      </span>
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Une erreur élimine le joueur : passage en spectateur avec réactions.
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-transparent p-3 transition-colors hover:bg-background/80 has-[:checked]:border-fuchsia-500/45 has-[:checked]:bg-fuchsia-500/5">
                  <input
                    type="radio"
                    name="gameMode"
                    checked={sessionPreset === 'boss_fight'}
                    onChange={() => setSessionPreset('boss_fight')}
                    className="mt-1"
                  />
                  <span className="flex-1">
                    <span className="flex flex-wrap items-center gap-2 font-medium">
                      Boss Fight
                      <span className="dashboard-live-sticker dashboard-live-sticker--hot inline-flex items-center gap-1 rounded-full border border-fuchsia-500/45 bg-gradient-to-r from-fuchsia-500/15 to-orange-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-950 dark:text-fuchsia-100">
                        <Flame className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                        Intense
                      </span>
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Le professeur a des HP, la classe inflige des dégâts collectifs à chaque question.
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-transparent p-3 transition-colors hover:bg-background/80 has-[:checked]:border-violet-500/45 has-[:checked]:bg-violet-500/5">
                  <input
                    type="radio"
                    name="gameMode"
                    checked={sessionPreset === 'blitz'}
                    onChange={() => setSessionPreset('blitz')}
                    className="mt-1"
                  />
                  <span className="flex-1">
                    <span className="flex flex-wrap items-center gap-2 font-medium">
                      Blitz
                      <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/40 bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-900 dark:text-violet-100">
                        30s max
                      </span>
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Chrono accéléré en style vitesse (optimisé rythme rapide).
                    </span>
                  </span>
                </label>
                {(sessionPreset === 'battle_royale' || sessionPreset === 'boss_fight') && (
                  <div>
                    <label className="mb-2 block text-xs font-medium text-muted-foreground">
                      Deuxième quiz <span className="font-normal text-muted-foreground/80">(facultatif)</span>
                    </label>
                    <select
                      value={secondaryQuizId}
                      onChange={(e) => setSecondaryQuizId(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                    >
                      <option value="">— Aucun : un seul quiz avec ce mode —</option>
                      {otherQuizzes.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.title}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Sans choix, la session utilise uniquement le quiz principal.
                    </p>
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
                <div className="bg-card border-2 border-primary/40 rounded-xl p-6 text-center sm:p-8 md:min-w-[280px]">
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

              <div className="mb-8 space-y-3 text-left text-sm text-muted-foreground">
                <p className="text-center font-medium text-foreground">Lien d’invitation complet</p>
                <div className="rounded-lg border border-border bg-background/80 px-3 py-2 font-mono text-xs break-all text-foreground sm:text-sm">
                  {typeof window !== 'undefined'
                    ? `${window.location.origin}/join?pin=${encodeURIComponent(String(session.pin_code))}`
                    : `…/join?pin=${session.pin_code}`}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <Button
                    type="button"
                    variant="secondary"
                    className="gap-2 font-semibold"
                    onClick={copyJoinInvitationUrl}
                  >
                    <Copy className="h-4 w-4" />
                    {copiedJoinUrl ? 'Lien copié !' : 'Copier le lien d’invitation'}
                  </Button>
                  <Button type="button" variant="outline" className="gap-2" asChild>
                    <Link
                      href={`/join?pin=${encodeURIComponent(String(session.pin_code))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Ouvrir /join
                    </Link>
                  </Button>
                </div>
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
