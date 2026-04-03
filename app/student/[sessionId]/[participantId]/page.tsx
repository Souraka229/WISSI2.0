'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  fetchMergedSessionQuestions,
  SESSION_QUESTION_COLUMNS_STUDENT,
  sessionLiveFieldsChanged,
} from '@/lib/session-questions'
import { effectiveLiveQuestionSeconds } from '@/lib/live-quiz'
import { liveMcqTileClass } from '@/lib/live-mcq-colors'
import { addReaction, submitAnswer, getSessionLeaderboard } from '@/app/actions/quiz'
import { SessionLiveStickers } from '@/components/live/session-live-stickers'
import { Button } from '@/components/ui/button'
import {
  Loader2,
  Trophy,
  Users,
  CheckCircle2,
  Clock,
  Flame,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react'

type ParticipantRow = {
  id: string
  nickname: string
  score: number
  level: number
  streak?: number | null
}

type AnswerFeedback =
  | { kind: 'submitted'; pointsEarned: number; correct: boolean }
  | { kind: 'timeout_wait' }
  | { kind: 'duplicate' }

type QuestionRow = {
  id: string
  question_text: string
  question_type?: string
  correct_answer?: string | number
  options?: string[]
  time_limit?: number
  explanation?: string
}

export default function StudentPlayerPage() {
  const params = useParams()
  const sessionId = params.sessionId as string
  const participantId = params.participantId as string

  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current
  const [session, setSession] = useState<Record<string, unknown> | null>(null)
  const [questions, setQuestions] = useState<QuestionRow[]>([])
  const [me, setMe] = useState<ParticipantRow | null>(null)
  const [leaderboard, setLeaderboard] = useState<
    { rank: number; nickname: string; score: number; level: number; id?: string }[]
  >([])
  const [myRank, setMyRank] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [answered, setAnswered] = useState(false)
  const [timeLeft, setTimeLeft] = useState(30)
  const [recentReactions, setRecentReactions] = useState<string[]>([])
  const [reactionLeft, setReactionLeft] = useState(3)
  const [onlineCount, setOnlineCount] = useState(1)
  const [answerFeedback, setAnswerFeedback] = useState<AnswerFeedback | null>(null)
  const [realtimeStatus, setRealtimeStatus] = useState<
    'connecting' | 'connected' | 'error'
  >('connecting')
  const questionKeyRef = useRef<string>('')
  const questionsRef = useRef<QuestionRow[]>([])
  /** Rangs au début de la question courante (avant les points de cette question). */
  const questionStartRanksRef = useRef<Map<string, number>>(new Map())
  const resultsCompareBaselineRef = useRef<Map<string, number>>(new Map())
  const resultsBaselineLockedRef = useRef(false)

  useEffect(() => {
    questionsRef.current = questions
  }, [questions])

  const refreshLeaderboard = useCallback(async () => {
    try {
      const { top5, all } = await getSessionLeaderboard(sessionId)
      setLeaderboard(top5)
      const r = all.findIndex((p) => p.id === participantId)
      setMyRank(r >= 0 ? r + 1 : null)
    } catch {
      /* ignore */
    }
  }, [sessionId, participantId])

  const refreshMe = useCallback(async () => {
    const { data } = await supabase
      .from('participants')
      .select('id, nickname, score, level, streak')
      .eq('id', participantId)
      .single()
    if (data) setMe(data as ParticipantRow)
  }, [participantId])

  useEffect(() => {
    let cancelled = false

    const boot = async () => {
      try {
        const { data: sessionData, error: se } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .single()

        if (cancelled) return
        if (se || !sessionData) {
          return
        }

        setSession(sessionData as Record<string, unknown>)

        const row = sessionData as {
          status?: string
          quiz_id: string
          secondary_quiz_id?: string | null
          game_mode?: string | null
        }

        const isWaiting = String(row.status ?? '') === 'waiting'

        if (isWaiting) {
          setQuestions([])
          await Promise.all([refreshMe(), refreshLeaderboard()])
          return
        }

        const merged = await fetchMergedSessionQuestions(
          supabase,
          {
            quiz_id: row.quiz_id,
            secondary_quiz_id: row.secondary_quiz_id ?? null,
            game_mode: row.game_mode,
          },
          { columns: SESSION_QUESTION_COLUMNS_STUDENT },
        )
        if (cancelled) return
        setQuestions(merged as unknown as QuestionRow[])
        await Promise.all([refreshMe(), refreshLeaderboard()])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void boot()

    /** Un seul canal postgres (moins de charge) : sessions + moi + réactions. */
    const liveCh = supabase
      .channel(`student-live-${sessionId}-${participantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionId}`,
        },
        (p) => {
          const newSession = p.new as Record<string, unknown>
          const oldIdx = Number(
            (p.old as Record<string, unknown> | undefined)?.current_question_index ??
              -1,
          )
          const newIdx = Number(newSession.current_question_index ?? 0)

          setSession(newSession)

          if (oldIdx !== newIdx) {
            const d = newSession.question_deadline_at
            if (typeof d === 'string' && d.length > 0) {
              const end = new Date(d).getTime()
              if (!Number.isNaN(end)) {
                setTimeLeft(Math.max(0, Math.ceil((end - Date.now()) / 1000)))
              } else {
                const merged = questionsRef.current
                setTimeLeft(
                  effectiveLiveQuestionSeconds(merged[newIdx]?.time_limit),
                )
              }
            } else {
              const merged = questionsRef.current
              setTimeLeft(
                effectiveLiveQuestionSeconds(merged[newIdx]?.time_limit),
              )
            }
            setAnswered(false)
            setSelectedAnswer(null)
            setAnswerFeedback(null)
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'participants',
          filter: `id=eq.${participantId}`,
        },
        () => {
          void refreshMe()
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reactions',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const emoji = (payload.new as { emoji?: string })?.emoji
          if (emoji) {
            setRecentReactions((prev) => [...prev.slice(-12), emoji])
          }
        },
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          if (!cancelled) setRealtimeStatus('connected')
        }
        if (err) console.error('[STUDENT] Realtime erreur', err)
        if (err || status === 'CHANNEL_ERROR') {
          if (!cancelled) setRealtimeStatus('error')
        }
      })

    const presence = supabase.channel(`presence:${sessionId}`, {
      config: { presence: { key: participantId } },
    })
    presence
      .on('presence', { event: 'sync' }, () => {
        const state = presence.presenceState()
        setOnlineCount(Math.max(1, Object.keys(state).length))
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presence.track({ joined_at: new Date().toISOString() })
        }
      })

    /** Secours si Realtime n’est pas activé sur les tables (Dashboard → Publications). */
    const pollMs = 4000
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
    }, pollMs)

    return () => {
      cancelled = true
      window.clearInterval(pollId)
      void supabase.removeChannel(liveCh)
      void supabase.removeChannel(presence)
    }
  }, [sessionId, participantId, refreshMe, refreshLeaderboard])

  const status = session ? String(session.status) : ''
  const sessionGameMode = session ? String(session.game_mode ?? '') : ''
  const qIndex = session ? Number(session.current_question_index ?? 0) : 0
  const currentQuestion = questions[qIndex]

  const reactionsEnabled = Boolean((session as any)?.reactions_enabled ?? true)
  const REACTION_EMOJIS = ['🔥', '❤️', '😂', '👏', '😱', '🎉', '💪', '🤯'] as const

  useEffect(() => {
    setReactionLeft(3)
  }, [status, qIndex])

  const sendReaction = useCallback(
    async (emoji: string) => {
      if (!reactionsEnabled) return
      if (reactionLeft <= 0) return
      setReactionLeft((v) => Math.max(0, v - 1))
      try {
        await addReaction(sessionId, participantId, emoji)
      } catch (e) {
        console.error('[student] addReaction', e)
        setReactionLeft((v) => Math.min(3, v + 1))
      }
    },
    [participantId, reactionsEnabled, reactionLeft, sessionId],
  )

  /** Quand on quitte la salle d’attente : charger les questions (pas au premier chargement si waiting). */
  const quizIdForLoad =
    session && session.quiz_id != null ? String(session.quiz_id) : ''
  const secondaryQuizIdForLoad =
    session && session.secondary_quiz_id != null
      ? String(session.secondary_quiz_id)
      : ''
  const gameModeForLoad =
    session && session.game_mode != null && String(session.game_mode).length > 0
      ? String(session.game_mode)
      : undefined

  useEffect(() => {
    if (!quizIdForLoad) return
    if (status === 'waiting' || status === 'finished' || status === 'results') return
    if (questions.length > 0) return

    let cancelled = false
    void (async () => {
      try {
        const merged = await fetchMergedSessionQuestions(
          supabase,
          {
            quiz_id: quizIdForLoad,
            secondary_quiz_id: secondaryQuizIdForLoad || null,
            game_mode: gameModeForLoad,
          },
          { columns: SESSION_QUESTION_COLUMNS_STUDENT },
        )
        if (!cancelled) setQuestions(merged as unknown as QuestionRow[])
      } catch (e) {
        console.error('[student] chargement questions (différé)', e)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [
    supabase,
    quizIdForLoad,
    secondaryQuizIdForLoad,
    gameModeForLoad,
    status,
    questions.length,
  ])

  useEffect(() => {
    if (status === 'results' && !resultsBaselineLockedRef.current) {
      resultsCompareBaselineRef.current = new Map(questionStartRanksRef.current)
      resultsBaselineLockedRef.current = true
    }
    if (status === 'question') {
      resultsBaselineLockedRef.current = false
    }
  }, [status])

  /** Instantané des rangs au lancement de chaque question (pour flèches ↑↓ au classement). */
  useEffect(() => {
    if (status !== 'question' || !currentQuestion) return
    let cancelled = false
    void (async () => {
      try {
        const { all } = await getSessionLeaderboard(sessionId)
        if (cancelled) return
        questionStartRanksRef.current = new Map(all.map((p, i) => [p.id, i + 1]))
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [status, qIndex, currentQuestion?.id, sessionId])

  const submitAnswerNow = useCallback(
    async (fromTimeout: boolean, choiceOverride?: string | null) => {
      if (!currentQuestion || answered || status !== 'question') return

      const choice = fromTimeout
        ? null
        : choiceOverride !== undefined
          ? choiceOverride
          : selectedAnswer

      if (!fromTimeout && (choice === null || choice === '')) return

      if (!fromTimeout && choice !== null) setSelectedAnswer(choice)
      setAnswered(true)
      const isCorrect =
        choice !== null && String(choice) === String(currentQuestion.correct_answer)
      const startedRaw = session?.question_started_at
      const startedMs =
        typeof startedRaw === 'string' && startedRaw.length > 0
          ? new Date(startedRaw).getTime()
          : NaN
      let timeTaken: number
      if (!Number.isNaN(startedMs)) {
        timeTaken = Math.max(0, Math.floor((Date.now() - startedMs) / 1000))
      } else {
        const budget = effectiveLiveQuestionSeconds(currentQuestion.time_limit)
        timeTaken = Math.max(0, budget - timeLeft)
      }
      try {
        const res = await submitAnswer(
          participantId,
          sessionId,
          currentQuestion.id,
          choice === null ? 'timeout' : String(choice),
          isCorrect,
          timeTaken,
        )
        if (res && 'duplicate' in res && res.duplicate) {
          setAnswerFeedback({ kind: 'duplicate' })
        } else if (fromTimeout || choice === null) {
          setAnswerFeedback({ kind: 'timeout_wait' })
        } else {
          const pe =
            res && 'pointsEarned' in res && typeof res.pointsEarned === 'number'
              ? res.pointsEarned
              : 0
          setAnswerFeedback({ kind: 'submitted', pointsEarned: pe, correct: isCorrect })
        }
        await refreshMe()
        await refreshLeaderboard()
      } catch (e) {
        console.error(e)
        setAnswerFeedback(
          fromTimeout || choice === null
            ? { kind: 'timeout_wait' }
            : { kind: 'submitted', pointsEarned: 0, correct: isCorrect },
        )
      }
    },
    [
      currentQuestion,
      answered,
      status,
      selectedAnswer,
      participantId,
      sessionId,
      session?.question_started_at,
      timeLeft,
      refreshMe,
      refreshLeaderboard,
    ],
  )

  useEffect(() => {
    const key = `${qIndex}-${currentQuestion?.id ?? ''}-${status}`
    if (key !== questionKeyRef.current) {
      questionKeyRef.current = key
      setSelectedAnswer(null)
      setAnswered(false)
      setAnswerFeedback(null)
      const dRaw = session?.question_deadline_at
      const serverOk =
        status === 'question' &&
        typeof dRaw === 'string' &&
        dRaw.length > 0 &&
        !Number.isNaN(new Date(dRaw).getTime())
      if (serverOk) {
        setTimeLeft(
          Math.max(
            0,
            Math.ceil((new Date(String(dRaw)).getTime() - Date.now()) / 1000),
          ),
        )
      } else if (currentQuestion && status === 'question') {
        setTimeLeft(effectiveLiveQuestionSeconds(currentQuestion.time_limit))
      }
    }
  }, [
    qIndex,
    currentQuestion?.id,
    currentQuestion?.time_limit,
    status,
    session?.question_deadline_at,
  ])

  useEffect(() => {
    if (status !== 'question' || answered || !currentQuestion) return

    const dRaw = session?.question_deadline_at
    const hasServerTimer =
      typeof dRaw === 'string' &&
      dRaw.length > 0 &&
      !Number.isNaN(new Date(dRaw).getTime())

    if (hasServerTimer) {
      const tick = () => {
        const sec = Math.max(
          0,
          Math.ceil((new Date(String(dRaw)).getTime() - Date.now()) / 1000),
        )
        setTimeLeft(sec)
      }
      tick()
      const id = window.setInterval(tick, 250)
      return () => window.clearInterval(id)
    }

    const t = window.setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => window.clearInterval(t)
  }, [status, answered, currentQuestion?.id, session?.question_deadline_at])

  useEffect(() => {
    if (status !== 'question' || answered || !currentQuestion) return
    if (timeLeft !== 0) return
    void submitAnswerNow(true)
  }, [timeLeft, status, answered, currentQuestion, submitAnswerNow])

  useEffect(() => {
    if (status === 'results') {
      void refreshLeaderboard()
      void refreshMe()
    }
  }, [status, refreshLeaderboard, refreshMe])

  useEffect(() => {
    if (status !== 'results') return
    const t = window.setInterval(() => void refreshLeaderboard(), 2500)
    return () => window.clearInterval(t)
  }, [status, refreshLeaderboard])

  const liveRealtimeBadge = (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide ${
        realtimeStatus === 'connected'
          ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
          : realtimeStatus === 'error'
            ? 'bg-destructive/15 text-destructive'
            : 'bg-muted text-muted-foreground'
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          realtimeStatus === 'connected'
            ? 'animate-pulse bg-emerald-500'
            : realtimeStatus === 'error'
              ? 'bg-destructive'
              : 'bg-muted-foreground'
        }`}
      />
      {realtimeStatus === 'connected'
        ? 'Live'
        : realtimeStatus === 'error'
          ? 'Hors ligne'
          : 'Connexion…'}
    </div>
  )

  if (loading) {
    return (
      <div className="live-play-bg flex min-h-[100dvh] flex-col items-center justify-center gap-6 px-6 pt-[env(safe-area-inset-top,0px)]">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/20 blur-xl" aria-hidden />
            <Loader2 className="relative h-14 w-14 animate-spin text-primary" />
          </div>
          <p className="text-base font-semibold text-foreground">Connexion à la partie…</p>
          <p className="max-w-xs text-sm text-muted-foreground">Quelques secondes, on prépare ton écran de jeu.</p>
        </div>
        <div className="h-2 w-56 max-w-full overflow-hidden rounded-full live-skeleton" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 p-6 text-center">
        <p className="text-lg font-semibold text-foreground">Session introuvable</p>
        <p className="max-w-sm text-sm text-muted-foreground">Vérifie le lien ou le code PIN avec ton enseignant.</p>
        <Button asChild size="lg" variant="outline" className="min-h-12 min-w-[200px] touch-manipulation">
          <Link href="/join">Rejoindre une autre session</Link>
        </Button>
      </div>
    )
  }

  if (status === 'finished') {
    return (
      <div className="relative flex min-h-[100dvh] flex-col items-center justify-center gap-8 overflow-hidden bg-gradient-to-b from-amber-500/20 via-background to-violet-600/15 px-5 py-10 text-center animate-in fade-in zoom-in-95 duration-500 sm:px-8 live-safe-bottom">
        <div className="pointer-events-none absolute -top-20 left-1/2 h-64 w-[120%] -translate-x-1/2 rounded-full bg-amber-400/25 blur-3xl dark:bg-amber-500/20" aria-hidden />
        <div className="relative">
          <div className="absolute inset-0 scale-150 rounded-full bg-amber-400/35 blur-2xl dark:bg-amber-500/25" aria-hidden />
          <Trophy className="relative mx-auto h-24 w-24 text-amber-500 drop-shadow-lg sm:h-28 sm:w-28" />
        </div>
        <div className="relative max-w-md space-y-2">
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Bravo !</h1>
          <p className="text-lg text-muted-foreground sm:text-xl">
            <span className="font-bold text-foreground">{me?.nickname}</span>
            <span className="mx-1 text-muted-foreground">·</span>
            <span className="tabular-nums font-black text-primary">{me?.score ?? 0} pts</span>
            <span className="text-muted-foreground"> · nv. {me?.level ?? 1}</span>
          </p>
          <p className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-950 dark:text-amber-100">
            Rang final <span className="tabular-nums font-black">#{myRank ?? '—'}</span> sur cette session
          </p>
        </div>
        <Button asChild size="lg" className="relative min-h-14 min-w-[min(100%,280px)] touch-manipulation text-base font-bold shadow-lg">
          <Link href="/join">Rejouer une autre partie</Link>
        </Button>
      </div>
    )
  }

  if (status === 'waiting') {
    return (
      <div className="wiaa-purple-bg relative min-h-[100dvh] overflow-hidden px-4 pb-10 pt-[max(1.5rem,env(safe-area-inset-top,0px))] text-white sm:px-6">
        <div
          className="live-lobby-orb pointer-events-none absolute -right-24 top-20 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl dark:bg-fuchsia-400/15"
          aria-hidden
        />
        <div
          className="live-lobby-orb pointer-events-none absolute -left-32 bottom-32 h-80 w-80 rounded-full bg-violet-500/20 blur-3xl [animation-delay:-5s] dark:bg-violet-400/15"
          aria-hidden
        />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center justify-center gap-6 py-10 text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="flex justify-center">
            <SessionLiveStickers gameMode={sessionGameMode} />
          </div>

          <div className="relative">
            <div className="absolute inset-0 -z-10 rounded-full bg-white/10 blur-2xl" aria-hidden />
            <Loader2 className="mx-auto h-14 w-14 animate-spin text-white/90" />
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Prêt !</h1>
            <p className="text-white/75">En attente du lancement par l’admin…</p>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold">
              {me?.nickname ?? 'Joueur'}{' '}
              <span className="font-normal text-white/70">· joueur connecté</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-xs text-white/70">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1">
                <Users className="h-4 w-4" />
                <span className="tabular-nums font-bold text-white">{onlineCount}</span> en ligne
              </span>
              {liveRealtimeBadge}
            </div>
          </div>

          {reactionsEnabled ? (
            <div className="mt-6 w-full max-w-2xl rounded-3xl bg-white/8 p-5 backdrop-blur-sm">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-white/70">Réactions</p>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold tabular-nums text-white/85">
                  {reactionLeft} restants
                </span>
              </div>
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
                {REACTION_EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    className="wiaa-reaction-tile touch-manipulation rounded-2xl py-3 text-2xl transition disabled:opacity-35"
                    onClick={() => void sendReaction(e)}
                    disabled={reactionLeft <= 0}
                    aria-label={`Réagir ${e}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  if (status === 'results') {
    return (
      <div className="live-podium-bg min-h-[100dvh] px-3 pb-32 pt-[max(0.75rem,env(safe-area-inset-top,0px))] animate-in zoom-in-95 duration-300 sm:px-5 sm:pb-36 sm:pt-4">
        <header className="mx-auto mb-5 flex max-w-lg flex-col gap-4 sm:mb-8 sm:max-w-2xl sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-700 dark:text-violet-300">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">Classement</p>
              <p className="text-2xl font-black tracking-tight sm:text-3xl">Top 5</p>
              <p className="mt-1 max-w-[240px] text-xs leading-snug text-muted-foreground sm:max-w-none">
                Flèches : évolution de ton rang après la question.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
            <SessionLiveStickers gameMode={sessionGameMode} className="sm:order-first" />
            {liveRealtimeBadge}
            <div className="rounded-2xl border border-primary/25 bg-primary/5 px-4 py-2.5 text-right sm:min-w-[9rem]">
              <p className="text-[10px] font-bold uppercase tracking-wide text-primary">Toi</p>
              <p className="text-sm font-bold tabular-nums sm:text-base">
                #{myRank ?? '—'} · Nv.{me?.level ?? 1}
              </p>
              <p className="text-xs font-semibold tabular-nums text-muted-foreground">{me?.score ?? 0} pts</p>
            </div>
          </div>
        </header>

        <ol className="mx-auto max-w-lg space-y-2.5 sm:max-w-2xl sm:space-y-3">
          {leaderboard.map((row, i) => {
            const medal =
              row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : null
            const isMe = row.id === participantId
            const pid = row.id
            const prevRank =
              pid != null ? resultsCompareBaselineRef.current.get(pid) : undefined
            const rankDelta =
              prevRank !== undefined ? prevRank - row.rank : 0
            const base =
              row.rank === 1
                ? 'border-amber-400/50 bg-amber-500/10'
                : row.rank === 2
                  ? 'border-slate-400/35 bg-slate-400/10'
                  : row.rank === 3
                    ? 'border-orange-400/40 bg-orange-500/10'
                    : 'border-border bg-card'
            return (
              <li
                key={row.id ?? `${row.rank}-${row.nickname}`}
                className={`flex animate-in fade-in slide-in-from-left-2 flex-col gap-3 rounded-2xl border-2 px-4 py-3.5 duration-300 min-[400px]:flex-row min-[400px]:items-center min-[400px]:justify-between sm:rounded-3xl sm:px-5 sm:py-4 ${base} ${
                  isMe ? 'ring-2 ring-primary ring-offset-2 ring-offset-background sm:scale-[1.02]' : ''
                }`}
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <span className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center text-xl font-bold sm:h-12 sm:w-12 sm:text-2xl">
                    {medal ?? <span className="text-sm font-black text-muted-foreground">#{row.rank}</span>}
                  </span>
                  <span className={`min-w-0 truncate text-base font-semibold sm:text-lg ${isMe ? 'text-primary' : ''}`}>
                    {row.nickname}
                  </span>
                </span>
                <span className="flex shrink-0 items-center justify-end gap-2 min-[400px]:justify-start">
                  {prevRank !== undefined && (
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-black ${
                        rankDelta > 0
                          ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                          : rankDelta < 0
                            ? 'bg-destructive/15 text-destructive'
                            : 'bg-muted text-muted-foreground'
                      }`}
                      title={
                        rankDelta > 0
                          ? `Monte de ${rankDelta} place(s)`
                          : rankDelta < 0
                            ? `Descend de ${-rankDelta} place(s)`
                            : 'Rang inchangé'
                      }
                    >
                      {rankDelta > 0 ? (
                        <ArrowUp className="h-4 w-4" aria-hidden />
                      ) : rankDelta < 0 ? (
                        <ArrowDown className="h-4 w-4" aria-hidden />
                      ) : (
                        <Minus className="h-4 w-4" aria-hidden />
                      )}
                    </span>
                  )}
                  <span className="text-right text-sm font-bold tabular-nums sm:text-base">
                    {row.score} pts · Nv.{row.level}
                  </span>
                </span>
              </li>
            )
          })}
        </ol>

        <div className="mx-auto mt-8 max-w-lg rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4 text-center text-sm leading-relaxed text-muted-foreground sm:mt-10 sm:max-w-2xl sm:p-5">
          La suite est lancée par l’animateur (ou automatiquement si activé).
        </div>

        <div className="pointer-events-none fixed bottom-[max(1rem,env(safe-area-inset-bottom,0px))] left-0 right-0 flex flex-wrap justify-center gap-2 px-4">
          {recentReactions.slice(-8).map((e, i) => (
            <span
              key={`${e}-${i}`}
              className="animate-in fade-in zoom-in text-3xl duration-300"
            >
              {e}
            </span>
          ))}
        </div>
      </div>
    )
  }

  if (status === 'question' && currentQuestion) {
    const budgetSeconds = (() => {
      const start = session?.question_started_at
      const end = session?.question_deadline_at
      if (
        typeof start === 'string' &&
        typeof end === 'string' &&
        start.length > 0 &&
        end.length > 0
      ) {
        const dur = Math.round(
          (new Date(end).getTime() - new Date(start).getTime()) / 1000,
        )
        if (dur > 0) return dur
      }
      return effectiveLiveQuestionSeconds(currentQuestion.time_limit)
    })()
    const timeRatio = budgetSeconds > 0 ? timeLeft / budgetSeconds : 0

    return (
      <div className="live-play-bg relative min-h-[100dvh] pb-[max(6rem,env(safe-area-inset-bottom,0px)+5rem)]">
        <header className="sticky top-0 z-40 border-b border-border/80 bg-card/90 shadow-md backdrop-blur-lg pt-[env(safe-area-inset-top,0px)]">
          <div className="mx-auto w-full max-w-lg px-3 pt-3 sm:max-w-2xl sm:px-5 sm:pt-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                  Question <span className="tabular-nums">{qIndex + 1}</span> /{' '}
                  <span className="tabular-nums">{questions.length}</span>
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted sm:h-2">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-700 ease-out"
                    style={{
                      width: `${((qIndex + 1) / Math.max(questions.length, 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <div
                className={`flex shrink-0 items-center justify-center gap-2 self-end rounded-2xl border-2 px-4 py-2.5 tabular-nums shadow-sm sm:self-center sm:px-5 sm:py-3 ${
                  timeLeft <= 5
                    ? 'border-destructive/70 bg-destructive/15 text-destructive'
                    : 'border-border bg-muted/60 text-foreground'
                }`}
              >
                <Clock className="h-5 w-5 opacity-80 sm:h-6 sm:w-6" />
                <span className={`text-2xl font-black sm:text-3xl ${timeLeft <= 5 ? 'animate-pulse' : ''}`}>
                  {timeLeft}s
                </span>
              </div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted/90 sm:mt-3.5" aria-hidden>
              <div
                className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${
                  timeLeft <= 5 ? 'bg-destructive' : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                }`}
                style={{ width: `${Math.max(0, Math.min(100, timeRatio * 100))}%` }}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2 border-t border-border/60 px-3 py-3 text-xs sm:mx-auto sm:max-w-2xl sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:px-5 sm:py-3 sm:text-sm">
            <span className="flex flex-wrap items-center gap-2 text-muted-foreground">
              <SessionLiveStickers gameMode={sessionGameMode} size="sm" />
              <Users className="h-4 w-4 shrink-0 text-primary/80" />
              <span className="font-medium">
                <span className="tabular-nums">{onlineCount}</span> en ligne
              </span>
              {liveRealtimeBadge}
            </span>
            <span className="flex flex-wrap items-center gap-2 font-medium tabular-nums text-foreground">
              <span>
                Rang <strong className="text-primary">#{myRank ?? '—'}</strong>
              </span>
              <span className="text-muted-foreground">·</span>
              <span>Nv.{me?.level ?? 1}</span>
              <span className="text-muted-foreground">·</span>
              <span>{me?.score ?? 0} pts</span>
              {typeof me?.streak === 'number' && me.streak > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5 font-bold text-orange-700 dark:text-orange-300">
                  <Flame className="h-3.5 w-3.5" />
                  {me.streak}
                </span>
              )}
            </span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-lg px-3 py-5 sm:max-w-2xl sm:px-6 sm:py-8">
          <div className="rounded-3xl border border-border/80 bg-card/95 p-4 shadow-2xl ring-1 ring-black/[0.04] animate-in fade-in slide-in-from-bottom-3 duration-300 dark:bg-card dark:ring-white/[0.06] sm:p-6 md:p-8">
            <h2 className="text-balance text-lg font-bold leading-snug text-foreground sm:text-xl md:text-2xl">
              {currentQuestion.question_text}
            </h2>

            {currentQuestion.question_type === 'mcq' && Array.isArray(currentQuestion.options) && (
              <div className="mt-6 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4">
                {currentQuestion.options.map((option: string, idx: number) => {
                  const nOpts = currentQuestion.options!.length
                  const isSel = selectedAnswer === String(idx)
                  const canInteract = !answered && timeLeft > 0
                  const spanFull = nOpts % 2 === 1 && idx === nOpts - 1
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={!canInteract}
                      onClick={() =>
                        canInteract && void submitAnswerNow(false, String(idx))
                      }
                      className={`flex min-h-[5.25rem] flex-col justify-center px-4 py-4 text-left sm:min-h-[6.25rem] sm:px-5 sm:py-5 ${liveMcqTileClass(idx, {
                        isSelected: isSel,
                        answered,
                        canInteract,
                      })} ${spanFull ? 'min-[420px]:col-span-2' : ''}`}
                    >
                      <span className="text-[11px] font-black uppercase tracking-widest opacity-90 sm:text-xs">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <p className="mt-1.5 text-base font-bold leading-snug sm:text-lg">{option}</p>
                    </button>
                  )
                })}
              </div>
            )}

            {currentQuestion.question_type === 'true_false' && (
              <div className="mt-6 grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:gap-4">
                {['Vrai', 'Faux'].map((label, idx) => {
                  const isSel = selectedAnswer === String(idx)
                  const canInteract = !answered && timeLeft > 0
                  return (
                    <button
                      key={label}
                      type="button"
                      disabled={!canInteract}
                      onClick={() =>
                        canInteract && void submitAnswerNow(false, String(idx))
                      }
                      className={`flex min-h-[5.5rem] items-center justify-center px-4 py-5 text-center text-2xl font-black sm:min-h-[7rem] sm:text-3xl ${liveMcqTileClass(idx, {
                        isSelected: isSel,
                        answered,
                        canInteract,
                      })}`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            )}

            <div className="mt-6 space-y-4 sm:mt-8">
              {!answered ? (
                <div className="space-y-2 text-center">
                  <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                    Touche une couleur pour répondre — envoi immédiat, un seul choix.
                  </p>
                  {String(session?.scoring_mode ?? 'classic') === 'speed' ? (
                    <p className="rounded-xl border border-amber-500/25 bg-amber-500/8 px-3 py-2 text-xs font-medium text-amber-950 dark:text-amber-100">
                      Mode <strong>vitesse</strong> : plus tu réponds vite, plus tu marques de points (jusqu’au
                      maximum de la question, ex. 1000 pts). En fin de chrono, une bonne réponse peut valoir
                      0&nbsp;pt.
                    </p>
                  ) : null}
                  {String(session?.scoring_mode ?? 'classic') === 'precision' ? (
                    <p className="rounded-xl border border-violet-500/25 bg-violet-500/8 px-3 py-2 text-xs font-medium text-violet-950 dark:text-violet-100">
                      Mode <strong>précision</strong> : réponds dans la première moitié du temps pour le plein
                      pot ; après, les points sont réduits même si c’est juste.
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-3">
                  {answerFeedback && (
                    <div
                      className={`live-feedback-pop rounded-xl border-2 p-4 text-center ${
                        answerFeedback.kind === 'submitted'
                          ? 'border-primary/40 bg-primary/10'
                          : answerFeedback.kind === 'timeout_wait'
                            ? 'border-amber-500/40 bg-amber-500/10'
                            : 'border-border bg-muted/40'
                      }`}
                    >
                      {answerFeedback.kind === 'submitted' && (
                        <>
                          <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-primary" />
                          <p className="text-lg font-bold text-foreground">Réponse enregistrée</p>
                          <p className="mt-2 text-sm text-muted-foreground">
                            Le bon résultat et les points seront visibles quand l’animateur affichera le
                            classement.
                          </p>
                        </>
                      )}
                      {answerFeedback.kind === 'timeout_wait' && (
                        <>
                          <Clock className="mx-auto mb-2 h-10 w-10 text-amber-600" />
                          <p className="text-lg font-bold text-amber-900 dark:text-amber-100">
                            Temps écoulé
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Aucune réponse enregistrée pour cette question.
                          </p>
                        </>
                      )}
                      {answerFeedback.kind === 'duplicate' && (
                        <p className="text-sm text-muted-foreground">
                          Réponse déjà enregistrée pour cette question.
                        </p>
                      )}
                    </div>
                  )}
                  <p className="text-center text-sm font-medium text-muted-foreground">
                    En attente du classement affiché par l’animateur…
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center p-6">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
}
