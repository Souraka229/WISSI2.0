'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { hostControlSession, getSessionLeaderboard } from '@/app/actions/quiz'
import {
  fetchMergedSessionQuestions,
  sessionLiveFieldsChanged,
} from '@/lib/session-questions'
import { Button } from '@/components/ui/button'
import { JoinQrCode } from '@/components/join-qr-code'
import {
  ArrowLeft,
  Loader2,
  Play,
  Trophy,
  SkipForward,
  Users,
  Square,
  HelpCircle,
  Sparkles,
} from 'lucide-react'

const STATUS_FR: Record<string, string> = {
  waiting: 'Salle d’attente',
  active: 'Partie active',
  question: 'Question en cours',
  results: 'Affichage du classement',
  finished: 'Partie terminée',
}

export default function HostSessionPage() {
  const params = useParams()
  const sessionId = params.sessionId as string
  const supabase = createClient()

  const [session, setSession] = useState<Record<string, unknown> | null>(null)
  const [quizTitle, setQuizTitle] = useState('')
  const [questionCount, setQuestionCount] = useState(0)
  const [questions, setQuestions] = useState<
    { id: string; question_text: string; question_type?: string; correct_answer?: string; options?: string[] }[]
  >([])
  const [leaderboard, setLeaderboard] = useState<
    { rank: number; nickname: string; score: number; level: number }[]
  >([])
  const [participantCount, setParticipantCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successHint, setSuccessHint] = useState<string | null>(null)

  const loadLeaderboard = useCallback(async () => {
    try {
      const { top5, all } = await getSessionLeaderboard(sessionId)
      setLeaderboard(top5)
      setParticipantCount(all.length)
    } catch {
      /* ignore */
    }
  }, [sessionId])

  useEffect(() => {
    let cancelled = false
    let leaderboardDebounce: ReturnType<typeof setTimeout> | null = null

    const scheduleLeaderboard = () => {
      if (leaderboardDebounce) clearTimeout(leaderboardDebounce)
      leaderboardDebounce = setTimeout(() => {
        leaderboardDebounce = null
        void loadLeaderboard()
      }, 400)
    }

    const init = async () => {
      try {
        const { data: s, error: se } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .single()

        if (se || !s || cancelled) {
          if (!cancelled) setLoading(false)
          return
        }

        const { data: quiz } = await supabase
          .from('quizzes')
          .select('title')
          .eq('id', s.quiz_id)
          .single()

        const merged = await fetchMergedSessionQuestions(supabase, {
          quiz_id: s.quiz_id,
          secondary_quiz_id: s.secondary_quiz_id ?? null,
          game_mode: s.game_mode,
        })

        if (cancelled) return
        setSession(s as Record<string, unknown>)
        setQuizTitle(quiz?.title ?? 'Quiz')
        setQuestionCount(merged.length)
        setQuestions(
          merged.map((q: { id: string; question_text: string; question_type?: string; correct_answer?: string; options?: string[] }) => ({
            id: q.id,
            question_text: q.question_text,
            question_type: q.question_type,
            correct_answer: q.correct_answer != null ? String(q.correct_answer) : undefined,
            options: Array.isArray(q.options) ? q.options : undefined,
          })),
        )
        await loadLeaderboard()
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void init()

    const liveCh = supabase
      .channel(`host-live-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          setSession(payload.new as Record<string, unknown>)
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          scheduleLeaderboard()
        },
      )
      .subscribe()

    const pollId = window.setInterval(async () => {
      if (cancelled) return
      const { data } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .maybeSingle()
      if (cancelled || !data) return
      const next = data as Record<string, unknown>
      setSession((prev) => (sessionLiveFieldsChanged(prev, next) ? next : prev))
    }, 4000)

    return () => {
      cancelled = true
      if (leaderboardDebounce) clearTimeout(leaderboardDebounce)
      window.clearInterval(pollId)
      void supabase.removeChannel(liveCh)
    }
  }, [sessionId, supabase, loadLeaderboard])

  useEffect(() => {
    if (session?.status === 'results') {
      void loadLeaderboard()
    }
  }, [session?.status, loadLeaderboard])

  const run = async (action: Parameters<typeof hostControlSession>[1]) => {
    setBusy(true)
    setError(null)
    setSuccessHint(null)
    try {
      const result = await hostControlSession(sessionId, action)
      if (!result.ok) {
        setError(result.error)
        return
      }
      await loadLeaderboard()
      const hints: Record<string, string> = {
        start: 'La partie est lancée — les élèves voient la 1ʳᵉ question.',
        show_leaderboard: 'Classement affiché chez les joueurs.',
        next_question: 'Étape suivante envoyée.',
        end: 'Session terminée.',
      }
      setSuccessHint(hints[action] ?? null)
      window.setTimeout(() => setSuccessHint(null), 4500)
    } catch (e) {
      console.error(e)
      setError('Échec de la commande — réessayez ou ouvrez la console.')
    } finally {
      setBusy(false)
    }
  }

  if (loading || !session) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Chargement du pupitre…</p>
      </div>
    )
  }

  const status = String(session.status)
  const idx = Number(session.current_question_index ?? 0)
  const mode =
    session.game_mode === 'prof_dual' ? 'Défis du prof (2 quiz)' : 'Challenge libre'
  const currentQ = questions[idx]
  const statusFr = STATUS_FR[status] ?? status
  const statusTone =
    status === 'waiting'
      ? 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100'
      : status === 'question'
        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100'
        : status === 'results'
          ? 'border-violet-500/40 bg-violet-500/10 text-violet-900 dark:text-violet-100'
          : status === 'finished'
            ? 'border-border bg-muted/50 text-muted-foreground'
            : 'border-border bg-muted/30'

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 pb-[env(safe-area-inset-bottom,0px)]">
      <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard" aria-label="Retour">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold">Pupitre animateur</h1>
            <p className="truncate text-xs text-muted-foreground">
              {quizTitle} · {mode}
            </p>
          </div>
          <div className="hidden shrink-0 items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium sm:flex">
            <Users className="h-3.5 w-3.5" />
            {participantCount} joueur{participantCount !== 1 ? 's' : ''}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        {error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {successHint && (
          <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200">
            {successHint}
          </div>
        )}

        <section
          className={`rounded-2xl border-2 p-5 shadow-sm transition-colors ${statusTone}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
                État en direct
              </p>
              <p className="mt-1 text-2xl font-bold">{statusFr}</p>
              <p className="mt-2 text-sm opacity-90">
                Question <span className="font-mono font-bold">{Math.min(idx + 1, questionCount)}</span>{' '}
                / {questionCount || '—'} · PIN{' '}
                <span className="font-mono font-bold">{String(session.pin_code)}</span>
              </p>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 text-xs font-medium text-foreground sm:hidden">
              <Users className="h-3.5 w-3.5" />
              {participantCount}
            </div>
          </div>
        </section>

        {(status === 'question' || status === 'results') && currentQ && (
          <section className="rounded-2xl border border-primary/25 bg-card p-5 shadow-md ring-1 ring-primary/10">
            <div className="mb-3 flex items-center gap-2 text-primary">
              <HelpCircle className="h-4 w-4 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Question vue par les élèves
              </span>
            </div>
            <p className="text-base font-semibold leading-snug text-foreground">
              {currentQ.question_text}
            </p>
            {status === 'results' && currentQ.correct_answer != null && (
              <p className="mt-3 rounded-lg bg-muted/80 px-3 py-2 text-sm">
                <span className="font-medium text-muted-foreground">Bonne réponse (réf.) : </span>
                {currentQ.question_type === 'mcq' &&
                currentQ.options &&
                currentQ.options[Number(currentQ.correct_answer)] != null
                  ? `${String.fromCharCode(65 + Number(currentQ.correct_answer))}. ${currentQ.options[Number(currentQ.correct_answer)]}`
                  : currentQ.question_type === 'true_false'
                    ? Number(currentQ.correct_answer) === 0
                      ? 'Vrai'
                      : 'Faux'
                    : String(currentQ.correct_answer)}
              </p>
            )}
          </section>
        )}

        {status !== 'finished' && session.pin_code != null && (
          <section className="rounded-2xl border border-border bg-muted/20 p-5">
            <p className="text-center text-sm font-semibold text-foreground">
              Inviter les joueurs
            </p>
            <p className="mt-1 text-center text-xs text-muted-foreground">
              Scan du QR → page /join avec le PIN ; ils saisissent seulement leur pseudo.
            </p>
            <div className="mt-4 flex justify-center">
              <JoinQrCode pin={String(session.pin_code)} size={176} />
            </div>
          </section>
        )}

        {status === 'waiting' && (
          <div className="space-y-3">
            <p className="text-center text-sm text-muted-foreground">
              Quand assez de monde a rejoint, lancez : les téléphones passent sur la 1ʳᵉ question.
            </p>
            <Button
              className="h-14 w-full gap-2 text-base shadow-lg shadow-primary/20"
              disabled={busy || questionCount === 0}
              onClick={() => void run('start')}
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
              Démarrer la partie
            </Button>
          </div>
        )}

        {status === 'question' && (
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              variant="secondary"
              className="h-12 flex-1 gap-2 font-semibold"
              disabled={busy}
              onClick={() => void run('show_leaderboard')}
            >
              <Trophy className="h-4 w-4" />
              Montrer le TOP 5
            </Button>
            <Button
              variant="outline"
              className="h-12 flex-1 gap-2"
              disabled={busy}
              onClick={() => void run('end')}
            >
              <Square className="h-4 w-4" />
              Terminer la session
            </Button>
          </div>
        )}

        {status === 'results' && (
          <div className="space-y-2">
            <p className="text-center text-xs text-muted-foreground">
              Les joueurs voient le classement. Passez à la suite quand vous voulez.
            </p>
            <Button
              className="h-12 w-full gap-2 font-semibold"
              disabled={busy}
              onClick={() => void run('next_question')}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SkipForward className="h-4 w-4" />
              )}
              Question suivante ou fin de partie
            </Button>
          </div>
        )}

        {(status === 'finished' || status === 'results') && (
          <section className="rounded-2xl border border-border bg-gradient-to-b from-card to-muted/20 p-5 shadow-inner">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <h2 className="font-bold">Podium (TOP 5)</h2>
            </div>
            <ol className="space-y-2">
              {leaderboard.length === 0 ? (
                <li className="text-sm text-muted-foreground">Aucun joueur pour l’instant</li>
              ) : (
                leaderboard.map((row) => {
                  const medal =
                    row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : null
                  const rowStyle =
                    row.rank === 1
                      ? 'border-amber-400/50 bg-amber-500/10'
                      : row.rank === 2
                        ? 'border-slate-400/40 bg-slate-400/10'
                        : row.rank === 3
                          ? 'border-orange-400/40 bg-orange-500/10'
                          : 'border-border bg-background'
                  return (
                    <li
                      key={row.rank + row.nickname}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm ${rowStyle}`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="flex w-8 justify-center font-mono text-base">
                          {medal ?? `#${row.rank}`}
                        </span>
                        <span className="font-medium">{row.nickname}</span>
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums">
                        {row.score} pts · Nv.{row.level}
                      </span>
                    </li>
                  )
                })
              )}
            </ol>
          </section>
        )}

        {status === 'finished' && (
          <Button variant="outline" className="w-full h-12" asChild>
            <Link href="/dashboard">Retour au tableau de bord</Link>
          </Button>
        )}
      </main>
    </div>
  )
}
