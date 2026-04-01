'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Download, FileText, Share2, ArrowLeft, Loader2, Medal } from 'lucide-react'
import Link from 'next/link'

interface Results {
  session: any
  participants: any[]
  answers: any[]
  stats: any
}

export default function ResultsPage() {
  const params = useParams()
  const sessionId = params.sessionId as string
  const [results, setResults] = useState<Results | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadResults = async () => {
      try {
        const response = await fetch(`/api/sessions/${sessionId}/results`)
        if (!response.ok) throw new Error('Failed to load results')
        const data = await response.json()
        setResults(data)
      } catch (err) {
        console.error('Error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load results')
      } finally {
        setIsLoading(false)
      }
    }

    loadResults()
  }, [sessionId])

  const exportAsCSV = () => {
    if (!results) return

    const headers = ['Rank', 'Name', 'Score', 'Correct Answers', 'Accuracy', 'Max Streak']
    const rows = results.participants.map((p, idx) => {
      const participantAnswers = results.answers.filter((a) => a.participant_id === p.id)
      const correctCount = participantAnswers.filter((a) => a.is_correct).length
      const accuracy = participantAnswers.length > 0 ? Math.round((correctCount / participantAnswers.length) * 100) : 0

      return [idx + 1, p.nickname, p.score || 0, correctCount, `${accuracy}%`, p.max_streak || 0]
    })

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `quiz-results-${sessionId}.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  if (error || !results) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Unable to Load Results</h2>
          <p className="text-muted-foreground mb-8">{error}</p>
          <Link href="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Quiz Results</h1>
              <p className="text-muted-foreground text-sm mt-1">
                {results.stats.totalParticipants} participants, {results.stats.correctPercentage}% average accuracy
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={exportAsCSV}>
              <Download className="w-4 h-4" /> Export CSV
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Share2 className="w-4 h-4" /> Share
            </Button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Statistics Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <StatCard
            label="Total Participants"
            value={results.stats.totalParticipants}
            icon="👥"
          />
          <StatCard
            label="Average Score"
            value={results.stats.averageScore}
            icon="📊"
          />
          <StatCard
            label="Correct Answers"
            value={`${results.stats.correctAnswers}/${results.stats.totalAnswers}`}
            icon="✅"
          />
          <StatCard
            label="Overall Accuracy"
            value={`${results.stats.correctPercentage}%`}
            icon="🎯"
          />
        </div>

        {/* Leaderboard */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-8 py-6 border-b border-border">
            <h2 className="text-2xl font-bold text-foreground">Leaderboard</h2>
          </div>

          <div className="divide-y divide-border">
            {results.participants.map((participant, idx) => {
              const participantAnswers = results.answers.filter((a) => a.participant_id === participant.id)
              const correctCount = participantAnswers.filter((a) => a.is_correct).length
              const accuracy = participantAnswers.length > 0 ? Math.round((correctCount / participantAnswers.length) * 100) : 0

              return (
                <div
                  key={participant.id}
                  className="px-8 py-6 flex items-center justify-between hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-lg">
                      {idx < 3 ? (
                        <span>{'🥇🥈🥉'[idx]}</span>
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-lg">{participant.nickname}</p>
                      <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                        <span>Streak: {participant.max_streak || 0}</span>
                        <span>•</span>
                        <span>Answered: {participantAnswers.length}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-3xl font-bold text-primary">{participant.score || 0}</p>
                    <p className="text-sm text-muted-foreground">
                      {correctCount}/{participantAnswers.length} correct ({accuracy}%)
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
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{label}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  )
}
