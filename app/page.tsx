'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import { ArrowRight, Play, Users, BarChart3, Zap, Clock, Shield, Check } from 'lucide-react'

export default function LandingPage() {
  const [pinCode, setPinCode] = useState('')

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-foreground rounded-md flex items-center justify-center">
                <span className="text-background font-bold text-sm">Q</span>
              </div>
              <span className="text-lg font-semibold tracking-tight">QuizLive</span>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <a href="#fonctionnalites" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Fonctionnalités</a>
              <a href="#tarifs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Tarifs</a>
              <a href="#temoignages" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Témoignages</a>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/auth/login">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  Connexion
                </Button>
              </Link>
              <Link href="/auth/sign-up">
                <Button size="sm" className="bg-foreground text-background hover:bg-foreground/90">
                  Commencer
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-4xl">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-8 text-balance">
              La plateforme complète pour
              <br />
              <span className="text-muted-foreground">engager vos étudiants</span>
            </h1>

            <p className="text-xl text-muted-foreground max-w-2xl mb-12 leading-relaxed">
              Créez des quiz interactifs en temps réel. Suivez les performances instantanément.
              Exportez vos analyses en PDF. Tout ce dont vous avez besoin pour transformer vos cours.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-16">
              <Link href="/auth/sign-up">
                <Button size="lg" className="bg-foreground text-background hover:bg-foreground/90 gap-2 h-12 px-6 text-base">
                  Créer un compte gratuit <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="gap-2 h-12 px-6 text-base border-border hover:bg-card">
                <Play className="w-4 h-4" /> Voir la démo
              </Button>
            </div>
          </div>

          {/* Quick Join Card */}
          <div className="bg-card border border-border rounded-xl p-6 max-w-md">
            <p className="text-sm text-muted-foreground mb-3">Rejoindre un quiz en cours</p>
            <div className="flex gap-2">
              <Input
                placeholder="Entrez le code PIN"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                className="bg-input border-border text-foreground placeholder:text-muted-foreground"
              />
              <Link href={pinCode ? `/join?pin=${pinCode}` : '/join'}>
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                  Rejoindre
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-6 lg:px-8 border-y border-border">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatBlock value="+85%" label="d'engagement en classe" />
            <StatBlock value="2.4M" label="de quiz créés" />
            <StatBlock value="98%" label="de satisfaction" />
            <StatBlock value="<30s" label="pour lancer un quiz" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="fonctionnalites" className="py-24 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-16">
            <p className="text-sm text-secondary font-medium mb-4">Fonctionnalités</p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
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

      {/* Testimonials Section */}
      <section id="temoignages" className="py-24 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm text-secondary font-medium mb-4">Témoignages</p>
            <h2 className="text-4xl font-bold tracking-tight">
              Ils utilisent QuizLive au quotidien
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <TestimonialCard
              quote="QuizLive a complètement transformé mes cours de mathématiques. Les étudiants sont enfin engagés et attentifs."
              author="Marie Dupont"
              role="Professeure de Mathématiques"
              institution="Lycée Henri IV, Paris"
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
      <section id="tarifs" className="py-24 px-6 lg:px-8 bg-card border-y border-border">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm text-secondary font-medium mb-4">Tarifs</p>
            <h2 className="text-4xl font-bold tracking-tight mb-4">
              Un prix simple, des fonctionnalités complètes
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
              description="Pour découvrir QuizLive"
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
      <section className="py-24 px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Prêt à transformer vos cours ?
          </h2>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Rejoignez des milliers d&apos;enseignants qui utilisent QuizLive pour créer des expériences d&apos;apprentissage engageantes.
          </p>
          <Link href="/auth/sign-up">
            <Button size="lg" className="bg-foreground text-background hover:bg-foreground/90 gap-2 h-14 px-8 text-lg">
              Créer mon compte gratuitement <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-16 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h3 className="font-semibold mb-4">Produit</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><a href="#fonctionnalites" className="hover:text-foreground transition-colors">Fonctionnalités</a></li>
                <li><a href="#tarifs" className="hover:text-foreground transition-colors">Tarifs</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Changelog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Roadmap</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Ressources</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Tutoriels</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Centre d&apos;aide</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Entreprise</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">À propos</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Carrières</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Presse</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Légal</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Confidentialité</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">CGU</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Cookies</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">RGPD</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-foreground rounded flex items-center justify-center">
                <span className="text-background font-bold text-xs">Q</span>
              </div>
              <span className="font-semibold">QuizLive</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 QuizLive. Tous droits réservés. Fait avec passion en France.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function StatBlock({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-3xl md:text-4xl font-bold mb-1">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
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

function CheckItem({ children }: { children: React.ReactNode }) {
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
    <div className="bg-card border border-border rounded-xl p-6">
      <p className="text-muted-foreground mb-6 leading-relaxed">&quot;{quote}&quot;</p>
      <div>
        <p className="font-semibold">{author}</p>
        <p className="text-sm text-muted-foreground">{role}</p>
        <p className="text-sm text-secondary">{institution}</p>
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
    <div className={`rounded-xl p-6 flex flex-col ${highlighted ? 'bg-secondary/10 border-2 border-secondary' : 'bg-background border border-border'}`}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-1">{name}</h3>
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold">{price}</span>
          <span className="text-muted-foreground">{period}</span>
        </div>
      </div>

      <ul className="space-y-3 mb-8 flex-1">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-3 text-sm">
            <Check className="w-4 h-4 text-secondary flex-shrink-0" />
            <span className="text-muted-foreground">{feature}</span>
          </li>
        ))}
      </ul>

      <Link href={href} className="w-full">
        <Button
          className={`w-full ${highlighted ? 'bg-foreground text-background hover:bg-foreground/90' : 'bg-card border border-border hover:bg-muted text-foreground'}`}
        >
          {cta}
        </Button>
      </Link>
    </div>
  )
}
