import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MonitorPlay, QrCode, Users, Zap } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Aide enseignant',
  description:
    'Guide pas à pas SCITI-Quiz : créer un quiz, ajouter des questions, lancer une session live et utiliser le pupitre.',
  robots: { index: true, follow: true },
}

const steps = [
  {
    title: 'Créer un quiz',
    body: 'Tableau de bord → Nouveau quiz. Renseignez le titre (obligatoire), la description, puis les raccourcis thème / niveau si vous voulez aller vite.',
    href: '/dashboard/create',
    cta: 'Créer un quiz',
  },
  {
    title: 'Ajouter des questions',
    body: 'Ouvrez votre quiz → section SuperPrompt : copiez le texte pour ChatGPT, collez le JSON reçu, ou utilisez la génération serveur si une clé API est configurée. Vous pouvez aussi cliquer sur « Ajouter une question » pour saisir à la main.',
    href: '/dashboard',
    cta: 'Retour au tableau de bord',
  },
  {
    title: 'Lancer la session',
    body: 'Sur la carte du quiz, Lancer → choisissez le mode : challenge libre, double défi (2 quiz) ou hackathon live (2 quiz, rythme intense). Des stickers « Live » s’affichent sur le pupitre et chez les élèves. Puis code PIN et QR code.',
    href: '/dashboard',
    cta: 'Voir mes quiz',
  },
  {
    title: 'Pendant le cours',
    body: 'Ouvrez le pupitre pour démarrer, afficher le classement et enchaîner les questions. Les élèves rejoignent avec le PIN ou le QR et choisissent un pseudo.',
    href: '/join',
    cta: 'Voir la page élève',
  },
]

export default function AidePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-500/6 to-background">
      <header className="border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard" aria-label="Retour tableau de bord">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-black tracking-tight">Aide enseignant</h1>
            <p className="text-sm text-muted-foreground">SCITI-Quiz — les bases en une lecture</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-10 px-4 py-10">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Zap className="h-5 w-5 text-violet-600" />
            En résumé
          </h2>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
              Les élèves n’ont pas besoin de compte : ils entrent le PIN (ou scannent le QR) sur{' '}
              <Link href="/join" className="font-semibold text-foreground underline-offset-2 hover:underline">
                /join
              </Link>
              .
            </li>
            <li className="flex gap-2">
              <QrCode className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
              Le QR et le PIN s’affichent après le lancement et sur le pupitre tant que la session n’est pas
              terminée.
            </li>
            <li className="flex gap-2">
              <MonitorPlay className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
              Vous pilotez le rythme (questions, classement, fin) depuis le pupitre animateur.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-bold">Les 4 étapes</h2>
          <ol className="space-y-6">
            {steps.map((s, i) => (
              <li
                key={s.title}
                className="rounded-2xl border border-border bg-card p-6 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-sm font-black text-violet-700 dark:text-violet-300">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-foreground">{s.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                    <Button variant="outline" size="sm" className="mt-4 font-semibold" asChild>
                      <Link href={s.href}>{s.cta}</Link>
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <div className="pb-8 text-center">
          <Button asChild className="bg-gradient-to-r from-violet-600 to-fuchsia-600 font-bold text-white">
            <Link href="/dashboard">Retour au tableau de bord</Link>
          </Button>
        </div>
      </main>
    </div>
  )
}
