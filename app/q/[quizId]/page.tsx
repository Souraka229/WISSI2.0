import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchPublicQuizPreview } from '@/lib/public-quiz-preview'
import { getSiteUrl } from '@/lib/site-url'
import { Button } from '@/components/ui/button'
import { ArrowRight, BookOpen, Sparkles } from 'lucide-react'

type PageProps = { params: Promise<{ quizId: string }> }

function levelLabel(level: string | null): string {
  switch (level) {
    case 'beginner':
      return 'Débutant'
    case 'intermediate':
      return 'Intermédiaire'
    case 'advanced':
      return 'Avancé'
    default:
      return level ?? '—'
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { quizId } = await params
  const preview = await fetchPublicQuizPreview(quizId)
  if (!preview) {
    return { title: 'Quiz introuvable', robots: { index: false } }
  }
  const site = getSiteUrl()
  const url = `${site}/q/${quizId}`
  const desc =
    preview.description?.trim() ||
    `Quiz interactif — ${preview.question_count} question${preview.question_count !== 1 ? 's' : ''} sur SCITI-Quiz. Rejoignez une session avec le code de votre professeur.`

  return {
    title: preview.title,
    description: desc,
    alternates: { canonical: url },
    openGraph: {
      title: `${preview.title} | SCITI-Quiz`,
      description: desc,
      url,
      type: 'website',
      locale: 'fr_FR',
    },
    twitter: {
      card: 'summary_large_image',
      title: preview.title,
      description: desc,
    },
    robots: { index: true, follow: true },
  }
}

export default async function PublicQuizPage({ params }: PageProps) {
  const { quizId } = await params
  const preview = await fetchPublicQuizPreview(quizId)
  if (!preview) {
    notFound()
  }

  const site = getSiteUrl()

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-emerald-500/[0.12] via-background to-violet-500/[0.08]">
      <div className="mx-auto max-w-lg px-4 py-14 sm:py-20">
        <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
          SCITI-Quiz
        </p>
        <h1 className="mt-3 text-balance text-center text-3xl font-black tracking-tight text-foreground sm:text-4xl">
          {preview.title}
        </h1>
        {preview.description ? (
          <p className="mt-4 text-center text-pretty text-muted-foreground">{preview.description}</p>
        ) : null}

        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {preview.theme ? (
            <span className="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-semibold text-violet-900 dark:text-violet-200">
              {preview.theme}
            </span>
          ) : null}
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
            {levelLabel(preview.level)}
          </span>
          <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-900 dark:text-emerald-200">
            {preview.question_count} question{preview.question_count !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="mt-12 rounded-2xl border border-border bg-card/90 p-6 shadow-lg backdrop-blur-sm">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20">
              <Sparkles className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="font-bold text-foreground">Comment jouer ?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Votre enseignant lance une session et vous communique un <strong>code PIN</strong> (et souvent un QR
                code). Ce lien ne contient pas les questions : il sert seulement à faire découvrir le quiz.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <Button
              asChild
              size="lg"
              className="h-12 w-full gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 font-bold text-white shadow-lg"
            >
              <Link href="/join">
                Rejoindre une session
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 w-full gap-2 font-semibold">
              <Link href="/">
                <BookOpen className="h-4 w-4" />
                Découvrir SCITI-Quiz
              </Link>
            </Button>
          </div>
        </div>

        <p className="mt-10 text-center text-[11px] text-muted-foreground">
          Partagé depuis{' '}
          <a href={site} className="underline underline-offset-2 hover:text-foreground">
            {site.replace(/^https?:\/\//, '')}
          </a>
        </p>
      </div>
    </div>
  )
}
