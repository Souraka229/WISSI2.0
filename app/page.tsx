'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import {
  ArrowRight,
  Play,
  Users,
  BarChart3,
  Zap,
  Clock,
  Shield,
  Check,
  Sparkles,
  Radio,
  LayoutList,
} from 'lucide-react'
import { SiteFooter } from '@/components/landing/site-footer'

export default function LandingPage() {
  const [pinCode, setPinCode] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    void supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        aria-hidden
      >
        <div className="absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,oklch(0.55_0.22_270/0.18),transparent_65%)] dark:bg-[radial-gradient(ellipse_at_center,oklch(0.55_0.22_270/0.25),transparent_65%)]" />
        <div className="absolute top-[40vh] right-[-20%] h-[380px] w-[380px] rounded-full bg-[radial-gradient(circle,oklch(0.65_0.2_320/0.12),transparent_70%)]" />
      </div>

      {/* Navigation */}
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-border/60 bg-background/75 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 text-sm font-black text-white shadow-md shadow-violet-500/25">
                Q
              </div>
              <span className="text-lg font-bold tracking-tight">SCITI-Quiz</span>
            </Link>

            <div className="hidden items-center gap-8 md:flex">
              <a
                href="#comment-ca-marche"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Comment ça marche
              </a>
              <a
                href="#fonctionnalites"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Fonctionnalités
              </a>
              <a
                href="#tarifs"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Tarifs
              </a>
              <a
                href="#temoignages"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Témoignages
              </a>
            </div>

            <div className="flex items-center gap-3">
              <ThemeSwitcher />
              {authLoading ? (
                <div className="h-8 w-20 animate-pulse rounded-md bg-muted" aria-hidden />
              ) : user ? (
                <Link href="/dashboard">
                  <Button
                    size="sm"
                    className="gap-2 bg-foreground text-background hover:bg-foreground/90"
                  >
                    Mon tableau de bord
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/auth/login">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Connexion
                    </Button>
                  </Link>
                  <Link href="/auth/sign-up">
                    <Button
                      size="sm"
                      className="bg-foreground text-background hover:bg-foreground/90"
                    >
                      Commencer
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-6 pb-20 pt-28 lg:px-8 lg:pt-32">
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12">
          <div className="max-w-3xl">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-violet-800 dark:text-violet-200">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Plateforme quiz live · SCITI / WISSI
            </p>
            <h1 className="mb-8 text-balance text-5xl font-black tracking-tight text-foreground md:text-6xl lg:text-7xl lg:leading-[1.05]">
              Créez. Lancez.{' '}
              <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent dark:from-violet-400 dark:to-fuchsia-400">
                Analysez.
              </span>
            </h1>

            <p className="mb-10 max-w-xl text-lg leading-relaxed text-muted-foreground md:text-xl">
              QCM en direct, PIN & QR code, classement live et exports — pensé pour les enseignants qui veulent
              captiver la salle, pas perdre du temps dans les outils.
            </p>

            <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
              <Link href="/auth/sign-up">
                <Button
                  size="lg"
                  className="h-12 gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-7 text-base font-bold text-white shadow-lg shadow-violet-500/25 hover:opacity-95"
                >
                  Créer un compte gratuit <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/join">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 border-border/80 bg-background/50 px-7 text-base font-semibold backdrop-blur-sm"
                  type="button"
                >
                  <Play className="h-4 w-4" /> Rejoindre avec un PIN
                </Button>
              </Link>
            </div>

            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Déjà utilisé dans des cours · UAC · SCITI · formations pro
            </p>
          </div>

          {/* Quick Join + mock card */}
          <div className="flex flex-col gap-5">
            <div className="rounded-2xl border border-border/80 bg-card/90 p-6 shadow-xl shadow-violet-500/5 backdrop-blur-sm dark:bg-card/80">
              <p className="mb-3 text-sm font-semibold text-foreground">Rejoindre un quiz en cours</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  placeholder="Code PIN (ex. 123456)"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  className="h-11 border-border/80 bg-background/80"
                />
                <Link href={pinCode ? `/join?pin=${encodeURIComponent(pinCode)}` : '/join'} className="shrink-0">
                  <Button className="h-11 w-full bg-violet-600 font-semibold text-white hover:bg-violet-600/90 sm:w-auto">
                    Rejoindre
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card to-violet-500/[0.06] p-6 shadow-lg">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-fuchsia-500/10 blur-2xl" aria-hidden />
              <div className="relative">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Aperçu animateur</p>
                    <p className="text-lg font-bold tracking-tight">Session · Thermodynamique L2</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    En direct
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-md bg-muted/80 px-2 py-1 font-medium text-foreground">12 questions</span>
                  <span className="rounded-md bg-muted/80 px-2 py-1">Intermédiaire</span>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">4 sessions</span> · 87 étudiants touchés cette
                  semaine
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-border/80 bg-muted/20 py-16 dark:bg-muted/10">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-0 md:divide-x md:divide-border/60">
            <StatBlock value="+85%" label="d'engagement en classe" />
            <StatBlock value="Live" label="sessions multijoueur" />
            <StatBlock value="IA" label="génération de QCM" />
            <StatBlock value="< 2 min" label="pour un premier quiz" />
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section
        id="comment-ca-marche"
        className="scroll-mt-24 px-6 py-24 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">
              Comment ça marche
            </p>
            <h2 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
              Trois étapes, zéro prise de tête
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            <StepCard
              step="01"
              icon={<LayoutList className="h-6 w-6" />}
              title="Créez votre quiz"
              description="Manuellement, par import JSON ou avec l’IA — thème, niveau et questions en quelques minutes."
            />
            <StepCard
              step="02"
              icon={<Radio className="h-6 w-6" />}
              title="Lancez la session"
              description="PIN + QR code : les étudiants rejoignent sur /join depuis leur téléphone, sans compte."
            />
            <StepCard
              step="03"
              icon={<BarChart3 className="h-6 w-6" />}
              title="Analysez les résultats"
              description="Classement, stats par question, exports CSV / PDF pour le suivi et le conseil pédagogique."
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="fonctionnalites" className="scroll-mt-24 px-6 py-24 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 max-w-2xl">
            <p
              id="changelog"
              className="mb-4 scroll-mt-28 text-sm font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400"
            >
              Fonctionnalités & nouveautés
            </p>
            <h2 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl">
              Tout pour créer des expériences
              <br />
              <span className="text-muted-foreground">d&apos;apprentissage mémorables</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Zap className="w-5 h-5" />}
              title="Génération IA"
              description="Créez des quiz complets en quelques secondes grâce à notre moteur SuperPrompt. QCM, vrai/faux, réponses courtes - tout est généré automatiquement."
            />
            <FeatureCard
              icon={<Users className="w-5 h-5" />}
              title="Sessions en direct"
              description="Lancez des sessions interactives avec un simple code PIN. Vos étudiants rejoignent depuis n'importe quel appareil, sans inscription."
            />
            <FeatureCard
              icon={<BarChart3 className="w-5 h-5" />}
              title="Analyses avancées"
              description="Suivez les performances en temps réel. Identifiez les lacunes, mesurez les progrès et exportez vos rapports en PDF ou CSV."
            />
            <FeatureCard
              icon={<Clock className="w-5 h-5" />}
              title="Modes de scoring"
              description="Classique, précision ou vitesse - choisissez comment vos étudiants sont évalués. Personnalisez les points et les temps par question."
            />
            <FeatureCard
              icon={<Shield className="w-5 h-5" />}
              title="Sécurité enterprise"
              description="Données hébergées en Europe. Conformité RGPD. Authentification sécurisée. Vos données et celles de vos étudiants sont protégées."
            />
            <FeatureCard
              icon={<Play className="w-5 h-5" />}
              title="Gamification"
              description="Réactions en direct, séries de bonnes réponses, classements dynamiques. Transformez l'apprentissage en compétition engageante."
            />
          </div>
        </div>
      </section>

      {/* Demo Preview Section */}
      <section className="py-24 px-6 lg:px-8 bg-card border-y border-border">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-sm text-secondary font-medium mb-4">Interface intuitive</p>
              <h2 className="text-4xl font-bold tracking-tight mb-6">
                Créez votre premier quiz en moins de 2 minutes
              </h2>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Notre éditeur visuel vous guide étape par étape. Ajoutez des questions, personnalisez les options,
                définissez les temps - tout est pensé pour être simple et rapide.
              </p>

              <ul className="space-y-4">
                <CheckItem>Importez vos questions depuis un fichier existant</CheckItem>
                <CheckItem>Générez automatiquement avec l&apos;IA</CheckItem>
                <CheckItem>Prévisualisez en temps réel</CheckItem>
                <CheckItem>Partagez via WhatsApp ou QR code</CheckItem>
              </ul>
            </div>

            {/* Mock UI Preview */}
            <div className="bg-background border border-border rounded-xl overflow-hidden">
              <div className="border-b border-border px-4 py-3 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-destructive/60" />
                <div className="w-3 h-3 rounded-full bg-accent/60" />
                <div className="w-3 h-3 rounded-full bg-chart-3/60" />
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Quiz en cours</p>
                      <p className="text-lg font-semibold">Histoire de France - Révolution</p>
                    </div>
                    <div className="bg-accent/20 text-accent px-3 py-1 rounded-full text-sm font-medium">
                      12 participants
                    </div>
                  </div>

                  <div className="bg-input rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-2">Question 3/10</p>
                    <p className="font-medium mb-4">En quelle année a eu lieu la prise de la Bastille ?</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-card border border-border rounded-lg p-3 text-center hover:border-secondary transition-colors cursor-pointer">
                        1789
                      </div>
                      <div className="bg-card border border-border rounded-lg p-3 text-center hover:border-secondary transition-colors cursor-pointer">
                        1792
                      </div>
                      <div className="bg-card border border-border rounded-lg p-3 text-center hover:border-secondary transition-colors cursor-pointer">
                        1799
                      </div>
                      <div className="bg-card border border-border rounded-lg p-3 text-center hover:border-secondary transition-colors cursor-pointer">
                        1804
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Temps restant</span>
                    <span className="text-accent font-mono font-semibold">00:18</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* À propos */}
      <section
        id="apropos"
        className="scroll-mt-24 border-y border-border/80 bg-gradient-to-br from-violet-500/[0.06] to-transparent px-6 py-20 lg:px-8"
      >
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-2xl font-black tracking-tight text-foreground md:text-3xl">
            Une initiative pédagogique SCITI / WISSI
          </h2>
          <p className="leading-relaxed text-muted-foreground">
            SCITI-Quiz est conçu pour les enseignants africains et francophones : sessions stables, faible bande
            passante, et parcours clairs du premier quiz au bilan de session. L’objectif est simple — plus
            d’engagement en salle, moins de friction technique.
          </p>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="temoignages" className="scroll-mt-24 px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">
              Témoignages
            </p>
            <h2 className="text-4xl font-bold tracking-tight">
              Enseignants et étudiants témoignent
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <TestimonialCard
              quote="J'aime bien utiliser SCITI-Quiz parce qu'il permet d'apprendre en s'amusant, en se challengeant — et c'est top !"
              author="OBINE Tobi Roderick"
              role="Étudiant"
              institution="Seme City"
            />
            <TestimonialCard
              quote="L'export PDF des résultats me fait gagner des heures chaque semaine. Je peux enfin me concentrer sur l'enseignement."
              author="Thomas Bernard"
              role="Maître de Conférences"
              institution="Université de Lyon"
            />
            <TestimonialCard
              quote="La génération IA est bluffante. Je crée un quiz complet en 30 secondes à partir de mes notes de cours."
              author="Sophie Martin"
              role="Formatrice Entreprise"
              institution="ESCP Business School"
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="tarifs" className="scroll-mt-24 border-y border-border bg-card px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">
              Tarifs
            </p>
            <h2 id="roadmap" className="mb-4 scroll-mt-28 text-4xl font-bold tracking-tight">
              Un prix simple — roadmap produit transparente
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Commencez gratuitement. Passez à Pro quand vous êtes prêt.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <PricingCard
              name="Gratuit"
              price="0€"
              period=""
              description="Pour découvrir SCITI-Quiz"
              features={[
                '3 quiz actifs',
                '25 participants max',
                'Statistiques basiques',
                'Support communauté',
              ]}
              cta="Commencer gratuitement"
              href="/auth/sign-up"
            />
            <PricingCard
              name="Pro"
              price="19€"
              period="/mois"
              description="Pour les enseignants actifs"
              features={[
                'Quiz illimités',
                'Participants illimités',
                'Génération IA illimitée',
                'Export PDF & CSV',
                'Statistiques avancées',
                'Support prioritaire',
              ]}
              cta="Essai gratuit 14 jours"
              href="/auth/sign-up"
              highlighted
            />
            <PricingCard
              name="École"
              price="Sur devis"
              period=""
              description="Pour les établissements"
              features={[
                'Tout de Pro',
                'Gestion multi-enseignants',
                'SSO / LDAP',
                'API personnalisée',
                'Formation dédiée',
                'SLA garanti',
              ]}
              cta="Contacter les ventes"
              href="mailto:contact@quizlive.app"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-6 text-4xl font-black tracking-tight text-foreground md:text-5xl">
            Prêt à animer votre prochain cours ?
          </h2>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground">
            Créez un compte gratuit, composez un quiz et lancez une session en quelques minutes. Vos étudiants
            rejoignent avec un simple code.
          </p>
          <Link href="/auth/sign-up">
            <Button
              size="lg"
              className="h-14 gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-8 text-lg font-bold text-white shadow-lg shadow-violet-500/25 hover:opacity-95"
            >
              Créer mon compte gratuitement <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}

function StatBlock({ value, label }: { value: string; label: string }) {
  return (
    <div className="px-2 text-center md:px-6">
      <p className="mb-1 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-3xl font-black tracking-tight text-transparent md:text-4xl dark:from-white dark:to-white/80">
        {value}
      </p>
      <p className="text-xs font-medium text-muted-foreground md:text-sm">{label}</p>
    </div>
  )
}

function StepCard({
  step,
  icon,
  title,
  description,
}: {
  step: string
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card/80 p-8 shadow-sm transition-all duration-300 hover:border-violet-500/30 hover:shadow-md">
      <div className="absolute -right-6 -top-6 text-8xl font-black tabular-nums text-violet-500/[0.07] transition-colors group-hover:text-violet-500/[0.12] dark:text-violet-400/[0.09]">
        {step}
      </div>
      <div className="relative">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/15 to-fuchsia-500/10 text-violet-700 dark:text-violet-300">
          {icon}
        </div>
        <h3 className="mb-3 text-xl font-bold tracking-tight text-foreground">{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 hover:border-secondary/50 transition-colors">
      <div className="w-10 h-10 bg-secondary/20 rounded-lg flex items-center justify-center mb-4 text-secondary">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </div>
  )
}

function CheckItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <div className="w-5 h-5 bg-secondary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
        <Check className="w-3 h-3 text-secondary" />
      </div>
      <span className="text-muted-foreground">{children}</span>
    </li>
  )
}

function TestimonialCard({ quote, author, role, institution }: { quote: string; author: string; role: string; institution: string }) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card/80 p-6 shadow-sm transition-shadow hover:shadow-md">
      <p className="mb-6 leading-relaxed text-muted-foreground">&ldquo;{quote}&rdquo;</p>
      <div>
        <p className="font-bold text-foreground">{author}</p>
        <p className="text-sm text-muted-foreground">{role}</p>
        <p className="text-sm font-medium text-violet-600 dark:text-violet-400">{institution}</p>
      </div>
    </div>
  )
}

function PricingCard({
  name,
  price,
  period,
  description,
  features,
  cta,
  href,
  highlighted = false,
}: {
  name: string
  price: string
  period: string
  description: string
  features: string[]
  cta: string
  href: string
  highlighted?: boolean
}) {
  return (
    <div
      className={`flex flex-col rounded-2xl p-6 ${
        highlighted
          ? 'relative border-2 border-violet-500/50 bg-gradient-to-b from-violet-500/10 to-card shadow-lg shadow-violet-500/10'
          : 'border border-border/80 bg-background/80'
      }`}
    >
      {highlighted ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-0.5 text-xs font-bold text-white shadow-md">
          Populaire
        </span>
      ) : null}
      <div className="mb-6 pt-1">
        <h3 className="mb-1 text-lg font-bold">{name}</h3>
        <p className="mb-4 text-sm text-muted-foreground">{description}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-black tracking-tight">{price}</span>
          <span className="text-muted-foreground">{period}</span>
        </div>
      </div>

      <ul className="mb-8 flex-1 space-y-3">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-3 text-sm">
            <Check className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400" />
            <span className="text-muted-foreground">{feature}</span>
          </li>
        ))}
      </ul>

      <Link href={href} className="w-full">
        <Button
          className={`w-full font-semibold ${
            highlighted
              ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:opacity-95'
              : 'border border-border bg-background hover:bg-muted'
          }`}
        >
          {cta}
        </Button>
      </Link>
    </div>
  )
}
