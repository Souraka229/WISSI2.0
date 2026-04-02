import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { Button } from '@/components/ui/button'
import { LogOut, HelpCircle, User, History, BookOpen, ListOrdered, Radio, Users } from 'lucide-react'
import { DashboardCockpitSkeleton } from '@/components/dashboard/stats-skeleton'
import {
  DashboardCockpitView,
  type RecentSessionItem,
} from './dashboard-cockpit-view'
import type { CockpitQuizRow } from '@/components/dashboard/dashboard-quiz-cockpit-grid'

/** Vercel : marge sur la durée d’exécution serverless (Pro/Entreprise). */
export const maxDuration = 60

export const dynamic = 'force-dynamic'

/** Colonnes nécessaires au cockpit (évite select * + embed count, source de timeouts Vercel). */
const QUIZ_COCKPIT_COLUMNS =
  'id,title,description,level,theme,created_at,is_public' as const

const MAX_QUIZZES_DASHBOARD = 150
const MAX_SESSIONS_DASHBOARD = 50

type QuizRowLite = {
  id: string
  title: string
  description: string | null
  level: string | null
  theme: string | null
  created_at: string
  is_public?: boolean | null
}

type SessionLite = {
  id: string
  created_at: string
  status: string
  quiz_id: string
  pin_code: string | null
}

function hourInBenin(): number {
  const h = new Date().toLocaleString('en-GB', {
    timeZone: 'Africa/Porto-Novo',
    hour: 'numeric',
    hour12: false,
  })
  return parseInt(h, 10)
}

function greetingFr(): string {
  const h = hourInBenin()
  if (h >= 5 && h < 18) return 'Bonjour'
  return 'Bonsoir'
}

function firstNameFromProfile(displayName: string | null | undefined, email: string): string {
  if (displayName?.trim()) {
    return displayName.trim().split(/\s+/)[0] ?? displayName.trim()
  }
  if (email.includes('@')) {
    return email.split('@')[0] ?? 'prof'
  }
  return 'prof'
}

function formatRelativeSession(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const sec = Math.floor(diffMs / 1000)
  if (sec < 60) return "À l'instant"
  const min = Math.floor(sec / 60)
  if (min < 60) return `Il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `Il y a ${h} h`
  const days = Math.floor(h / 24)
  if (days < 7) return days === 1 ? 'Hier' : `Il y a ${days} jours`
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function sessionStatusBadge(status: string): { label: string; className: string } {
  switch (status) {
    case 'finished':
      return { label: 'Terminée', className: 'bg-muted text-muted-foreground' }
    case 'waiting':
      return { label: 'En attente', className: 'bg-amber-500/20 text-amber-900 dark:text-amber-200' }
    case 'active':
    case 'question':
      return { label: 'En cours', className: 'bg-emerald-500/20 text-emerald-900 dark:text-emerald-300' }
    case 'results':
      return { label: 'Résultats', className: 'bg-violet-500/20 text-violet-900 dark:text-violet-200' }
    default:
      return { label: status, className: 'bg-muted text-muted-foreground' }
  }
}

async function DashboardCockpitLoader({ userId, userEmail }: { userId: string; userEmail: string }) {
  try {
    const supabase = await createClient()

    const [profileRes, quizzesRes, sessionsRes] = await Promise.all([
    supabase.from('profiles').select('display_name,email').eq('id', userId).single(),
    supabase
      .from('quizzes')
      .select(QUIZ_COCKPIT_COLUMNS)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(MAX_QUIZZES_DASHBOARD),
    supabase
      .from('sessions')
      .select('id, created_at, status, quiz_id, pin_code')
      .eq('host_id', userId)
      .order('created_at', { ascending: false })
      .limit(MAX_SESSIONS_DASHBOARD),
  ])

  const profile = profileRes.data
  const quizzes = (quizzesRes.data ?? []) as QuizRowLite[]
  const sessionsRaw = (sessionsRes.data ?? []) as SessionLite[]

  const sessionIds = sessionsRaw.map((s) => s.id)
  const quizIds = quizzes.map((q) => q.id)

  const sortedSessions = [...sessionsRaw].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
  const recentThree = sortedSessions.slice(0, 3)
  const recentIds = recentThree.map((s) => s.id)

  const [participantsCountRes, recentParticipantsRes, questionIdsRes] = await Promise.all([
    sessionIds.length > 0
      ? supabase
          .from('participants')
          .select('id', { count: 'exact', head: true })
          .in('session_id', sessionIds)
      : Promise.resolve({ count: 0 as number | null }),
    recentIds.length > 0
      ? supabase.from('participants').select('session_id').in('session_id', recentIds)
      : Promise.resolve({ data: [] as { session_id: string }[] }),
    quizIds.length > 0
      ? supabase.from('questions').select('quiz_id').in('quiz_id', quizIds)
      : Promise.resolve({ data: [] as { quiz_id: string }[] }),
  ])

  const studentsCount = participantsCountRes.count ?? 0

  const questionCountByQuizId = new Map<string, number>()
  for (const row of questionIdsRes.data ?? []) {
    const qid = row.quiz_id
    questionCountByQuizId.set(qid, (questionCountByQuizId.get(qid) ?? 0) + 1)
  }

  const totalQuestions = Array.from(questionCountByQuizId.values()).reduce((a, b) => a + b, 0)

  const quizTitleById = new Map(quizzes.map((q) => [q.id, q.title]))

  const lastSessionByQuizId = new Map<string, string>()
  for (const s of sortedSessions) {
    if (!lastSessionByQuizId.has(s.quiz_id)) {
      lastSessionByQuizId.set(s.quiz_id, s.created_at)
    }
  }

  const cockpitRows: CockpitQuizRow[] = quizzes.map((q) => {
    const lastIso = lastSessionByQuizId.get(q.id)
    return {
      id: q.id,
      title: q.title,
      description: q.description,
      level: q.level,
      theme: q.theme,
      isPublic: Boolean(q.is_public),
      questionCount: questionCountByQuizId.get(q.id) ?? 0,
      createdAtIso: q.created_at,
      lastSessionLabel: lastIso ? formatShortDate(lastIso) : null,
    }
  })

  const participantCountBySession = new Map<string, number>()
  for (const row of recentParticipantsRes.data ?? []) {
    const sid = row.session_id
    participantCountBySession.set(sid, (participantCountBySession.get(sid) ?? 0) + 1)
  }

  const recentSessions: RecentSessionItem[] = recentThree.map((s) => {
    const badge = sessionStatusBadge(s.status)
    return {
      id: s.id,
      created_at: s.created_at,
      status: s.status,
      quiz_id: s.quiz_id,
      pin_code: s.pin_code,
      quizTitle: quizTitleById.get(s.quiz_id) ?? 'Quiz',
      participantCount: participantCountBySession.get(s.id) ?? 0,
      badgeLabel: badge.label,
      badgeClassName: badge.className,
      relativeTime: formatRelativeSession(s.created_at),
    }
  })

  const displayName = profile?.display_name ?? null
  const firstName = firstNameFromProfile(displayName, userEmail)
  const dateLong = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Porto-Novo',
  })

  const statCards = [
    {
      label: 'Quiz créés',
      value: quizzes.length,
      icon: BookOpen,
      color: 'from-violet-500/20 to-fuchsia-500/10 text-violet-700 dark:text-violet-300',
    },
    {
      label: 'Sessions lancées',
      value: sessionsRaw.length,
      icon: Radio,
      color: 'from-fuchsia-500/20 to-orange-500/10 text-fuchsia-700 dark:text-fuchsia-300',
    },
    {
      label: 'Étudiants touchés',
      value: studentsCount,
      icon: Users,
      color: 'from-emerald-500/20 to-teal-500/10 text-emerald-800 dark:text-emerald-300',
    },
    {
      label: 'Questions créées',
      value: totalQuestions,
      icon: ListOrdered,
      color: 'from-orange-500/20 to-amber-500/10 text-orange-800 dark:text-orange-300',
    },
  ]

    return (
      <DashboardCockpitView
        greeting={greetingFr()}
        firstName={firstName}
        dateLong={dateLong}
        statCards={statCards}
        recentSessions={recentSessions}
        cockpitRows={cockpitRows}
        quizCount={quizzes.length}
      />
    )
  } catch (err) {
    console.error('[DashboardCockpitLoader]', err)
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <p className="text-lg font-bold text-foreground">Chargement interrompu</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Réessayez dans un instant — si le problème continue, vérifiez la connexion puis actualisez la page.
        </p>
        <Button asChild className="mt-8" size="lg">
          <Link href="/dashboard">Actualiser le tableau de bord</Link>
        </Button>
      </div>
    )
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 text-sm font-black text-white shadow-md">
              Q
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight">SCITI-Quiz</span>
              <p className="hidden text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:block">
                Espace professeur
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="icon" className="sm:hidden" asChild>
              <Link href="/dashboard/sessions" aria-label="Mes sessions">
                <History className="h-5 w-5" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" className="sm:hidden" asChild>
              <Link href="/aide" aria-label="Aide enseignant">
                <HelpCircle className="h-5 w-5" />
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="hidden gap-1.5 font-semibold sm:inline-flex" asChild>
              <Link href="/dashboard/sessions">
                <History className="h-4 w-4" />
                Mes sessions
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="hidden gap-1.5 font-semibold sm:inline-flex" asChild>
              <Link href="/aide">
                <HelpCircle className="h-4 w-4" />
                Aide
              </Link>
            </Button>
            <ThemeSwitcher />
            <Button variant="ghost" size="icon" asChild aria-label="Mon profil">
              <Link href="/dashboard/profile">
                <User className="h-5 w-5" />
              </Link>
            </Button>
            <span className="hidden max-w-[200px] truncate text-sm text-muted-foreground md:block">
              {user.email}
            </span>
            <form action="/api/auth/signout" method="post">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Déconnexion</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      <Suspense fallback={<DashboardCockpitSkeleton />}>
        <DashboardCockpitLoader userId={user.id} userEmail={user.email ?? ''} />
      </Suspense>
    </div>
  )
}
