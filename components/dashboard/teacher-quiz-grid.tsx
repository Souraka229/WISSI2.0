'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { deleteQuiz } from '@/app/actions/quiz'
import { Button } from '@/components/ui/button'
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
import { BarChart3, Play, Settings, Trash2, Sparkles, UserPlus } from 'lucide-react'

export type TeacherQuizRow = {
  id: string
  title: string
  description: string | null
  level: string | null
  theme: string | null
  questionCount?: number
}

type Props = {
  quizzes: TeacherQuizRow[]
}

export function TeacherQuizGrid({ quizzes }: Props) {
  const router = useRouter()

  if (quizzes.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-primary/25 bg-gradient-to-b from-violet-500/5 to-background py-20 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20">
          <Sparkles className="h-10 w-10 text-violet-600 dark:text-violet-400" />
        </div>
        <h2 className="text-2xl font-black tracking-tight">Votre première session commence ici</h2>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          Créez un quiz, ajoutez des questions (ou importez via SuperPrompt), puis lancez une partie avec
          PIN et QR code.
        </p>
        <Button
          asChild
          size="lg"
          className="mt-8 bg-gradient-to-r from-violet-600 to-fuchsia-600 font-bold text-white shadow-lg shadow-violet-500/25"
        >
          <Link href="/dashboard/create">Créer mon premier quiz</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {quizzes.map((quiz) => {
        return (
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
              <h3 className="line-clamp-1 text-lg font-bold">{quiz.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {quiz.description || 'Ajoutez une description dans l’éditeur.'}
              </p>

              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">
                  {quiz.questionCount ?? 0}{' '}
                  {(quiz.questionCount ?? 0) === 1 ? 'question' : 'questions'}
                </span>
                {quiz.level && (
                  <span className="rounded-full bg-secondary/15 px-2.5 py-1 font-medium text-secondary-foreground">
                    {quiz.level}
                  </span>
                )}
                {quiz.theme && (
                  <span className="rounded-full bg-accent/20 px-2.5 py-1 font-medium text-accent-foreground">
                    {quiz.theme}
                  </span>
                )}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="gap-1.5 font-semibold" asChild>
                  <Link href={`/dashboard/quiz/${quiz.id}`}>
                    <Settings className="h-4 w-4" />
                    Modifier
                  </Link>
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 font-bold text-white shadow-md"
                  asChild
                >
                  <Link href={`/dashboard/launch/${quiz.id}`}>
                    <Play className="h-4 w-4" />
                    Lancer
                  </Link>
                </Button>
              </div>

              <div className="mt-2 flex gap-2 border-t border-border pt-3">
                <Button variant="ghost" size="sm" className="flex-1 gap-1 text-xs" asChild>
                  <Link href="/join">
                    <UserPlus className="h-3.5 w-3.5" />
                    Côté élève (/join)
                  </Link>
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Supprimer ${quiz.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer ce quiz ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        « {quiz.title} » et toutes ses questions seront supprimés. Cette action est
                        irréversible.
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
            </div>
          </article>
        )
      })}
    </div>
  )
}
