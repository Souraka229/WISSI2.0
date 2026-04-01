'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { hostControlSession, getSessionLeaderboard } from '@/app/actions/quiz'
import { fetchMergedSessionQuestions } from '@/lib/session-questions'
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
} from 'lucide-react'

export default function HostSessionPage() {
  const params = useParams()
  const sessionId = params.sessionId as string
  const supabase = createClient()

  const [session, setSession] = useState<Record<string, unknown> | null>(null)
  const [quizTitle, setQuizTitle] = useState('')
  const [questionCount, setQuestionCount] = useState(0)
  const [leaderboard, setLeaderboard] = useState<
    { rank: number; nickname: string; score: number; level: number }[]
  >([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadLeaderboard = useCallback(async () => {
    try {
      const { top5 } = await getSessionLeaderboard(sessionId)
      setLeaderboard(top5)
    } catch {
      /* ignore */
    }
  }, [sessionId])

  useEffect(() => {
    let cancelled = false

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
        await loadLeaderboard()
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void init()

    const channel = supabase
      .channel(`host-session-${sessionId}`)
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
      .subscribe()

    const pChannel = supabase
      .channel(`host-p-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          void loadLeaderboard()
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      void supabase.removeChannel(channel)
      void supabase.removeChannel(pChannel)
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
    try {
      await hostControlSession(sessionId, action)
      await loadLeaderboard()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
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

  return (
    <div className="min-h-screen bg-background pb-[env(safe-area-inset-bottom,0px)]">
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
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        {error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            État en direct
          </p>
          <p className="mt-2 text-2xl font-bold capitalize">{status}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Question {Math.min(idx + 1, questionCount)} / {questionCount || '—'} · PIN{' '}
            <span className="font-mono font-semibold text-foreground">
              {String(session.pin_code)}
            </span>
          </p>
        </section>

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
          <Button
            className="h-14 w-full gap-2 text-base"
            disabled={busy || questionCount === 0}
            onClick={() => void run('start')}
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
            Démarrer la partie
          </Button>
        )}

        {status === 'question' && (
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              variant="secondary"
              className="h-12 flex-1 gap-2"
              disabled={busy}
              onClick={() => void run('show_leaderboard')}
            >
              <Trophy className="h-4 w-4" />
              TOP 5 & classement
            </Button>
            <Button
              variant="outline"
              className="h-12 flex-1 gap-2"
              disabled={busy}
              onClick={() => void run('end')}
            >
              <Square className="h-4 w-4" />
              Terminer
            </Button>
          </div>
        )}

        {status === 'results' && (
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              className="h-12 flex-1 gap-2"
              disabled={busy}
              onClick={() => void run('next_question')}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SkipForward className="h-4 w-4" />
              )}
              Question suivante ou fin
            </Button>
          </div>
        )}

        {(status === 'finished' || status === 'results') && (
          <section className="rounded-2xl border border-border bg-muted/30 p-5">
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">TOP 5</h2>
            </div>
            <ol className="space-y-2">
              {leaderboard.length === 0 ? (
                <li className="text-sm text-muted-foreground">Aucun joueur encore</li>
              ) : (
                leaderboard.map((row) => (
                  <li
                    key={row.rank + row.nickname}
                    className="flex items-center justify-between rounded-lg bg-background px-3 py-2 text-sm transition-transform"
                  >
                    <span>
                      <span className="mr-2 font-mono text-muted-foreground">#{row.rank}</span>
                      {row.nickname}
                    </span>
                    <span className="font-semibold">
                      {row.score} pts · Nv.{row.level}
                    </span>
                  </li>
                ))
              )}
            </ol>
          </section>
        )}

        {status === 'finished' && (
          <Button variant="outline" className="w-full" asChild>
            <Link href="/dashboard">Retour au tableau de bord</Link>
          </Button>
        )}
      </main>
    </div>
  )
}
