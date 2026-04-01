'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { fetchMergedSessionQuestions } from '@/lib/session-questions'
import {
  submitAnswer,
  addReaction,
  getSessionLeaderboard,
} from '@/app/actions/quiz'
import { Button } from '@/components/ui/button'
import { Loader2, Trophy, Users, Zap } from 'lucide-react'

type ParticipantRow = {
  id: string
  nickname: string
  score: number
  level: number
}

export default function StudentPlayerPage() {
  const params = useParams()
  const sessionId = params.sessionId as string
  const participantId = params.participantId as string

  const supabase = createClient()
  const [session, setSession] = useState<Record<string, unknown> | null>(null)
  const [questions, setQuestions] = useState<any[]>([])
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
  const questionKeyRef = useRef<string>('')

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
      .select('id, nickname, score, level')
      .eq('id', participantId)
      .single()
    if (data) setMe(data as ParticipantRow)
  }, [supabase, participantId])

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
        setQuestions(merged)
        await refreshMe()
        await refreshLeaderboard()
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void boot()

    const sCh = supabase
      .channel(`student-s-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionId}`,
        },
        (p) => {
          setSession(p.new as Record<string, unknown>)
        },
      )
      .subscribe()

    const meCh = supabase
      .channel(`student-me-${participantId}`)
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
      .subscribe()

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

    const reactCh = supabase
      .channel(`reactions-${sessionId}`)
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
      .subscribe()

    return () => {
      cancelled = true
      void supabase.removeChannel(sCh)
      void supabase.removeChannel(meCh)
      void supabase.removeChannel(presence)
      void supabase.removeChannel(reactCh)
    }
  }, [sessionId, participantId, supabase, refreshMe, refreshLeaderboard])

  const status = session ? String(session.status) : ''
  const qIndex = session ? Number(session.current_question_index ?? 0) : 0
  const currentQuestion = questions[qIndex]

  const handleSubmitAnswer = useCallback(
    async (fromTimeout = false) => {
      if (!currentQuestion || answered || status !== 'question') return

      setAnswered(true)
      const choice = fromTimeout ? null : selectedAnswer
      try {
        const isCorrect =
          choice !== null &&
          String(choice) === String(currentQuestion.correct_answer)
        const limit = currentQuestion.time_limit ?? 30
        await submitAnswer(
          participantId,
          sessionId,
          currentQuestion.id,
          choice === null ? 'timeout' : String(choice),
          isCorrect,
          Math.max(0, limit - timeLeft),
        )
        await refreshMe()
      } catch (e) {
        console.error(e)
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
    ],
  )

  useEffect(() => {
    const key = `${qIndex}-${currentQuestion?.id ?? ''}-${status}`
    if (key !== questionKeyRef.current) {
      questionKeyRef.current = key
      setSelectedAnswer(null)
      setAnswered(false)
      setTimeLeft(currentQuestion?.time_limit ?? 30)
    }
  }, [qIndex, currentQuestion?.id, currentQuestion?.time_limit, status])

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

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
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
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-gradient-to-b from-background to-muted/40 p-6 text-center animate-in fade-in duration-500">
        <Trophy className="h-16 w-16 text-amber-500" />
        <div>
          <h1 className="text-2xl font-bold">Partie terminée</h1>
          <p className="mt-2 text-muted-foreground">
            Merci {me?.nickname} — score final {me?.score ?? 0} pts · niveau {me?.level ?? 1}
          </p>
        </div>
        <Button asChild>
          <Link href="/join">Retour</Link>
        </Button>
      </div>
    )
  }

  if (status === 'waiting') {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-b from-primary/10 via-background to-background px-4 py-8">
        <div className="mx-auto max-w-md space-y-8 pt-8 text-center animate-in slide-in-from-bottom-4 duration-500">
          <div className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm shadow-sm border border-border">
            <Users className="h-4 w-4 text-primary" />
            <span>{onlineCount} connecté(s)</span>
          </div>
          <h1 className="text-2xl font-bold">Salle d’attente</h1>
          <p className="text-muted-foreground">
            Bonjour <strong>{me?.nickname}</strong> — le professeur va bientôt lancer le défi.
          </p>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Votre profil</p>
            <p className="mt-2 text-lg font-semibold">
              Rang #{myRank ?? '—'} · Niveau {me?.level ?? 1} · {me?.score ?? 0} pts
            </p>
          </div>
          <p className="text-sm text-muted-foreground animate-pulse">En attente du lancement…</p>
        </div>
      </div>
    )
  }

  if (status === 'results') {
    return (
      <div className="min-h-[100dvh] bg-background px-4 pb-28 pt-6 animate-in zoom-in-95 duration-300">
        <header className="mx-auto mb-6 flex max-w-lg items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Classement temps réel</p>
            <p className="text-lg font-bold">TOP 5</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold text-primary">Vous</p>
            <p>
              #{myRank ?? '—'} · Nv.{me?.level ?? 1} · {me?.score ?? 0} pts
            </p>
          </div>
        </header>

        <ol className="mx-auto max-w-lg space-y-3">
          {leaderboard.map((row, i) => (
            <li
              key={row.rank + row.nickname}
              className={`flex items-center justify-between rounded-2xl border px-4 py-3 transition-all ${
                row.id === participantId
                  ? 'border-primary bg-primary/10 scale-[1.02]'
                  : 'border-border bg-card'
              }`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <span className="flex items-center gap-3">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                    row.rank <= 3 ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300' : 'bg-muted'
                  }`}
                >
                  {row.rank}
                </span>
                <span className="font-medium">{row.nickname}</span>
              </span>
              <span className="text-sm font-semibold">
                {row.score} pts · Nv.{row.level}
              </span>
            </li>
          ))}
        </ol>

        <div className="mx-auto mt-10 max-w-lg rounded-xl border border-dashed border-border bg-muted/20 p-4 text-center text-sm text-muted-foreground">
          Le professeur lance la prochaine question quand tout le monde est prêt.
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
    return (
      <div className="min-h-[100dvh] bg-gradient-to-b from-background to-muted/20 pb-32">
        <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md pt-[env(safe-area-inset-top,0px)]">
          <div className="mx-auto flex max-w-lg items-center justify-between gap-2 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Q.{qIndex + 1} / {questions.length}
              </p>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                  style={{
                    width: `${((qIndex + 1) / Math.max(questions.length, 1)) * 100}%`,
                  }}
                />
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p
                className={`text-2xl font-black tabular-nums ${
                  timeLeft <= 5 ? 'text-destructive animate-pulse' : 'text-foreground'
                }`}
              >
                {timeLeft}s
              </p>
            </div>
          </div>
          <div className="flex justify-between gap-2 border-t border-border/50 px-4 py-2 text-xs">
            <span className="text-muted-foreground">
              <Users className="mr-1 inline h-3 w-3" />
              {onlineCount} en ligne
            </span>
            <span>
              Rang <strong className="text-primary">#{myRank ?? '—'}</strong> · Nv.{me?.level ?? 1}{' '}
              · {me?.score ?? 0} pts
            </span>
          </div>
        </header>

        <main className="mx-auto max-w-lg px-4 py-6">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-balance text-xl font-bold leading-snug sm:text-2xl">
              {currentQuestion.question_text}
            </h2>

            {currentQuestion.question_type === 'mcq' && Array.isArray(currentQuestion.options) && (
              <div className="mt-6 grid grid-cols-1 gap-3">
                {currentQuestion.options.map((option: string, idx: number) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={answered}
                    onClick={() => !answered && setSelectedAnswer(String(idx))}
                    className={`rounded-xl border-2 px-4 py-4 text-left text-sm font-medium transition-all active:scale-[0.98] ${
                      selectedAnswer === String(idx)
                        ? 'border-primary bg-primary/15'
                        : 'border-border bg-background hover:border-primary/40'
                    } ${answered ? 'opacity-60' : ''}`}
                  >
                    <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-current text-xs">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    {option}
                  </button>
                ))}
              </div>
            )}

            {currentQuestion.question_type === 'true_false' && (
              <div className="mt-6 grid grid-cols-2 gap-3">
                {['Vrai', 'Faux'].map((label, idx) => (
                  <button
                    key={label}
                    type="button"
                    disabled={answered}
                    onClick={() => !answered && setSelectedAnswer(String(idx))}
                    className={`rounded-xl border-2 py-4 text-center font-semibold transition-all ${
                      selectedAnswer === String(idx)
                        ? 'border-primary bg-primary/15'
                        : 'border-border'
                    }`}
                  >
                    {label}
                  </button>
                ))}
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

            <div className="mt-6">
              {!answered ? (
                <Button
                  className="h-12 w-full gap-2 text-base"
                  disabled={selectedAnswer === null}
                  onClick={() => void handleSubmitAnswer(false)}
                >
                  <Zap className="h-5 w-5" />
                  Valider
                </Button>
              ) : (
                <p className="text-center text-sm text-muted-foreground">
                  Réponse enregistrée — en attente du classement…
                </p>
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
