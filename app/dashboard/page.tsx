import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { Button } from '@/components/ui/button'
import { Plus, LogOut, LayoutDashboard, UserPlus, HelpCircle, User, History } from 'lucide-react'
import { QuizGridSkeleton } from '@/components/dashboard/quiz-grid-skeleton'
import { DashboardQuizGridSection } from './dashboard-quiz-grid-section'

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

      <section className="border-b border-border bg-card/40">
        <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-violet-600 dark:text-violet-400">
                <LayoutDashboard className="h-4 w-4" />
                Tableau de bord
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Mes quiz</h1>
              <p className="mt-2 max-w-xl text-muted-foreground">
                Créez du contenu, lancez une session live (PIN + QR), puis ouvrez le pupitre animateur.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-violet-600 to-fuchsia-600 font-bold text-white shadow-lg shadow-violet-500/25"
              >
                <Link href="/dashboard/create">
                  <Plus className="h-5 w-5" />
                  Nouveau quiz
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="font-semibold" asChild>
                <Link href="/join">
                  <UserPlus className="h-5 w-5" />
                  Tester /join
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <Suspense fallback={<QuizGridSkeleton />}>
          <DashboardQuizGridSection />
        </Suspense>
      </main>
    </div>
  )
}
