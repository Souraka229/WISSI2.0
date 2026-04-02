import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { HelpCircle, PlayCircle, Sparkles } from 'lucide-react'

type Props = {
  quizCount: number
}

/** Rappels et raccourcis pour gagner du temps en cours ou en préparation. */
export function TeacherComfortZone({ quizCount }: Props) {
  return (
    <section
      className="mb-10 rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/8 via-background to-fuchsia-500/8 p-6 shadow-sm"
      aria-labelledby="comfort-zone-title"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2
            id="comfort-zone-title"
            className="flex items-center gap-2 text-lg font-black tracking-tight text-foreground"
          >
            <Sparkles className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            Facilitateur prof
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Tout est pensé pour aller vite : créer, remplir le quiz (IA ou à la main), lancer, afficher le
            PIN / QR, piloter depuis le pupitre.
          </p>
        </div>
        <Button variant="outline" size="sm" className="shrink-0 gap-2 font-semibold" asChild>
          <Link href="/aide">
            <HelpCircle className="h-4 w-4" />
            Aide pas à pas
          </Link>
        </Button>
      </div>

      <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <li className="flex gap-3 rounded-xl border border-border bg-card/80 p-4 text-sm shadow-sm">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-sm font-black text-violet-700 dark:text-violet-300">
            1
          </span>
          <div>
            <p className="font-bold text-foreground">Créer un quiz</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Titre + thème en un clic.</p>
            <Button variant="link" className="mt-1 h-auto p-0 text-xs font-semibold" asChild>
              <Link href="/dashboard/create">Nouveau quiz →</Link>
            </Button>
          </div>
        </li>
        <li className="flex gap-3 rounded-xl border border-border bg-card/80 p-4 text-sm shadow-sm">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-fuchsia-500/15 text-sm font-black text-fuchsia-700 dark:text-fuchsia-300">
            2
          </span>
          <div>
            <p className="font-bold text-foreground">Remplir les questions</p>
            <p className="mt-0.5 text-xs text-muted-foreground">ChatGPT + import JSON ou saisie manuelle.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {quizCount > 0 ? (
                <>
                  Vous avez <strong>{quizCount}</strong> quiz — ouvrez-en un et descendez à « SuperPrompt ».
                </>
              ) : (
                <>Créez d’abord un quiz, puis ouvrez-le pour ajouter des questions.</>
              )}
            </p>
          </div>
        </li>
        <li className="flex gap-3 rounded-xl border border-border bg-card/80 p-4 text-sm shadow-sm">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500/15 text-sm font-black text-orange-700 dark:text-orange-300">
            3
          </span>
          <div>
            <p className="font-bold text-foreground">Lancer la session</p>
            <p className="mt-0.5 text-xs text-muted-foreground">PIN + QR pour les élèves.</p>
            <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <PlayCircle className="h-3.5 w-3.5" />
              Bouton <strong>Lancer</strong> sur chaque carte quiz.
            </span>
          </div>
        </li>
        <li className="flex gap-3 rounded-xl border border-border bg-card/80 p-4 text-sm shadow-sm">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-sm font-black text-emerald-700 dark:text-emerald-300">
            4
          </span>
          <div>
            <p className="font-bold text-foreground">Pupitre + élèves</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Ouvrez le pupitre ; les élèves vont sur /join.</p>
            <Button variant="link" className="mt-1 h-auto p-0 text-xs font-semibold" asChild>
              <Link href="/join">Tester la page élève →</Link>
            </Button>
          </div>
        </li>
      </ol>
    </section>
  )
}
