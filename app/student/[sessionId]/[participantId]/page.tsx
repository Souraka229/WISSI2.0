'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  fetchMergedSessionQuestions,
  sessionLiveFieldsChanged,
} from '@/lib/session-questions'
import {
  submitAnswer,
  addReaction,
  getSessionLeaderboard,
} from '@/app/actions/quiz'
import { Button } from '@/components/ui/button'
import {
  Loader2,
  Trophy,
  Users,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  Flame,
  Sparkles,
} from 'lucide-react'

type ParticipantRow = {
  id: string
  nickname: string
  score: number
  level: number
  streak?: number | null
}

type AnswerFeedback =
  | { kind: 'correct'; pointsEarned: number }
  | { kind: 'wrong'; pointsEarned: number }
  | { kind: 'timeout'; pointsEarned: number }
  | { kind: 'duplicate'; pointsEarned: number }

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
  const [onlineCount, setOnlineCount] = useState(1)
  const [answerFeedback, setAnswerFeedback] = useState<AnswerFeedback | null>(null)
  const [realtimeStatus, setRealtimeStatus] = useState<
    'connecting' | 'connected' | 'error'
  >('connecting')
  const questionKeyRef = useRef<string>('')
  const questionsRef = useRef<QuestionRow[]>([])

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

        if (se || !sessionData || cancelled) return

        const merged = await fetchMergedSessionQuestions(supabase, {
          quiz_id: sessionData.quiz_id,
          secondary_quiz_id: sessionData.secondary_quiz_id ?? null,
          game_mode: sessionData.game_mode,
        })

        if (cancelled) return
        setSession(sessionData as Record<string, unknown>)
        setQuestions(merged as QuestionRow[])
        await refreshMe()
        await refreshLeaderboard()
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
            const merged = questionsRef.current
            const limit = Math.max(5, Number(merged[newIdx]?.time_limit ?? 30))
            setTimeLeft(limit)
            setAnswered(false)
            setSelectedAnswer(null)
            setAnswerFeedback(null)
            questionKeyRef.current = String(newIdx)
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
  const qIndex = session ? Number(session.current_question_index ?? 0) : 0
  const currentQuestion = questions[qIndex]

  const handleSubmitAnswer = useCallback(
    async (fromTimeout = false) => {
      if (!currentQuestion || answered || status !== 'question') return

      setAnswered(true)
      const choice = fromTimeout ? null : selectedAnswer
      const isCorrect =
        choice !== null && String(choice) === String(currentQuestion.correct_answer)
      const limit = currentQuestion.time_limit ?? 30
      try {
        const res = await submitAnswer(
          participantId,
          sessionId,
          currentQuestion.id,
          choice === null ? 'timeout' : String(choice),
          isCorrect,
          Math.max(0, limit - timeLeft),
        )
        if (res && 'duplicate' in res && res.duplicate) {
          setAnswerFeedback({ kind: 'duplicate', pointsEarned: 0 })
        } else if (res && 'pointsEarned' in res) {
          if (fromTimeout || choice === null) {
            setAnswerFeedback({ kind: 'timeout', pointsEarned: res.pointsEarned })
          } else if (isCorrect) {
            setAnswerFeedback({ kind: 'correct', pointsEarned: res.pointsEarned })
          } else {
            setAnswerFeedback({ kind: 'wrong', pointsEarned: res.pointsEarned })
          }
        }
        await refreshMe()
        await refreshLeaderboard()
      } catch (e) {
        console.error(e)
        setAnswerFeedback({
          kind: fromTimeout || choice === null ? 'timeout' : isCorrect ? 'correct' : 'wrong',
          pointsEarned: 0,
        })
      }
    },
    [
      currentQuestion,
      answered,
      status,
      selectedAnswer,
      participantId,
      sessionId,
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
      setTimeLeft(currentQuestion?.time_limit ?? 30)
    }
  }, [qIndex, currentQuestion?.id, currentQuestion?.time_limit, status])

  useEffect(() => {
    if (status !== 'question' || answered || selectedAnswer === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        void handleSubmitAnswer(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [status, answered, selectedAnswer, handleSubmitAnswer])

  useEffect(() => {
    if (status !== 'question' || answered || !currentQuestion) return

    const t = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(t)
  }, [status, answered, currentQuestion?.id])

  useEffect(() => {
    if (status !== 'question' || answered || !currentQuestion) return
    if (timeLeft !== 0) return
    void handleSubmitAnswer(true)
  }, [timeLeft, status, answered, currentQuestion, handleSubmitAnswer])

  useEffect(() => {
    if (status === 'results') {
      void refreshLeaderboard()
      void refreshMe()
    }
  }, [status, refreshLeaderboard, refreshMe])

  const handleReaction = async (emoji: string) => {
    try {
      await addReaction(sessionId, participantId, emoji)
    } catch (e) {
      console.error(e)
    }
  }

  const liveRealtimeBadge = (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
        realtimeStatus === 'connected'
          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
          : realtimeStatus === 'error'
            ? 'bg-destructive/15 text-destructive'
            : 'bg-muted text-muted-foreground'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
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
          ? 'Déconnecté'
          : 'Connexion…'}
    </div>
  )

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-gradient-to-b from-primary/5 to-background px-8">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Connexion à la partie…</p>
        </div>
        <div className="h-2 w-48 max-w-full overflow-hidden rounded-full live-skeleton" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground">Session introuvable</p>
        <Button asChild variant="outline">
          <Link href="/join">Rejoindre une autre session</Link>
        </Button>
      </div>
    )
  }

  if (status === 'finished') {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-8 bg-gradient-to-b from-amber-500/15 via-background to-violet-500/10 p-6 text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="relative">
          <div className="absolute inset-0 blur-2xl bg-amber-400/30 rounded-full scale-150" aria-hidden />
          <Trophy className="relative h-20 w-20 text-amber-500 drop-shadow-lg" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight">Bravo !</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            <span className="font-semibold text-foreground">{me?.nickname}</span> —{' '}
            <span className="tabular-nums font-bold text-primary">{me?.score ?? 0} pts</span>
            <span className="text-muted-foreground"> · niveau {me?.level ?? 1}</span>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Rang final #{myRank ?? '—'} dans cette session
          </p>
        </div>
        <Button asChild size="lg" className="min-w-[200px]">
          <Link href="/join">Rejouer une autre partie</Link>
        </Button>
      </div>
    )
  }

  if (status === 'waiting') {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-b from-primary/15 via-background to-violet-500/5 px-4 py-8">
        <div className="mx-auto max-w-md space-y-8 pt-10 text-center animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/90 px-4 py-2 text-sm shadow-md backdrop-blur-sm">
              <Users className="h-4 w-4 text-primary" />
              <span className="font-medium">{onlineCount} connecté(s)</span>
            </div>
            {liveRealtimeBadge}
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight">Salle d’attente</h1>
            <p className="mt-3 text-muted-foreground">
              Salut <strong className="text-foreground">{me?.nickname}</strong> — le prof lance la partie
              quand tout le monde est prêt.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 text-left shadow-lg ring-1 ring-primary/5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Votre profil
            </p>
            <p className="mt-3 text-lg font-bold tabular-nums">
              Rang #{myRank ?? '—'} · Nv. {me?.level ?? 1} · {me?.score ?? 0} pts
            </p>
            {typeof me?.streak === 'number' && me.streak > 0 && (
              <p className="mt-2 flex items-center gap-1 text-sm font-medium text-orange-600 dark:text-orange-400">
                <Flame className="h-4 w-4" /> Série : {me.streak} bonne(s) réponse(s) d’affilée
              </p>
            )}
          </div>
          <p className="text-sm font-medium text-muted-foreground live-waiting-pulse">
            En attente du lancement…
          </p>
        </div>
      </div>
    )
  }

  if (status === 'results') {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-b from-violet-500/10 via-background to-background px-4 pb-28 pt-6 animate-in zoom-in-95 duration-300">
        <header className="mx-auto mb-6 flex max-w-lg flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 shrink-0 text-violet-500" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">Temps réel</p>
              <p className="text-lg font-black">TOP 5</p>
            </div>
          </div>
          {liveRealtimeBadge}
          <div className="text-right text-sm">
            <p className="font-semibold text-primary">Vous</p>
            <p className="tabular-nums">
              #{myRank ?? '—'} · Nv.{me?.level ?? 1} · {me?.score ?? 0} pts
            </p>
          </div>
        </header>

        <ol className="mx-auto max-w-lg space-y-3">
          {leaderboard.map((row, i) => {
            const medal =
              row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : null
            const isMe = row.id === participantId
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
                key={row.rank + row.nickname}
                className={`flex animate-in fade-in slide-in-from-left-2 items-center justify-between rounded-2xl border-2 px-4 py-3 duration-300 ${base} ${
                  isMe ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.02]' : ''
                }`}
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center text-lg font-bold">
                    {medal ?? <span className="text-sm text-muted-foreground">#{row.rank}</span>}
                  </span>
                  <span className={`font-medium ${isMe ? 'text-primary' : ''}`}>{row.nickname}</span>
                </span>
                <span className="shrink-0 text-sm font-bold tabular-nums">
                  {row.score} pts · Nv.{row.level}
                </span>
              </li>
            )
          })}
        </ol>

        <div className="mx-auto mt-10 max-w-lg rounded-xl border border-dashed border-primary/25 bg-primary/5 p-4 text-center text-sm text-muted-foreground">
          L’animateur envoie la prochaine question quand c’est bon pour la classe.
        </div>

        <div className="pointer-events-none fixed bottom-4 left-0 right-0 flex flex-wrap justify-center gap-2 px-4">
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
    const timeLimit = Math.max(5, Number(currentQuestion.time_limit ?? 30))
    const timeRatio = timeLimit > 0 ? timeLeft / timeLimit : 0
    const correctIdx = Number(currentQuestion.correct_answer)

    return (
      <div className="min-h-[100dvh] bg-gradient-to-b from-emerald-500/5 via-background to-muted/25 pb-36">
        <header className="sticky top-0 z-40 border-b border-border bg-card/95 shadow-sm backdrop-blur-md pt-[env(safe-area-inset-top,0px)]">
          <div className="mx-auto max-w-lg px-4 pt-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Question {qIndex + 1} / {questions.length}
                </p>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/40 transition-all duration-700 ease-out"
                    style={{
                      width: `${((qIndex + 1) / Math.max(questions.length, 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <div
                className={`flex shrink-0 items-center gap-1 rounded-xl border-2 px-3 py-1.5 tabular-nums ${
                  timeLeft <= 5
                    ? 'border-destructive/60 bg-destructive/10 text-destructive'
                    : 'border-border bg-muted/50 text-foreground'
                }`}
              >
                <Clock className="h-4 w-4 opacity-70" />
                <span className={`text-xl font-black ${timeLeft <= 5 ? 'animate-pulse' : ''}`}>
                  {timeLeft}s
                </span>
              </div>
            </div>
            <div
              className="mt-2 h-1 overflow-hidden rounded-full bg-muted/80"
              aria-hidden
            >
              <div
                className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${
                  timeLeft <= 5 ? 'bg-destructive' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.max(0, Math.min(100, timeRatio * 100))}%` }}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 px-4 py-2.5 text-xs">
            <span className="flex flex-wrap items-center gap-2 text-muted-foreground">
              <Users className="mr-1 inline h-3 w-3" />
              {onlineCount} en ligne
              {liveRealtimeBadge}
            </span>
            <span className="tabular-nums">
              Rang <strong className="text-primary">#{myRank ?? '—'}</strong> · Nv.{me?.level ?? 1} ·{' '}
              {me?.score ?? 0} pts
            </span>
            {typeof me?.streak === 'number' && me.streak > 0 && (
              <span className="flex items-center gap-0.5 font-semibold text-orange-600 dark:text-orange-400">
                <Flame className="h-3.5 w-3.5" />
                {me.streak}
              </span>
            )}
          </div>
        </header>

        <main className="mx-auto max-w-lg px-4 py-6">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-lg ring-1 ring-black/5 dark:ring-white/10 animate-in fade-in slide-in-from-bottom-3 duration-300">
            <h2 className="text-balance text-xl font-bold leading-snug sm:text-2xl">
              {currentQuestion.question_text}
            </h2>

            {currentQuestion.question_type === 'mcq' && Array.isArray(currentQuestion.options) && (
              <div className="mt-6 grid grid-cols-1 gap-3">
                {currentQuestion.options.map((option: string, idx: number) => {
                  const isSel = selectedAnswer === String(idx)
                  const isCor = idx === correctIdx
                  let reveal = ''
                  if (answered) {
                    if (isCor) {
                      reveal =
                        'border-emerald-500 bg-emerald-500/15 text-emerald-900 dark:text-emerald-100'
                    } else if (isSel && !isCor) {
                      reveal = 'border-destructive bg-destructive/10'
                    } else {
                      reveal = 'opacity-45'
                    }
                  }
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={answered}
                      onClick={() => !answered && setSelectedAnswer(String(idx))}
                      className={`rounded-xl border-2 px-4 py-4 text-left text-sm font-medium transition-all active:scale-[0.98] ${
                        !answered && isSel
                          ? 'border-primary bg-primary/15 shadow-md'
                          : !answered
                            ? 'border-border bg-background hover:border-primary/35'
                            : ''
                      } ${reveal}`}
                    >
                      <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-current text-xs font-bold">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      {option}
                      {answered && isCor && (
                        <CheckCircle2 className="ml-2 inline h-4 w-4 text-emerald-600" />
                      )}
                      {answered && isSel && !isCor && (
                        <XCircle className="ml-2 inline h-4 w-4 text-destructive" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {currentQuestion.question_type === 'true_false' && (
              <div className="mt-6 grid grid-cols-2 gap-3">
                {['Vrai', 'Faux'].map((label, idx) => {
                  const isSel = selectedAnswer === String(idx)
                  const isCor = idx === correctIdx
                  let reveal = ''
                  if (answered) {
                    if (isCor) {
                      reveal =
                        'border-emerald-500 bg-emerald-500/15 text-emerald-900 dark:text-emerald-100'
                    } else if (isSel && !isCor) {
                      reveal = 'border-destructive bg-destructive/10'
                    } else {
                      reveal = 'opacity-45'
                    }
                  }
                  return (
                    <button
                      key={label}
                      type="button"
                      disabled={answered}
                      onClick={() => !answered && setSelectedAnswer(String(idx))}
                      className={`rounded-xl border-2 py-4 text-center text-base font-bold transition-all ${
                        !answered && isSel ? 'border-primary bg-primary/15' : !answered ? 'border-border' : ''
                      } ${reveal}`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            )}

            {!answered && (
              <div className="mt-6 flex flex-wrap justify-center gap-2 border-t border-border pt-4">
                {['🔥', '👏', '😂', '🎉', '💡'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => void handleReaction(emoji)}
                    className="text-2xl transition-transform hover:scale-125 active:scale-95"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-6 space-y-4">
              {!answered ? (
                <>
                  <Button
                    className="h-12 w-full gap-2 text-base font-bold shadow-md"
                    disabled={selectedAnswer === null}
                    onClick={() => void handleSubmitAnswer(false)}
                  >
                    <Zap className="h-5 w-5" />
                    Valider (ou Entrée)
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    Choisis une réponse puis valide — le chrono compte.
                  </p>
                </>
              ) : (
                <div className="space-y-3">
                  {answerFeedback && (
                    <div
                      className={`live-feedback-pop rounded-xl border-2 p-4 text-center ${
                        answerFeedback.kind === 'correct'
                          ? 'border-emerald-500/50 bg-emerald-500/10'
                          : answerFeedback.kind === 'wrong'
                            ? 'border-destructive/40 bg-destructive/10'
                            : answerFeedback.kind === 'timeout'
                              ? 'border-amber-500/40 bg-amber-500/10'
                              : 'border-border bg-muted/40'
                      }`}
                    >
                      {answerFeedback.kind === 'correct' && (
                        <>
                          <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-emerald-600" />
                          <p className="text-lg font-black text-emerald-800 dark:text-emerald-200">
                            Bonne réponse !
                          </p>
                          <p className="mt-1 text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                            +{answerFeedback.pointsEarned} points
                          </p>
                        </>
                      )}
                      {answerFeedback.kind === 'wrong' && (
                        <>
                          <XCircle className="mx-auto mb-2 h-10 w-10 text-destructive" />
                          <p className="text-lg font-bold text-destructive">Pas tout à fait…</p>
                          <p className="mt-1 text-sm text-muted-foreground">Pas de point cette fois.</p>
                        </>
                      )}
                      {answerFeedback.kind === 'timeout' && (
                        <>
                          <Clock className="mx-auto mb-2 h-10 w-10 text-amber-600" />
                          <p className="text-lg font-bold text-amber-800 dark:text-amber-200">
                            Temps écoulé
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">Réponse non prise en compte.</p>
                        </>
                      )}
                      {answerFeedback.kind === 'duplicate' && (
                        <p className="text-sm text-muted-foreground">
                          Réponse déjà enregistrée pour cette question.
                        </p>
                      )}
                    </div>
                  )}
                  {typeof currentQuestion.explanation === 'string' &&
                    currentQuestion.explanation.trim().length > 0 && (
                      <div className="rounded-lg border border-border bg-muted/40 px-3 py-3 text-sm leading-relaxed text-muted-foreground">
                        <span className="font-semibold text-foreground">Pourquoi ? </span>
                        {currentQuestion.explanation}
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
