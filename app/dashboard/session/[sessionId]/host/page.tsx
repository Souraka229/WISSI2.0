'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  hostControlSession,
  getHostQuestionLiveOverview,
  setSessionAutoAdvance,
  getBossFightSnapshot,
  type HostControlAction,
  type HostQuestionLiveRow,
} from '@/app/actions/quiz'
import {
  fetchMergedSessionQuestions,
  sessionLiveFieldsChanged,
} from '@/lib/session-questions'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { JoinQrCode } from '@/components/join-qr-code'
import { SessionLiveStickers } from '@/components/live/session-live-stickers'
import { liveModeLabel } from '@/lib/game-mode-live'
import {
  ArrowLeft,
  Loader2,
  Play,
  SkipForward,
  Users,
  Square,
  HelpCircle,
  Timer,
  Minus,
  ClipboardList,
  FastForward,
} from 'lucide-react'

const AUTO_NEXT_QUESTION_MS = 3500

const STATUS_FR: Record<string, string> = {
  waiting: 'Salle d’attente',
  active: 'Partie active',
  question: 'Question en cours',
  results: 'Transition',
  finished: 'Partie terminée',
}

export default function HostSessionPage() {
  const params = useParams()
  const sessionId = params.sessionId as string
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const [session, setSession] = useState<Record<string, unknown> | null>(null)
  const [quizTitle, setQuizTitle] = useState('')
  const [questionCount, setQuestionCount] = useState(0)
  const [questions, setQuestions] = useState<
    { id: string; question_text: string; question_type?: string; correct_answer?: string; options?: string[] }[]
  >([])
  const [participantCount, setParticipantCount] = useState(0)
  const [bossHp, setBossHp] = useState<{ hp: number; maxHp: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successHint, setSuccessHint] = useState<string | null>(null)
  const [realtimeStatus, setRealtimeStatus] = useState<
    'connecting' | 'connected' | 'error'
  >('connecting')
  const [questionOverview, setQuestionOverview] = useState<
    HostQuestionLiveRow[] | null
  >(null)
  const [autoAdvancePending, setAutoAdvancePending] = useState(false)

  const sessionRef = useRef<Record<string, unknown> | null>(null)
  const questionsRef = useRef<
    {
      id: string
      question_text: string
      question_type?: string
      correct_answer?: string
      options?: string[]
    }[]
  >([])
  sessionRef.current = session
  questionsRef.current = questions

  const refreshQuestionOverview = useCallback(async () => {
    const s = sessionRef.current
    const qs = questionsRef.current
    if (String(s?.status ?? '') !== 'question') return
    const qi = Number(s?.current_question_index ?? 0)
    const q = qs[qi]
    if (!q?.id) return
    const res = await getHostQuestionLiveOverview(sessionId, q.id)
    if (res.ok) setQuestionOverview(res.rows)
  }, [sessionId])

  const showHint = useCallback((msg: string) => {
    setSuccessHint(msg)
    window.setTimeout(() => setSuccessHint(null), 3000)
  }, [])

  const refreshParticipantCount = useCallback(async () => {
    const { count } = await supabase
      .from('participants')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId)
    setParticipantCount(count ?? 0)
  }, [sessionId, supabase])

  const refreshBossHp = useCallback(async () => {
    if (String(sessionRef.current?.game_mode ?? '') !== 'hackathon') {
      setBossHp(null)
      return
    }
    const res = await getBossFightSnapshot(sessionId)
    if (res.ok) {
      setBossHp({ hp: res.hp, maxHp: res.maxHp })
    }
  }, [sessionId])

  /** Commandes déclenchées par le timer (sans bloquer tout le pupitre). */
  const runSilent = useCallback(
    async (action: HostControlAction) => {
      try {
        const result = await hostControlSession(sessionId, action)
        if (!result.ok) {
          setError(result.error)
          return
        }
        await refreshParticipantCount()
        await refreshBossHp()
      } catch (e) {
        console.error(e)
        setError('Une étape automatique a échoué — repassez en manuel ou rafraîchissez.')
      }
    },
    [sessionId, refreshBossHp, refreshParticipantCount],
  )

  useEffect(() => {
    if (!session || !Boolean(session.auto_advance)) return
    const st = String(session.status)
    if (st !== 'question') return

    const deadlineRaw = session.question_deadline_at
    if (typeof deadlineRaw !== 'string' || !deadlineRaw) return

    const deadlineMs = new Date(deadlineRaw).getTime()
    if (Number.isNaN(deadlineMs)) return

    const tick = () => {
      if (!Boolean(sessionRef.current?.auto_advance)) return
      if (String(sessionRef.current?.status) !== 'question') return
      if (Date.now() < deadlineMs) return
      void runSilent('next_question')
    }

    const id = window.setInterval(tick, 400)
    tick()
    return () => {
      window.clearInterval(id)
    }
  }, [
    session?.auto_advance,
    session?.status,
    session?.current_question_index,
    session?.question_deadline_at,
    runSilent,
  ])

  useEffect(() => {
    if (!session || !Boolean(session.auto_advance)) return
    if (String(session.status) !== 'results') return

    const t = window.setTimeout(() => {
      if (String(sessionRef.current?.status) !== 'results') return
      if (!Boolean(sessionRef.current?.auto_advance)) return
      void runSilent('next_question')
    }, AUTO_NEXT_QUESTION_MS)

    return () => window.clearTimeout(t)
  }, [session?.auto_advance, session?.status, session?.current_question_index, runSilent])

  useEffect(() => {
    if (String(session?.status ?? '') !== 'question') {
      setQuestionOverview(null)
    }
  }, [session?.status])

  useEffect(() => {
    if (String(session?.status ?? '') !== 'question') return
    const qi = Number(session?.current_question_index ?? 0)
    const q = questions[qi]
    if (!q?.id) return
    setQuestionOverview(null)
    void refreshQuestionOverview()
    const t = window.setInterval(() => void refreshQuestionOverview(), 2800)
    return () => window.clearInterval(t)
  }, [
    session?.status,
    session?.current_question_index,
    questions,
    refreshQuestionOverview,
  ])

  useEffect(() => {
    let cancelled = false
    let overviewDebounce: ReturnType<typeof setTimeout> | null = null

    const scheduleQuestionOverview = () => {
      if (overviewDebounce) clearTimeout(overviewDebounce)
      overviewDebounce = setTimeout(() => {
        overviewDebounce = null
        void refreshQuestionOverview()
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
        await refreshParticipantCount()
        await refreshBossHp()
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    const sessionCh = supabase
      .channel(`host-${sessionId}`, {
        config: { broadcast: { ack: true } },
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          if (cancelled) return
          const newSession = payload.new as Record<string, unknown>
          setSession((prev) => {
            if (!prev || sessionLiveFieldsChanged(prev, newSession)) {
              return newSession
            }
            return prev
          })
          void refreshParticipantCount()
          void refreshBossHp()
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
          if (!cancelled) void refreshParticipantCount()
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'answers',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          if (!cancelled) {
            scheduleQuestionOverview()
            void refreshBossHp()
          }
        },
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[HOST] ✅ Realtime connecté')
          if (!cancelled) setRealtimeStatus('connected')
        }
        if (err) console.error('[HOST] ❌ Realtime erreur', err)
        if (err || status === 'CHANNEL_ERROR') {
          if (!cancelled) setRealtimeStatus('error')
        }
      })

    void init()

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
      // Secours si Realtime « participants » n’est pas publié : liste à jour toutes les 4 s en salle d’attente.
      if (String(next.status ?? '') === 'waiting') {
        void refreshParticipantCount()
      }
    }, 4000)

    return () => {
      cancelled = true
      if (overviewDebounce) clearTimeout(overviewDebounce)
      window.clearInterval(pollId)
      void supabase.removeChannel(sessionCh)
    }
  }, [sessionId, refreshParticipantCount, refreshQuestionOverview, refreshBossHp])

  const onAutoAdvanceChange = async (checked: boolean) => {
    setAutoAdvancePending(true)
    setError(null)
    try {
      const r = await setSessionAutoAdvance(sessionId, checked)
      if (!r.ok) {
        setError(r.error)
        return
      }
      setSession((prev) =>
        prev ? { ...prev, auto_advance: checked } : prev,
      )
      showHint(
        checked
          ? 'Défilement auto activé.'
          : 'Défilement automatique désactivé.',
      )
    } finally {
      setAutoAdvancePending(false)
    }
  }

  const run = async (action: HostControlAction) => {
    setBusy(true)
    setError(null)
    setSuccessHint(null)
    try {
      const result = await hostControlSession(sessionId, action)
      if (!result.ok) {
        setError(result.error)
        return
      }
      await refreshParticipantCount()
      await refreshBossHp()
      const hints: Partial<Record<HostControlAction, string>> = {
        start: 'La partie est lancée — les élèves voient la 1ʳᵉ question.',
        next_question: 'Étape suivante envoyée.',
        end: 'Session terminée.',
        timer_cut: 'Temps de question terminé pour tous les élèves.',
        timer_subtract_10: 'Chrono réduit de 10 secondes.',
      }
      const h = hints[action]
      if (h) showHint(h)
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
  const mode = liveModeLabel(session.game_mode as string | null | undefined)
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
    <div className="min-h-[100dvh] bg-gradient-to-b from-violet-500/[0.06] via-background to-muted/25 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 shadow-sm backdrop-blur-lg pt-[env(safe-area-inset-top,0px)]">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-2 px-3 py-3 sm:flex-nowrap sm:gap-3 sm:px-5">
          <Button variant="ghost" size="icon" className="shrink-0 touch-manipulation" asChild>
            <Link href="/dashboard" aria-label="Retour">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1 basis-[min(100%,12rem)] sm:basis-auto">
            <h1 className="truncate text-base font-bold sm:text-lg">Pupitre animateur</h1>
            <div className="mt-1.5">
              <SessionLiveStickers gameMode={String(session.game_mode ?? '')} size="sm" />
            </div>
            <p className="mt-1 truncate text-[11px] text-muted-foreground sm:text-xs">
              {quizTitle} · {mode}
            </p>
          </div>
          <div
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium ${
              realtimeStatus === 'connected'
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                : realtimeStatus === 'error'
                  ? 'bg-destructive/15 text-destructive'
                  : 'bg-muted text-muted-foreground'
            }`}
          >
            <div
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
          className={`rounded-2xl border-2 p-4 shadow-md transition-colors sm:rounded-3xl sm:p-6 ${statusTone}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide opacity-80">
                État en direct
              </p>
              <p className="mt-1 text-xl font-black sm:text-2xl">{statusFr}</p>
              <p className="mt-2 text-sm opacity-90">
                Question <span className="font-mono font-bold">{Math.min(idx + 1, questionCount)}</span>{' '}
                / {questionCount || '—'} · PIN{' '}
                <span className="font-mono font-bold tracking-wider">{String(session.pin_code)}</span>
              </p>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 text-xs font-medium text-foreground sm:hidden">
              <Users className="h-3.5 w-3.5" />
              {participantCount}
            </div>
          </div>
        </section>

        {status !== 'finished' && (
          <section className="flex flex-col gap-3 rounded-2xl border border-violet-500/25 bg-violet-500/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600/15 text-violet-700 dark:text-violet-300">
                <FastForward className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Défilement automatique</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Après la fin du chrono : passage automatique à la question suivante (~{(AUTO_NEXT_QUESTION_MS / 1000).toFixed(1)}s).
              </p>
              </div>
            </div>
            <div className="flex items-center gap-3 sm:shrink-0">
              <span className="text-sm font-medium text-muted-foreground">
                {Boolean(session.auto_advance) ? 'Activé' : 'Désactivé'}
              </span>
              <Switch
                checked={Boolean(session.auto_advance)}
                disabled={autoAdvancePending}
                onCheckedChange={(v) => void onAutoAdvanceChange(v)}
                aria-label="Activer le défilement automatique"
              />
            </div>
          </section>
        )}

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

        {String(session.game_mode ?? '') === 'hackathon' && bossHp && (
          <section className="rounded-2xl border border-destructive/25 bg-destructive/5 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-destructive">Boss HP</p>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-destructive transition-all duration-500"
                style={{ width: `${Math.max(0, Math.min(100, (bossHp.hp / bossHp.maxHp) * 100))}%` }}
              />
            </div>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {bossHp.hp} / {bossHp.maxHp} HP
            </p>
          </section>
        )}

        {status === 'question' && currentQ && (
          <section className="rounded-2xl border border-border bg-card p-5 shadow-md">
            <div className="mb-3 flex items-center gap-2">
              <ClipboardList className="h-5 w-5 shrink-0 text-primary" />
              <div>
                <h3 className="font-bold leading-tight">Suivi par élève</h3>
                <p className="text-xs text-muted-foreground">
                  Question actuelle : qui a répondu, erreur ou temps écoulé.
                </p>
              </div>
            </div>
            {questionOverview === null ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement du suivi…
              </p>
            ) : questionOverview.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun participant pour l’instant.</p>
            ) : (
              <ul className="max-h-64 divide-y divide-border overflow-y-auto rounded-lg border border-border">
                {questionOverview.map((row) => (
                  <li
                    key={row.participantId}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm"
                  >
                    <span className="min-w-0 truncate font-medium">{row.nickname}</span>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        row.status === 'waiting'
                          ? 'bg-muted text-muted-foreground'
                          : row.status === 'correct'
                            ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
                            : row.status === 'wrong'
                              ? 'bg-destructive/15 text-destructive'
                              : 'bg-amber-500/15 text-amber-900 dark:text-amber-100'
                      }`}
                    >
                      {row.status === 'waiting' && 'En attente'}
                      {row.status === 'correct' && 'Bonne réponse'}
                      {row.status === 'wrong' &&
                        (row.answerLabel
                          ? `Erreur · choix ${row.answerLabel}`
                          : 'Mauvaise réponse')}
                      {row.status === 'timeout' && 'Temps écoulé'}
                    </span>
                  </li>
                ))}
              </ul>
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
              className="h-14 w-full touch-manipulation gap-2 text-base font-bold shadow-lg shadow-primary/25 sm:h-16 sm:text-lg"
              disabled={busy || questionCount === 0}
              onClick={() => void run('start')}
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
              Démarrer la partie
            </Button>
          </div>
        )}

        {status === 'active' && (
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              variant="outline"
              className="h-12 flex-1 gap-2"
              disabled={busy}
              onClick={() => void run('next_question')}
            >
              <SkipForward className="h-4 w-4" />
              Question suivante
            </Button>
          </div>
        )}

        {status === 'question' && (
          <div className="space-y-3">
            <p className="text-center text-xs text-muted-foreground">
              Chrono synchronisé avec les élèves : vous pouvez le raccourcir ou le couper.
              {Boolean(session.auto_advance) && (
                <span className="mt-1 block font-medium text-violet-700 dark:text-violet-300">
                  Défilement auto actif.
                </span>
              )}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                className="h-11 flex-1 gap-2"
                disabled={busy}
                onClick={() => void run('timer_subtract_10')}
              >
                <Minus className="h-4 w-4" />
                −10 s
              </Button>
              <Button
                variant="secondary"
                className="h-11 flex-1 gap-2"
                disabled={busy}
                onClick={() => void run('timer_cut')}
              >
                <Timer className="h-4 w-4" />
                Couper le chrono
              </Button>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
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
          </div>
        )}

        {status === 'results' && (
          <div className="space-y-2">
            <p className="text-center text-xs text-muted-foreground">
              {Boolean(session.auto_advance)
                ? 'Défilement auto : passage à la question suivante.'
                : 'Passez à la suite quand vous voulez.'}
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


        {status === 'finished' && (
          <Button variant="outline" className="w-full h-12" asChild>
            <Link href="/dashboard">Retour au tableau de bord</Link>
          </Button>
        )}
      </main>
    </div>
  )
}
