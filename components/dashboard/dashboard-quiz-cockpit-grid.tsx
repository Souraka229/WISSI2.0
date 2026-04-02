'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteQuiz, duplicateQuiz } from '@/app/actions/quiz'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { BarChart3, Copy, Lightbulb, Pencil, Play, Search, Trash2, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'

export type CockpitQuizRow = {
  id: string
  title: string
  description: string | null
  level: string | null
  theme: string | null
  questionCount: number
  createdAtIso: string
  lastSessionLabel: string | null
}

type LevelFilter = 'all' | 'beginner' | 'intermediate' | 'advanced'

const LEVEL_CHIPS: { value: LevelFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'beginner', label: 'Facile' },
  { value: 'intermediate', label: 'Intermédiaire' },
  { value: 'advanced', label: 'Avancé' },
]

function levelBadgeClass(level: string | null): string {
  switch (level) {
    case 'beginner':
      return 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
    case 'intermediate':
      return 'bg-amber-500/15 text-amber-900 dark:text-amber-200'
    case 'advanced':
      return 'bg-rose-500/15 text-rose-900 dark:text-rose-200'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

function levelLabel(level: string | null): string {
  switch (level) {
    case 'beginner':
      return 'Facile'
    case 'intermediate':
      return 'Intermédiaire'
    case 'advanced':
      return 'Avancé'
    default:
      return level ?? '—'
  }
}

function formatCreatedRelative(iso: string): string {
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

type Props = {
  quizzes: CockpitQuizRow[]
}

export function DashboardQuizCockpitGrid({ quizzes }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [level, setLevel] = useState<LevelFilter>('all')
  const [dupLoading, setDupLoading] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    return quizzes.filter((q) => {
      const matchTitle = !s || q.title.toLowerCase().includes(s)
      const matchLevel = level === 'all' || q.level === level
      return matchTitle && matchLevel
    })
  }, [quizzes, search, level])

  if (quizzes.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-primary/25 bg-gradient-to-b from-violet-500/5 to-background py-20 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20">
          <Lightbulb className="h-10 w-10 text-violet-600 dark:text-violet-400" aria-hidden />
        </div>
        <h2 className="text-2xl font-black tracking-tight">Votre premier quiz vous attend</h2>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          Créez un quiz, ajoutez des questions (IA ou manuel), puis lancez une session avec PIN et QR code.
        </p>
        <Button
          asChild
          size="lg"
          className="mt-8 bg-gradient-to-r from-violet-600 to-fuchsia-600 font-bold text-white shadow-lg shadow-violet-500/25"
        >
          <Link href="/dashboard/create">Créer un quiz</Link>
        </Button>
      </div>
    )
  }

  return (
    <section aria-labelledby="mes-quiz-title" className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="mes-quiz-title" className="text-xl font-black tracking-tight">
          Mes quiz
        </h2>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par titre…"
            className="pl-9"
            aria-label="Filtrer les quiz par titre"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {LEVEL_CHIPS.map((chip) => (
          <button
            key={chip.value}
            type="button"
            onClick={() => setLevel(chip.value)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
              level === chip.value
                ? 'border-violet-500 bg-violet-500/15 text-violet-800 dark:text-violet-200'
                : 'border-border bg-card text-muted-foreground hover:bg-muted/80',
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          Aucun quiz ne correspond à ce filtre.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((quiz) => (
            <article
              key={quiz.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:border-violet-500/30 hover:shadow-md"
            >
              <div className="flex h-24 items-center justify-center bg-gradient-to-br from-violet-500/15 via-fuchsia-500/10 to-orange-500/10">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-background/80 shadow-inner ring-1 ring-border">
                  <BarChart3 className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                </div>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="line-clamp-1 flex-1 text-lg font-bold">{quiz.title}</h3>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                      levelBadgeClass(quiz.level),
                    )}
                  >
                    {levelLabel(quiz.level)}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {quiz.description || 'Ajoutez une description dans l’éditeur.'}
                </p>

                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <p>
                    <span className="font-semibold text-foreground">{quiz.questionCount}</span>{' '}
                    {quiz.questionCount === 1 ? 'question' : 'questions'}
                  </p>
                  <p>Créé {formatCreatedRelative(quiz.createdAtIso)}</p>
                  <p>
                    Dernière session :{' '}
                    <span className="font-medium text-foreground">
                      {quiz.lastSessionLabel ?? 'Jamais lancé'}
                    </span>
                  </p>
                </div>

                {quiz.theme && (
                  <span className="mt-3 inline-flex w-fit rounded-full bg-accent/20 px-2.5 py-1 text-xs font-medium text-accent-foreground">
                    {quiz.theme}
                  </span>
                )}

                <div className="mt-4 grid grid-cols-4 gap-1.5">
                  <Button variant="outline" size="icon" className="h-9 shrink-0" asChild title="Éditer">
                    <Link href={`/dashboard/quiz/${quiz.id}`} aria-label={`Éditer ${quiz.title}`}>
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    size="icon"
                    className="h-9 shrink-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md"
                    asChild
                    title="Lancer"
                  >
                    <Link href={`/dashboard/launch/${quiz.id}`} aria-label={`Lancer ${quiz.title}`}>
                      <Play className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-9 shrink-0"
                    disabled={dupLoading === quiz.id}
                    title="Dupliquer"
                    aria-label={`Dupliquer ${quiz.title}`}
                    onClick={async () => {
                      setDupLoading(quiz.id)
                      try {
                        const res = await duplicateQuiz(quiz.id)
                        if (res.success) {
                          router.push(`/dashboard/quiz/${res.newId}`)
                          router.refresh()
                        } else {
                          console.error(res.error)
                        }
                      } finally {
                        setDupLoading(null)
                      }
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 shrink-0 text-muted-foreground hover:text-destructive"
                        title="Supprimer"
                        aria-label={`Supprimer ${quiz.title}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer ce quiz ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          « {quiz.title} » et toutes ses questions seront supprimés. Irréversible.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={async () => {
                            try {
                              await deleteQuiz(quiz.id)
                              router.refresh()
                            } catch (err) {
                              console.error(err)
                            }
                          }}
                        >
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                <div className="mt-2 flex border-t border-border pt-3">
                  <Button variant="ghost" size="sm" className="flex-1 gap-1 text-xs" asChild>
                    <Link href="/join">
                      <UserPlus className="h-3.5 w-3.5" />
                      Côté élève (/join)
                    </Link>
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
