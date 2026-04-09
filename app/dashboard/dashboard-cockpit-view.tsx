import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { TeacherComfortZone } from '@/components/dashboard/teacher-comfort-zone'
import {
  DashboardQuizCockpitGrid,
  type CockpitQuizRow,
} from '@/components/dashboard/dashboard-quiz-cockpit-grid'
import { BookOpen, CalendarDays, ListOrdered, Radio, Users, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type RecentSessionItem = {
  id: string
  created_at: string
  status: string
  quiz_id: string
  pin_code: string | null
  quizTitle: string
  participantCount: number
  badgeLabel: string
  badgeClassName: string
  relativeTime: string
}

export type DashboardCockpitViewProps = {
  greeting: string
  firstName: string
  dateLong: string
  statCards: {
    label: string
    value: number
    icon: LucideIcon
    color: string
  }[]
  recentSessions: RecentSessionItem[]
  cockpitRows: CockpitQuizRow[]
  quizCount: number
}

export function DashboardCockpitView({
  greeting,
  firstName,
  dateLong,
  statCards,
  recentSessions,
  cockpitRows,
  quizCount,
}: DashboardCockpitViewProps) {
  return (
    <>
      <section className="border-b border-border bg-card/40">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <CalendarDays className="h-4 w-4" aria-hidden />
                <span className="capitalize">{dateLong}</span>
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
                {greeting}, {firstName}
              </h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                Vue d’ensemble de votre activité : quiz, sessions et élèves touchés.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-violet-600 to-fuchsia-600 font-bold text-white shadow-lg shadow-violet-500/25"
              >
                <Link href="/dashboard/create">Nouveau quiz</Link>
              </Button>
              <Button variant="outline" size="lg" className="font-semibold" asChild>
                <Link href="/join">Tester /join</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-border bg-card p-5 text-center shadow-sm transition-shadow hover:shadow-md"
            >
              <div
                className={cn(
                  'mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br',
                  card.color,
                )}
              >
                <card.icon className="h-6 w-6" aria-hidden />
              </div>
              <p className="text-2xl font-black tabular-nums tracking-tight sm:text-3xl">{card.value}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {card.label}
              </p>
            </div>
          ))}
        </div>

        <section className="mt-10" aria-labelledby="activite-title">
          <h2 id="activite-title" className="text-lg font-black tracking-tight">
            Activité récente
          </h2>
          {recentSessions.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
              Aucune session encore — lancez votre premier quiz depuis une carte ci-dessous.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {recentSessions.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-foreground">{s.quizTitle}</p>
                    <p className="text-sm text-muted-foreground">
                      {s.relativeTime} · PIN {s.pin_code ?? '—'} · {s.participantCount}{' '}
                      {s.participantCount === 1 ? 'participant' : 'participants'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', s.badgeClassName)}>
                      {s.badgeLabel}
                    </span>
                    <Button size="sm" variant="secondary" className="font-semibold" asChild>
                      <Link href={`/results/${s.id}`}>Résultats</Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="mt-12">
          <TeacherComfortZone quizCount={quizCount} />
        </div>

        <div className="mt-12">
          <DashboardQuizCockpitGrid quizzes={cockpitRows} />
        </div>
      </main>
    </>
  )
}
