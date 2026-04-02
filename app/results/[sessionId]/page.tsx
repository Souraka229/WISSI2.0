'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Download, ArrowLeft, Loader2 } from 'lucide-react'

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

  useEffect(() => {
    const loadResults = async () => {
      try {
        const response = await fetch(`/api/sessions/${sessionId}/results`)
        if (!response.ok) throw new Error('Échec du chargement des résultats')
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="sticky top-0 z-40 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" aria-label="Retour">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Résultats du quiz</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {results.stats.totalParticipants} participant
                {results.stats.totalParticipants !== 1 ? 's' : ''},{' '}
                {results.stats.correctPercentage}% de précision moyenne sur les réponses
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={exportAsCSV}>
              <Download className="h-4 w-4" /> Exporter CSV
            </Button>
            <ResultsPdfExportButton results={results} />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-12 grid gap-6 md:grid-cols-4">
          <StatCard label="Participants" value={results.stats.totalParticipants} icon="👥" />
          <StatCard label="Score moyen" value={results.stats.averageScore} icon="📊" />
          <StatCard
            label="Bonnes réponses"
            value={`${results.stats.correctAnswers}/${results.stats.totalAnswers}`}
            icon="✅"
          />
          <StatCard label="Précision globale" value={`${results.stats.correctPercentage}%`} icon="🎯" />
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-8 py-6">
            <h2 className="text-2xl font-bold text-foreground">Classement</h2>
          </div>

          <div className="divide-y divide-border">
            {results.participants.map((participant, idx) => {
              const participantAnswers = results.answers.filter(
                (a) => a.participant_id === participant.id,
              )
              const correctCount = participantAnswers.filter((a) => a.is_correct).length
              const accuracy =
                participantAnswers.length > 0
                  ? Math.round((correctCount / participantAnswers.length) * 100)
                  : 0

              return (
                <div
                  key={participant.id}
                  className="flex flex-col gap-4 px-8 py-6 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-6">
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-secondary text-lg font-bold text-white">
                      {idx < 3 ? <span>{'🥇🥈🥉'[idx]}</span> : idx + 1}
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground">{participant.nickname}</p>
                      <div className="mt-1 flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span>Meilleure série : {participant.max_streak ?? 0}</span>
                        <span>•</span>
                        <span>Réponses : {participantAnswers.length}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right sm:text-right">
                    <p className="text-3xl font-bold text-primary">{participant.score ?? 0}</p>
                    <p className="text-sm text-muted-foreground">
                      {correctCount}/{participantAnswers.length} bonnes ({accuracy}%)
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
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
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="mb-1 text-sm text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  )
}
