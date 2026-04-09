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
import {
  addReaction,
  submitAnswer,
  useLivePower,
  getBossFightSnapshot,
  type LivePowerType,
} from '@/app/actions/quiz'
import { SessionLiveStickers } from '@/components/live/session-live-stickers'
import { Button } from '@/components/ui/button'
import {
  Loader2,
  Trophy,
  Users,
  CheckCircle2,
  Clock,
  Flame,
  Snowflake,
  Bomb,
  Shield,
  Shuffle,
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
  const [others, setOthers] = useState<{ id: string; nickname: string }[]>([])
  const [bossHp, setBossHp] = useState<{ hp: number; maxHp: number } | null>(null)
  const [powers, setPowers] = useState<LivePowerType[]>([])
  const [shieldActive, setShieldActive] = useState(false)
  const [frozenUntil, setFrozenUntil] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [answered, setAnswered] = useState(false)
  const [timeLeft, setTimeLeft] = useState(30)
  const [recentReactions, setRecentReactions] = useState<string[]>([])
  const [reactionLeft, setReactionLeft] = useState(3)
  const [onlineCount, setOnlineCount] = useState(1)
  const [answerFeedback, setAnswerFeedback] = useState<AnswerFeedback | null>(null)
  const [doubleOrNothing, setDoubleOrNothing] = useState(false)
  const [isEliminated, setIsEliminated] = useState(false)
  const [realtimeStatus, setRealtimeStatus] = useState<
    'connecting' | 'connected' | 'error'
  >('connecting')
  const questionKeyRef = useRef<string>('')
  const questionsRef = useRef<QuestionRow[]>([])

  useEffect(() => {
    questionsRef.current = questions
  }, [questions])

  const refreshOthers = useCallback(async () => {
    const { data } = await supabase
      .from('participants')
      .select('id, nickname')
      .eq('session_id', sessionId)
      .neq('id', participantId)
      .order('nickname', { ascending: true })
    setOthers((data ?? []) as { id: string; nickname: string }[])
  }, [participantId, sessionId, supabase])

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
          await Promise.all([refreshMe(), refreshOthers()])
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
        await Promise.all([refreshMe(), refreshOthers()])
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
        () => void refreshMe(),
      )
      .on(
        'broadcast',
        { event: 'power_used' },
        (payload) => {
          const p = payload.payload as {
            type?: LivePowerType
            byParticipantId?: string
            targetParticipantId?: string | null
          }
          if (p.byParticipantId === participantId) return
          if (p.targetParticipantId && p.targetParticipantId !== participantId) return
          if (p.type === 'freeze') {
            if (shieldActive) {
              setShieldActive(false)
              return
            }
            setFrozenUntil(Date.now() + 5000)
          }
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
  }, [sessionId, participantId, refreshMe, refreshOthers, shieldActive])
  useEffect(() => {
    if (sessionGameMode !== 'hackathon') {
      setBossHp(null)
      return
    }
    let cancelled = false
    const run = async () => {
      const r = await getBossFightSnapshot(sessionId)
      if (!cancelled && r.ok) setBossHp({ hp: r.hp, maxHp: r.maxHp })
    }
    void run()
    const t = window.setInterval(() => void run(), 2000)
    return () => {
      cancelled = true
      window.clearInterval(t)
    }
  }, [sessionGameMode, sessionId, qIndex])

  const status = session ? String(session.status) : ''
  const sessionGameMode = session ? String(session.game_mode ?? '') : ''
  const qIndex = session ? Number(session.current_question_index ?? 0) : 0
  const currentQuestion = questions[qIndex]

  const reactionsEnabled = Boolean((session as any)?.reactions_enabled ?? true)
  const REACTION_EMOJIS = ['🔥', '😱', '💀', '🤯', '⚡', '😂', '🎯', '💪'] as const

  useEffect(() => {
    setReactionLeft(3)
  }, [status, qIndex])

  useEffect(() => {
    if (status !== 'question' || sessionGameMode !== 'prof_dual') {
      setIsEliminated(false)
      return
    }
    let cancelled = false
    void (async () => {
      const { data } = await supabase
        .from('answers')
        .select('is_correct, answer')
        .eq('session_id', sessionId)
        .eq('participant_id', participantId)
      if (cancelled) return
      const eliminated = (data ?? []).some(
        (a) => a.is_correct === false || String(a.answer ?? '') === 'timeout',
      )
      setIsEliminated(eliminated)
    })()
    return () => {
      cancelled = true
    }
  }, [participantId, qIndex, sessionGameMode, sessionId, status, supabase])

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

  const submitAnswerNow = useCallback(
    async (fromTimeout: boolean, choiceOverride?: string | null) => {
      if (!currentQuestion || answered || status !== 'question') return
      if (sessionGameMode === 'prof_dual' && isEliminated) return

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
          { doubleOrNothing: !fromTimeout && Boolean(doubleOrNothing) },
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
        if (!fromTimeout && isCorrect && timeTaken <= 8) {
          const all: LivePowerType[] = ['freeze', 'bomb', 'shield', 'swap']
          const granted = all[Math.floor(Math.random() * all.length)]
          setPowers((prev) => [...prev.slice(-2), granted])
        }
        await refreshMe()
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
      doubleOrNothing,
      isEliminated,
      refreshMe,
      sessionGameMode,
    ],
  )

  useEffect(() => {
    const key = `${qIndex}-${currentQuestion?.id ?? ''}-${status}`
    if (key !== questionKeyRef.current) {
      questionKeyRef.current = key
      setSelectedAnswer(null)
      setAnswered(false)
      setAnswerFeedback(null)
      setDoubleOrNothing(false)
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

  const freezeSecondsLeft =
    frozenUntil > Date.now() ? Math.ceil((frozenUntil - Date.now()) / 1000) : 0

  const applyPower = useCallback(
    async (type: LivePowerType) => {
      if (!session) return
      if (powers.length === 0) return
      const targetId = others[0]?.id ?? null
      const result = await useLivePower({
        sessionId,
        participantId,
        type,
        targetParticipantId: type === 'freeze' ? targetId : null,
      })
      if (!result.ok) return

      if (type === 'shield') setShieldActive(true)
      setPowers((prev) => {
        const idx = prev.indexOf(type)
        if (idx < 0) return prev
        const next = [...prev]
        next.splice(idx, 1)
        return next
      })

      const channel = supabase.channel(`student-live-${sessionId}-${participantId}`)
      await channel.subscribe()
      await channel.send({
        type: 'broadcast',
        event: 'power_used',
        payload: { type, byParticipantId: participantId, targetParticipantId: targetId },
      })
      await supabase.removeChannel(channel)
      void refreshMe()
    },
    [others, participantId, powers, refreshMe, session, sessionId, supabase],
  )

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
        <Button asChild size="lg" variant="outline" className="min-h-12 w-full max-w-xs touch-manipulation">
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
            Session terminée · score final <span className="tabular-nums font-black">{me?.score ?? 0}</span>
          </p>
        </div>
        <Button asChild size="lg" className="relative min-h-14 w-full max-w-xs touch-manipulation text-base font-bold shadow-lg">
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
              <p className="text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">Transition</p>
              <p className="text-2xl font-black tracking-tight sm:text-3xl">Question suivante</p>
              <p className="mt-1 max-w-[240px] text-xs leading-snug text-muted-foreground sm:max-w-none">
                Analyse en cours, reste prêt.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
            <SessionLiveStickers gameMode={sessionGameMode} className="sm:order-first" />
            {liveRealtimeBadge}
            <div className="rounded-2xl border border-primary/25 bg-primary/5 px-4 py-2.5 text-right sm:min-w-[9rem]">
              <p className="text-[10px] font-bold uppercase tracking-wide text-primary">Toi</p>
              <p className="text-sm font-bold tabular-nums sm:text-base">Nv.{me?.level ?? 1}</p>
              <p className="text-xs font-semibold tabular-nums text-muted-foreground">{me?.score ?? 0} pts</p>
            </div>
          </div>
        </header>

        <div className="mx-auto mt-8 max-w-lg rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4 text-center text-sm leading-relaxed text-muted-foreground sm:mt-10 sm:max-w-2xl sm:p-5">
          La suite est lancée par l’animateur.
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

            {sessionGameMode === 'prof_dual' && isEliminated ? (
              <div className="mt-6 rounded-2xl border border-border bg-muted/30 p-4 text-center">
                <p className="text-sm font-semibold text-foreground">
                  Tu es éliminé pour cette manche Battle Royale.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tu restes en mode spectateur et tu peux continuer à réagir.
                </p>
              </div>
            ) : null}

            {freezeSecondsLeft > 0 && (
              <div className="mt-4 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-900 dark:text-sky-100">
                Timer gelé par un adversaire pendant {freezeSecondsLeft}s.
              </div>
            )}

            {!isEliminated && (
              <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-3">
                <label className="flex cursor-pointer items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-foreground">Double or Nothing</span>
                  <input
                    type="checkbox"
                    checked={doubleOrNothing}
                    onChange={(e) => setDoubleOrNothing(e.target.checked)}
                    disabled={answered || timeLeft <= 0}
                    className="h-4 w-4"
                  />
                </label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Bonne réponse: points x2. Mauvaise réponse: score divisé par 2.
                </p>
              </div>
            )}

            {bossHp && (
              <div className="mt-4 rounded-2xl border border-destructive/25 bg-destructive/5 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-destructive">Boss HP</p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-destructive transition-all duration-500"
                    style={{ width: `${Math.max(0, Math.min(100, (bossHp.hp / bossHp.maxHp) * 100))}%` }}
                  />
                </div>
                <p className="mt-1 text-xs font-semibold text-foreground">
                  {bossHp.hp} / {bossHp.maxHp}
                </p>
              </div>
            )}

            {powers.length > 0 && !isEliminated && (
              <div className="mt-4 rounded-2xl border border-border bg-muted/20 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Pouvoirs</p>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {powers.map((p, i) => (
                    <button
                      key={`${p}-${i}`}
                      type="button"
                      className="rounded-lg border border-border bg-background px-2 py-2 text-xs font-semibold"
                      onClick={() => void applyPower(p)}
                    >
                      <span className="inline-flex items-center gap-1">
                        {p === 'freeze' && <Snowflake className="h-3.5 w-3.5" />}
                        {p === 'bomb' && <Bomb className="h-3.5 w-3.5" />}
                        {p === 'shield' && <Shield className="h-3.5 w-3.5" />}
                        {p === 'swap' && <Shuffle className="h-3.5 w-3.5" />}
                        {p}
                      </span>
                    </button>
                  ))}
                </div>
                {shieldActive && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Shield actif: le prochain sabotage est annulé.
                  </p>
                )}
              </div>
            )}

            {currentQuestion.question_type === 'mcq' && Array.isArray(currentQuestion.options) && !isEliminated && (
              <div className="mt-6 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4">
                {currentQuestion.options.map((option: string, idx: number) => {
                  const nOpts = currentQuestion.options!.length
                  const isSel = selectedAnswer === String(idx)
                  const canInteract = !answered && timeLeft > 0 && freezeSecondsLeft <= 0
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

            {currentQuestion.question_type === 'true_false' && !isEliminated && (
              <div className="mt-6 grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:gap-4">
                {['Vrai', 'Faux'].map((label, idx) => {
                  const isSel = selectedAnswer === String(idx)
                  const canInteract = !answered && timeLeft > 0 && freezeSecondsLeft <= 0
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
