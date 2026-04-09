'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Download, ArrowLeft, Loader2, Share2, Copy, Trophy } from 'lucide-react'
import { computeSessionXp, gradeFromXp } from '@/lib/prof-xp'

const ResultsPdfExportButton = dynamic(
  () =>
    import('@/components/results/results-pdf-export-button').then((m) => m.ResultsPdfExportButton),
  {
    ssr: false,
    loading: () => (
      <Button variant="outline" size="sm" className="gap-2" disabled>
        PDF…
      </Button>
    ),
  },
)

type SessionRow = {
  id: string
  current_question_index: number
  pin_code?: string | null
  game_mode?: string | null
}

type ParticipantRow = {
  id: string
  nickname: string
  score: number | null
  max_streak?: number | null
}

type AnswerRow = {
  participant_id: string
  is_correct: boolean | null
  points_earned?: number | null
}

type ResultsStats = {
  totalParticipants: number
  totalQuestions: number
  averageScore: number
  correctAnswers: number
  totalAnswers: number
  correctPercentage: number
}

type ResultsPayload = {
  session: SessionRow
  participants: ParticipantRow[]
  answers: AnswerRow[]
  stats: ResultsStats
}

export default function ResultsPage() {
  const params = useParams()
  const sessionId = params.sessionId as string
  const [results, setResults] = useState<ResultsPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const loadResults = async () => {
      try {
        const response = await fetch(`/api/sessions/${sessionId}/results`)
        if (!response.ok) {
          if (response.status === 403) {
            throw new Error('Résultats indisponibles pendant le live. Attendez la fin de la partie.')
          }
          throw new Error('Échec du chargement des résultats')
        }
        const data = (await response.json()) as ResultsPayload
        setResults(data)
      } catch (err) {
        console.error('Error:', err)
        setError(
          err instanceof Error ? err.message : 'Impossible de charger les résultats',
        )
      } finally {
        setIsLoading(false)
      }
    }

    void loadResults()
  }, [sessionId])

  const exportAsCSV = () => {
    if (!results) return

    const headers = [
      'Rang',
      'Pseudo',
      'Score',
      'Bonnes réponses',
      'Précision',
      'Meilleure série',
    ]
    const rows = results.participants.map((p, idx) => {
      const participantAnswers = results.answers.filter((a) => a.participant_id === p.id)
      const correctCount = participantAnswers.filter((a) => a.is_correct).length
      const accuracy =
        participantAnswers.length > 0
          ? Math.round((correctCount / participantAnswers.length) * 100)
          : 0

      return [
        idx + 1,
        p.nickname,
        p.score ?? 0,
        correctCount,
        `${accuracy}%`,
        p.max_streak ?? 0,
      ]
    })

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `resultats-quiz-${sessionId}.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const resultsUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/results/${encodeURIComponent(sessionId)}`
      : ''

  const winner = results?.participants?.[0]
  const winnerScore = winner?.score ?? 0
  const sessionXp = computeSessionXp({
    connected: results?.stats.totalParticipants ?? 0,
    answers: results?.stats.totalAnswers ?? 0,
    correctRatePercent: results?.stats.correctPercentage ?? 0,
    mode: results?.session.game_mode,
  })
  const projectedGrade = gradeFromXp(sessionXp)
  const whatsappText =
    winner != null
      ? `🏆 Résultats du quiz\n\n🥇 #1 ${winner.nickname} — ${winnerScore} pts\n\nVoir le classement complet : ${resultsUrl}`
      : `Résultats du quiz : ${resultsUrl}`

  const shareWhatsApp = async () => {
    if (!resultsUrl) return
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Résultats du quiz',
          text: whatsappText,
          url: resultsUrl,
        })
        return
      }
    } catch {
      // ignore (fallback WhatsApp)
    }
    // Sur certains mobiles/ navigateurs, window.open peut être bloqué.
    window.location.assign(
      `https://wa.me/?text=${encodeURIComponent(whatsappText)}`,
    )
  }

  const copyResultsLink = async () => {
    if (!resultsUrl) return
    try {
      await navigator.clipboard.writeText(resultsUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2200)
    } catch {
      // ignore
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !results) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="mb-4 text-2xl font-bold text-foreground">
            Impossible de charger les résultats
          </h2>
          <p className="mb-8 text-muted-foreground">{error}</p>
          <Link href="/dashboard">
            <Button>Retour au tableau de bord</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="wiaa-purple-bg min-h-screen text-white">
      <div className="sticky top-0 z-40 border-b border-white/10 bg-white/5 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Retour"
                className="text-white hover:bg-white/10 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4 text-white" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-black text-white">Résultats de session</h1>
              <p className="mt-1 text-sm text-white/75">
                {results.stats.totalParticipants} participant
                {results.stats.totalParticipants !== 1 ? 's' : ''},{' '}
                {results.stats.correctPercentage}% de précision moyenne sur les réponses
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-white/20 bg-white/8 text-white hover:bg-white/12"
              onClick={shareWhatsApp}
            >
              <Share2 className="h-4 w-4" /> Partager WhatsApp
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-white/20 bg-white/8 text-white hover:bg-white/12"
              onClick={() => void copyResultsLink()}
            >
              <Copy className="h-4 w-4" /> {copied ? 'Lien copié' : 'Copier le lien'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-white/20 bg-white/8 text-white hover:bg-white/12"
              onClick={exportAsCSV}
            >
              <Download className="h-4 w-4" /> CSV
            </Button>
            <div className="hidden sm:block">
              <ResultsPdfExportButton results={results} />
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-10 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 md:grid-cols-4 md:gap-6">
          <StatCard label="Participants" value={results.stats.totalParticipants} icon="👥" />
          <StatCard label="Score moyen" value={results.stats.averageScore} icon="📊" />
          <StatCard
            label="Bonnes réponses"
            value={`${results.stats.correctAnswers}/${results.stats.totalAnswers}`}
            icon="✅"
          />
          <StatCard label="Précision globale" value={`${results.stats.correctPercentage}%`} icon="🎯" />
        </div>

        <div className="mb-10 rounded-2xl border border-white/15 bg-white/8 p-6 backdrop-blur-md">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">
            Rapport pédagogique (prof)
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-white/80">
              XP estimée session: <span className="font-black text-white">{sessionXp}</span>
            </p>
            <p className="text-sm text-white/80">
              Grade projeté: <span className="font-black text-white">{projectedGrade}</span>
            </p>
          </div>
        </div>

        {winner ? (
          <div className="mb-8 overflow-hidden rounded-3xl border border-white/15 bg-white/8 p-6 shadow-2xl backdrop-blur-md sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-200">
                  <Trophy className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">
                    Meilleur joueur
                  </p>
                  <p className="text-2xl font-black text-white sm:text-3xl">{winner.nickname}</p>
                </div>
              </div>
              <div className="rounded-2xl bg-white/10 px-5 py-3 text-center sm:text-right">
                <p className="text-sm font-bold text-white/70">Score</p>
                <p className="text-4xl font-black tabular-nums text-amber-200">{winnerScore} pts</p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-3xl border border-white/12 bg-white/6 p-6 backdrop-blur-md sm:p-8">
          <h2 className="text-xl font-black text-white">Synthèse pédagogique</h2>
          <p className="mt-2 text-sm text-white/75">
            Cette version n’affiche pas de leaderboard. Les indicateurs globaux et exports restent disponibles.
          </p>
        </div>
      </main>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string
  value: string | number
  icon: string
}) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/8 p-6 backdrop-blur-md">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="mb-1 text-sm text-white/70">{label}</p>
          <p className="text-3xl font-black tabular-nums text-white">{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  )
}
