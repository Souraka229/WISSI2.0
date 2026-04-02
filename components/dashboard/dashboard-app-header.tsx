'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { LogOut, HelpCircle, User, History, Sparkles, Zap, Flame } from 'lucide-react'

type Props = {
  userEmail: string | null | undefined
}

/** En-tête espace prof : marque, navigation, bandeau stickers live (décor + modes). */
export function DashboardAppHeader({ userEmail }: Props) {
  const email = userEmail?.trim() ?? ''

  return (
    <header className="sticky top-0 z-40 border-b border-violet-500/15 bg-gradient-to-b from-card/95 via-background/90 to-background/85 shadow-[0_8px_30px_-12px_rgba(124,58,237,0.25)] backdrop-blur-xl">
      <div className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute -right-20 -top-24 h-48 w-64 rotate-12 rounded-full bg-fuchsia-500/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-16 top-0 h-40 w-40 rounded-full bg-violet-500/10 blur-2xl"
          aria-hidden
        />

        <div className="relative mx-auto flex h-[4.25rem] max-w-7xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6 lg:px-8">
          <Link
            href="/dashboard"
            className="group flex min-w-0 items-center gap-3 rounded-2xl pr-2 transition-opacity hover:opacity-95"
          >
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-orange-500 text-lg font-black text-white shadow-lg shadow-violet-500/35 ring-2 ring-white/20">
              <span className="relative z-10">Q</span>
              <span className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <div className="min-w-0 text-left">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                <span className="text-lg font-black tracking-tight text-foreground sm:text-xl">
                  SCITI-Quiz
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-200">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  Live
                </span>
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:text-[11px]">
                Espace professeur
              </p>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Button variant="ghost" size="icon" className="touch-manipulation sm:hidden" asChild>
              <Link href="/dashboard/sessions" aria-label="Mes sessions">
                <History className="h-5 w-5" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" className="touch-manipulation sm:hidden" asChild>
              <Link href="/aide" aria-label="Aide enseignant">
                <HelpCircle className="h-5 w-5" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="hidden gap-2 rounded-full font-semibold sm:inline-flex"
              asChild
            >
              <Link href="/dashboard/sessions">
                <History className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                Mes sessions
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="hidden gap-2 rounded-full font-semibold sm:inline-flex"
              asChild
            >
              <Link href="/aide">
                <HelpCircle className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                Aide
              </Link>
            </Button>
            <ThemeSwitcher />
            <Button variant="ghost" size="icon" className="touch-manipulation" asChild aria-label="Mon profil">
              <Link href="/dashboard/profile">
                <User className="h-5 w-5" />
              </Link>
            </Button>
            {email ? (
              <span
                className="hidden max-w-[min(200px,28vw)] truncate text-xs text-muted-foreground lg:block"
                title={email}
              >
                {email}
              </span>
            ) : null}
            <form action="/api/auth/signout" method="post">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 rounded-full text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Déconnexion</span>
              </Button>
            </form>
          </div>
        </div>

        {/* Stickers modes live (rappel visuel — pas l’état d’une session en cours) */}
        <div className="relative border-t border-border/60 bg-muted/20 px-4 py-2 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Modes live
            </span>
            <span className="dashboard-live-sticker inline-flex items-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-500/12 px-2.5 py-1 text-[11px] font-bold text-emerald-900 dark:text-emerald-100">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              Classe
            </span>
            <span className="dashboard-live-sticker inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/12 px-2.5 py-1 text-[11px] font-bold text-amber-950 dark:text-amber-100">
              <Zap className="h-3.5 w-3.5 shrink-0" />
              Double quiz
            </span>
            <span className="dashboard-live-sticker dashboard-live-sticker--hot inline-flex items-center gap-1.5 rounded-full border border-fuchsia-500/45 bg-gradient-to-r from-fuchsia-500/15 to-orange-500/10 px-2.5 py-1 text-[11px] font-bold text-violet-950 dark:text-fuchsia-100">
              <Flame className="h-3.5 w-3.5 shrink-0 text-orange-600 dark:text-orange-400" />
              Hackathon
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
