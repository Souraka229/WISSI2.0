import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMyHostedSessions } from '@/app/actions/quiz'
import { Button } from '@/components/ui/button'
import { ArrowLeft, BarChart3, ExternalLink, Radio } from 'lucide-react'

const STATUS_FR: Record<string, string> = {
  waiting: 'Salle d’attente',
  active: 'Partie active',
  question: 'Question en cours',
  results: 'Classement',
  finished: 'Terminée',
}

const SCORING_FR: Record<string, string> = {
  classic: 'Classique',
  precision: 'Précision',
  speed: 'Vitesse',
}

export default async function SessionsHistoryPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  let sessions: Awaited<ReturnType<typeof getMyHostedSessions>> = []
  let loadError: string | null = null
  try {
    sessions = await getMyHostedSessions()
  } catch (e) {
    console.error('[sessions history]', e)
    loadError =
      process.env.NODE_ENV === 'development' && e instanceof Error
        ? `Impossible de charger l’historique : ${e.message}`
        : 'Impossible de charger l’historique des sessions.'
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard" aria-label="Retour">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              <span className="text-lg font-bold tracking-tight">Mes sessions</span>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard">Tableau de bord</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10 lg:px-8">
        <h1 className="text-3xl font-black tracking-tight">Historique des sessions</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Sessions que vous avez animées : retrouvez le PIN, le statut et ouvrez les résultats ou le
          pupitre.
        </p>

        {loadError && (
          <p className="mt-8 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {loadError}
          </p>
        )}

        {!loadError && sessions.length === 0 && (
          <p className="mt-10 text-center text-muted-foreground">
            Aucune session pour l’instant. Lancez une partie depuis un quiz.
          </p>
        )}

        {!loadError && sessions.length > 0 && (
          <div className="mt-8 overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Quiz</th>
                  <th className="px-4 py-3 font-semibold">PIN</th>
                  <th className="px-4 py-3 font-semibold">Statut</th>
                  <th className="px-4 py-3 font-semibold">Scoring</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {sessions.map((s) => {
                  const title = s.quizzes?.title ?? '—'
                  const dateStr = new Date(s.created_at).toLocaleString('fr-FR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })
                  const statusFr = STATUS_FR[s.status] ?? s.status
                  const scoringFr =
                    SCORING_FR[s.scoring_mode ?? 'classic'] ?? (s.scoring_mode ?? 'classic')
                  const canHost = s.status !== 'finished'

                  return (
                    <tr key={s.id} className="hover:bg-muted/30">
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{dateStr}</td>
                      <td className="max-w-[200px] truncate px-4 py-3 font-medium">{title}</td>
                      <td className="px-4 py-3 font-mono font-semibold">{s.pin_code}</td>
                      <td className="px-4 py-3">{statusFr}</td>
                      <td className="px-4 py-3 text-muted-foreground">{scoringFr}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button variant="outline" size="sm" className="gap-1" asChild>
                            <Link href={`/results/${s.id}`}>
                              <BarChart3 className="h-3.5 w-3.5" />
                              Résultats
                            </Link>
                          </Button>
                          {canHost && (
                            <Button size="sm" className="gap-1" asChild>
                              <Link href={`/dashboard/session/${s.id}/host`}>
                                <ExternalLink className="h-3.5 w-3.5" />
                                Pupitre
                              </Link>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
