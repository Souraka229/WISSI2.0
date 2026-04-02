import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ProfileNameForm } from '@/components/dashboard/profile-name-form'
import { ThemeSwitcher } from '@/components/theme-switcher'
import {
  ArrowLeft,
  LayoutDashboard,
  User,
  Mail,
  Calendar,
  BookOpen,
  Radio,
  Plus,
  History,
  HelpCircle,
  Sparkles,
} from 'lucide-react'

function initialsFrom(displayName: string | null | undefined, email: string | null | undefined) {
  const base = (displayName?.trim() || email?.split('@')[0] || '?').trim()
  const parts = base.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2)
  }
  return base.slice(0, 2).toUpperCase()
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, email, created_at')
    .eq('id', user.id)
    .maybeSingle()

  const [{ count: quizCount }, { count: sessionCount }] = await Promise.all([
    supabase
      .from('quizzes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('host_id', user.id),
  ])

  const displayName = profile?.display_name?.trim() || null
  const email = user.email ?? profile?.email ?? ''
  const memberSince = new Date(user.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const initials = initialsFrom(displayName, email)

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-500/[0.06] via-background to-muted/25">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard" aria-label="Retour au tableau de bord">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 text-xs font-black text-white shadow-md">
                {initials}
              </div>
              <div className="min-w-0">
                <span className="block truncate text-lg font-bold tracking-tight">Mon profil</span>
                <span className="hidden text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:block">
                  Espace enseignant
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <Button variant="outline" size="sm" className="hidden font-semibold sm:inline-flex" asChild>
              <Link href="/dashboard">
                <LayoutDashboard className="mr-1.5 h-4 w-4" />
                Tableau de bord
              </Link>
            </Button>
            <Button variant="outline" size="icon" className="sm:hidden" asChild aria-label="Tableau de bord">
              <Link href="/dashboard">
                <LayoutDashboard className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-br from-card via-card to-violet-500/[0.08] p-8 shadow-lg ring-1 ring-violet-500/10">
          <div
            className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-fuchsia-500/15 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-violet-500/15 blur-3xl"
            aria-hidden
          />
          <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
              <div
                className="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-3xl font-black tracking-tight text-white shadow-xl shadow-violet-600/30 ring-4 ring-background"
                aria-hidden
              >
                {initials}
              </div>
              <div className="text-center sm:text-left">
                <p className="flex items-center justify-center gap-2 text-sm font-semibold text-violet-600 dark:text-violet-400 sm:justify-start">
                  <Sparkles className="h-4 w-4" />
                  Profil enseignant
                </p>
                <h1 className="mt-2 text-balance text-3xl font-black tracking-tight md:text-4xl">
                  {displayName || 'Bienvenue'}
                </h1>
                <p className="mt-2 max-w-md text-pretty text-muted-foreground">
                  {displayName
                    ? 'Gérez votre identité affichée et consultez votre activité sur SCITI-Quiz.'
                    : 'Ajoutez un nom d’affichage pour personnaliser votre expérience et vos quiz.'}
                </p>
              </div>
            </div>
            <div className="grid w-full max-w-sm grid-cols-2 gap-3 md:w-auto md:shrink-0">
              <div className="rounded-2xl border border-border/80 bg-background/80 px-4 py-3 text-center backdrop-blur-sm">
                <p className="text-2xl font-black tabular-nums text-foreground">{quizCount ?? 0}</p>
                <p className="text-xs font-medium text-muted-foreground">Quiz créés</p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-background/80 px-4 py-3 text-center backdrop-blur-sm">
                <p className="text-2xl font-black tabular-nums text-foreground">{sessionCount ?? 0}</p>
                <p className="text-xs font-medium text-muted-foreground">Sessions animées</p>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card className="overflow-hidden border-border/80 shadow-md">
              <CardHeader className="border-b border-border/60 bg-muted/30 pb-4">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  <CardTitle>Identité</CardTitle>
                </div>
                <CardDescription>
                  Le nom peut apparaître dans l’interface ; l’e-mail sert à la connexion.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Nom affiché
                  </p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {displayName || 'Non défini'}
                  </p>
                </div>
                <ProfileNameForm initialName={profile?.display_name ?? ''} />
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-md">
              <CardHeader className="border-b border-border/60 bg-muted/30 pb-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  <CardTitle>Compte</CardTitle>
                </div>
                <CardDescription>Informations liées à votre authentification.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Adresse e-mail
                  </p>
                  <p className="mt-1 break-all font-medium text-foreground">{email || '—'}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Pour changer l’e-mail, utilisez les paramètres de votre compte Supabase / fournisseur
                    OAuth.
                  </p>
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-dashed border-border bg-muted/15 px-4 py-3">
                  <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Membre depuis
                    </p>
                    <p className="mt-0.5 font-medium capitalize text-foreground">{memberSince}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-border/80 shadow-md lg:sticky lg:top-24">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Raccourcis</CardTitle>
                <CardDescription>Actions fréquentes</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 pt-2">
                <Button
                  asChild
                  className="h-11 justify-start gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 font-semibold text-white shadow-md shadow-violet-500/20"
                >
                  <Link href="/dashboard/create">
                    <Plus className="h-4 w-4" />
                    Nouveau quiz
                  </Link>
                </Button>
                <Button variant="outline" asChild className="h-11 justify-start gap-2 font-medium">
                  <Link href="/dashboard/sessions">
                    <History className="h-4 w-4" />
                    Historique des sessions
                  </Link>
                </Button>
                <Button variant="outline" asChild className="h-11 justify-start gap-2 font-medium">
                  <Link href="/dashboard">
                    <BookOpen className="h-4 w-4" />
                    Mes quiz
                  </Link>
                </Button>
                <Button variant="outline" asChild className="h-11 justify-start gap-2 font-medium">
                  <Link href="/join" target="_blank" rel="noopener noreferrer">
                    <Radio className="h-4 w-4" />
                    Page rejoindre (test)
                  </Link>
                </Button>
                <Button variant="ghost" asChild className="h-11 justify-start gap-2 text-muted-foreground">
                  <Link href="/aide">
                    <HelpCircle className="h-4 w-4" />
                    Aide enseignant
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
