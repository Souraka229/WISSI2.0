'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import type { SuperadminDashboardPayload } from '@/lib/superadmin/load-dashboard'
import {
  Activity,
  BarChart3,
  BookOpen,
  Cookie,
  Database,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  Radio,
  Shield,
  Users,
} from 'lucide-react'

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('fr-FR')
  } catch {
    return iso
  }
}

function formatJson(meta: unknown, max = 160): string {
  if (meta == null) return '—'
  try {
    const s = JSON.stringify(meta)
    return s.length > max ? `${s.slice(0, max)}…` : s
  } catch {
    return String(meta)
  }
}

function truncate(s: string, max: number) {
  return s.length > max ? `${s.slice(0, max)}…` : s
}

function StatCard({
  label,
  value,
  error,
}: {
  label: string
  value: number | null
  error: string | null
}) {
  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="pb-2">
        <CardDescription className="text-xs font-medium">{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">
          {error ? '—' : (value ?? 0).toLocaleString('fr-FR')}
        </CardTitle>
      </CardHeader>
      {error ? <CardContent className="pt-0 text-[10px] text-destructive">{error}</CardContent> : null}
    </Card>
  )
}

export function SuperadminConsole(data: SuperadminDashboardPayload) {
  const {
    counts,
    analyticsEvents,
    analyticsError,
    cookieConsents,
    cookiesError,
    profiles,
    profilesError,
    quizzes,
    quizzesError,
    sessions,
    sessionsError,
    participants,
    participantsError,
    answers,
    answersError,
    questions,
    questionsError,
    authUsers,
    authError,
  } = data

  const rlsHint =
    quizzesError?.includes('permission') || quizzesError?.includes('policy')
      ? 'Si les quiz / questions restent vides : exécutez scripts/008_superadmin_full_access.sql sur Supabase.'
      : null

  return (
    <div className="space-y-8">
      {rlsHint ? (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-amber-900 dark:text-amber-200">Accès données métier</CardTitle>
            <CardDescription>{rlsHint}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Profils" value={counts.profiles.count} error={counts.profiles.error} />
        <StatCard label="Quiz" value={counts.quizzes.count} error={counts.quizzes.error} />
        <StatCard label="Questions" value={counts.questions.count} error={counts.questions.error} />
        <StatCard label="Sessions" value={counts.sessions.count} error={counts.sessions.error} />
        <StatCard label="Participants" value={counts.participants.count} error={counts.participants.error} />
        <StatCard label="Réponses" value={counts.answers.count} error={counts.answers.error} />
        <StatCard label="Réactions" value={counts.reactions.count} error={counts.reactions.error} />
        <StatCard label="Événements analytics" value={counts.analytics.count} error={counts.analytics.error} />
        <StatCard label="Consentements cookies" value={counts.cookies.count} error={counts.cookies.error} />
      </div>

      <Card className="border-violet-500/25 bg-violet-500/[0.04]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            <CardTitle className="text-lg">Pouvoirs superadmin (après script 008)</CardTitle>
          </div>
          <CardDescription className="text-pretty">
            Lecture exhaustive + mise à jour / suppression sur profils, quiz, questions, sessions, participants,
            réponses, réactions, événements analytics et consentements cookies. À utiliser avec prudence (RGPD,
            intégrité pédagogique). Promouvoir un rôle :{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              update profiles set role = &apos;superadmin&apos; where email = &apos;…&apos;;
            </code>
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="overview" className="w-full gap-6">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/60 p-1">
          <TabsTrigger value="overview" className="gap-1.5">
            <LayoutDashboard className="h-3.5 w-3.5" />
            Synthèse
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            Analytics
            <Badge variant="secondary" className="ml-0.5 text-[10px]">
              {analyticsEvents.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="cookies" className="gap-1.5">
            <Cookie className="h-3.5 w-3.5" />
            Cookies
            <Badge variant="secondary" className="ml-0.5 text-[10px]">
              {cookieConsents.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="profiles" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Profils
          </TabsTrigger>
          <TabsTrigger value="auth" className="gap-1.5">
            <GraduationCap className="h-3.5 w-3.5" />
            Auth
          </TabsTrigger>
          <TabsTrigger value="quizzes" className="gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            Quiz
          </TabsTrigger>
          <TabsTrigger value="sessions" className="gap-1.5">
            <Radio className="h-3.5 w-3.5" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="participants" className="gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            Joueurs
          </TabsTrigger>
          <TabsTrigger value="answers" className="gap-1.5">
            <ListChecks className="h-3.5 w-3.5" />
            Réponses
          </TabsTrigger>
          <TabsTrigger value="questions" className="gap-1.5">
            <Database className="h-3.5 w-3.5" />
            Questions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4" />
                Mine d&apos;or — indicateurs
              </CardTitle>
              <CardDescription>
                Totaux réels via RLS superadmin. Les onglets affichent les derniers enregistrements (échantillon
                plafonné pour la fluidité).
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-lg border border-border/80 bg-muted/20 p-4">
                <p className="font-semibold text-foreground">Auth Supabase</p>
                <p className="mt-1 text-muted-foreground">
                  {authError
                    ? authError
                    : `${authUsers.length} comptes listés (pagination API, jusqu’à ~600).`}
                </p>
              </div>
              <div className="rounded-lg border border-border/80 bg-muted/20 p-4">
                <p className="font-semibold text-foreground">Collecte & conformité</p>
                <p className="mt-1 text-muted-foreground">
                  Analytics : métadonnées JSON + user-agent. Cookies : version de consentement, flags analyse /
                  marketing, ID anonyme.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <DataTableCard
            title="Événements analytics (complet)"
            description="Chemin, referrer, user-agent, métadonnées JSON, utilisateur ou ID anonyme."
            error={analyticsError}
            empty={analyticsEvents.length === 0}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Date</TableHead>
                  <TableHead>Événement</TableHead>
                  <TableHead>Chemin</TableHead>
                  <TableHead>Referrer</TableHead>
                  <TableHead>User agent</TableHead>
                  <TableHead>Métadonnées</TableHead>
                  <TableHead>User / anon</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analyticsEvents.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap text-[11px]">{formatDate(row.created_at)}</TableCell>
                    <TableCell className="text-xs font-medium">{row.event_name}</TableCell>
                    <TableCell className="max-w-[140px] truncate text-xs">{row.path ?? '—'}</TableCell>
                    <TableCell className="max-w-[120px] truncate text-xs">{row.referrer ?? '—'}</TableCell>
                    <TableCell className="max-w-[180px] truncate text-[10px] text-muted-foreground">
                      {row.user_agent ?? '—'}
                    </TableCell>
                    <TableCell className="max-w-[200px] font-mono text-[10px] text-muted-foreground">
                      {formatJson(row.metadata, 200)}
                    </TableCell>
                    <TableCell className="font-mono text-[10px]">
                      {row.user_id ? truncate(row.user_id, 12) : row.anonymous_id?.slice(0, 16) ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableCard>
        </TabsContent>

        <TabsContent value="cookies">
          <DataTableCard
            title="Consentements cookies (lignes complètes)"
            description="Tous les champs enregistrés par le bandeau (nécessaire, analyse, marketing, version)."
            error={cookiesError}
            empty={cookieConsents.length === 0}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Décision</TableHead>
                  <TableHead>Màj</TableHead>
                  <TableHead>Nécessaire</TableHead>
                  <TableHead>Analyse</TableHead>
                  <TableHead>Marketing</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>ID anonyme</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cookieConsents.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="whitespace-nowrap text-[11px]">{formatDate(c.decided_at)}</TableCell>
                    <TableCell className="whitespace-nowrap text-[11px]">{formatDate(c.updated_at)}</TableCell>
                    <TableCell className="text-xs">{c.necessary ? 'oui' : 'non'}</TableCell>
                    <TableCell className="text-xs">{c.analytics ? 'oui' : 'non'}</TableCell>
                    <TableCell className="text-xs">{c.marketing ? 'oui' : 'non'}</TableCell>
                    <TableCell className="text-xs">{c.consent_version}</TableCell>
                    <TableCell className="font-mono text-[10px]">{c.user_id ? truncate(c.user_id, 14) : '—'}</TableCell>
                    <TableCell className="max-w-[200px] break-all font-mono text-[10px]">{c.anonymous_id}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableCard>
        </TabsContent>

        <TabsContent value="profiles">
          <DataTableCard
            title="Profils application"
            description="Rôle, email, nom affiché — alignés sur auth.users."
            error={profilesError}
            empty={profiles.length === 0}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Créé</TableHead>
                  <TableHead>UUID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Badge variant={p.role === 'superadmin' ? 'default' : 'secondary'} className="text-[10px]">
                        {p.role ?? 'user'}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs">{p.email ?? '—'}</TableCell>
                    <TableCell className="text-xs">{p.display_name ?? '—'}</TableCell>
                    <TableCell className="whitespace-nowrap text-[11px]">{formatDate(p.created_at)}</TableCell>
                    <TableCell className="font-mono text-[10px] text-muted-foreground">{p.id}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableCard>
        </TabsContent>

        <TabsContent value="auth">
          <DataTableCard
            title="Comptes Supabase Auth"
            description="Liste via API admin (service_role). Email confirmé, dernière connexion."
            error={authError}
            empty={authUsers.length === 0}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Confirmé</TableHead>
                  <TableHead>Créé</TableHead>
                  <TableHead>Dernière connexion</TableHead>
                  <TableHead>UUID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {authUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="max-w-[220px] truncate text-xs font-medium">
                      {u.email ?? truncate(u.id, 20)}
                    </TableCell>
                    <TableCell className="text-xs">{u.email_confirmed ? 'oui' : 'non'}</TableCell>
                    <TableCell className="whitespace-nowrap text-[11px]">{formatDate(u.created_at)}</TableCell>
                    <TableCell className="whitespace-nowrap text-[11px]">{formatDate(u.last_sign_in_at)}</TableCell>
                    <TableCell className="font-mono text-[10px] text-muted-foreground">{u.id}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableCard>
        </TabsContent>

        <TabsContent value="quizzes">
          <DataTableCard
            title="Tous les quiz"
            description="Propriétaire, visibilité publique, métadonnées."
            error={quizzesError}
            empty={quizzes.length === 0}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Thème / niveau</TableHead>
                  <TableHead>Public</TableHead>
                  <TableHead>Créé</TableHead>
                  <TableHead>user_id</TableHead>
                  <TableHead>id quiz</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quizzes.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="max-w-[220px] text-xs font-medium">{q.title}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {q.theme ?? '—'} · {q.level ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs">{q.is_public ? 'oui' : 'non'}</TableCell>
                    <TableCell className="whitespace-nowrap text-[11px]">{formatDate(q.created_at)}</TableCell>
                    <TableCell className="font-mono text-[10px]">{truncate(q.user_id, 10)}</TableCell>
                    <TableCell className="font-mono text-[10px] text-muted-foreground">{q.id}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableCard>
        </TabsContent>

        <TabsContent value="sessions">
          <DataTableCard
            title="Sessions live"
            description="PIN, statut, mode de jeu, animateur."
            error={sessionsError}
            empty={sessions.length === 0}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PIN</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Scoring</TableHead>
                  <TableHead>Mode jeu</TableHead>
                  <TableHead>Créée</TableHead>
                  <TableHead>host_id</TableHead>
                  <TableHead>quiz_id</TableHead>
                  <TableHead>session id</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs font-bold">{s.pin_code}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{s.scoring_mode ?? '—'}</TableCell>
                    <TableCell className="text-xs">{s.game_mode ?? '—'}</TableCell>
                    <TableCell className="whitespace-nowrap text-[11px]">{formatDate(s.created_at)}</TableCell>
                    <TableCell className="font-mono text-[10px]">{truncate(s.host_id, 10)}</TableCell>
                    <TableCell className="font-mono text-[10px]">{truncate(s.quiz_id, 10)}</TableCell>
                    <TableCell className="font-mono text-[10px] text-muted-foreground">{s.id}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableCard>
        </TabsContent>

        <TabsContent value="participants">
          <DataTableCard
            title="Participants (échantillon récent)"
            description="Sessions, pseudos, scores."
            error={participantsError}
            empty={participants.length === 0}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pseudo</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Rejoint</TableHead>
                  <TableHead>session_id</TableHead>
                  <TableHead>id</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participants.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs font-medium">{p.nickname}</TableCell>
                    <TableCell className="text-xs">{p.score ?? 0}</TableCell>
                    <TableCell className="whitespace-nowrap text-[11px]">{formatDate(p.joined_at)}</TableCell>
                    <TableCell className="font-mono text-[10px]">{truncate(p.session_id, 12)}</TableCell>
                    <TableCell className="font-mono text-[10px] text-muted-foreground">{p.id}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableCard>
        </TabsContent>

        <TabsContent value="answers">
          <DataTableCard
            title="Réponses enregistrées"
            description="Lien question / participant / session."
            error={answersError}
            empty={answers.length === 0}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Correct</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Réponse</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>question_id</TableHead>
                  <TableHead>participant_id</TableHead>
                  <TableHead>session_id</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {answers.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs">{a.is_correct ? 'oui' : 'non'}</TableCell>
                    <TableCell className="text-xs">{a.points_earned ?? 0}</TableCell>
                    <TableCell className="max-w-[120px] truncate text-xs">{a.answer}</TableCell>
                    <TableCell className="whitespace-nowrap text-[11px]">{formatDate(a.answered_at)}</TableCell>
                    <TableCell className="font-mono text-[10px]">{truncate(a.question_id, 10)}</TableCell>
                    <TableCell className="font-mono text-[10px]">{truncate(a.participant_id, 10)}</TableCell>
                    <TableCell className="font-mono text-[10px]">{truncate(a.session_id, 10)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableCard>
        </TabsContent>

        <TabsContent value="questions">
          <DataTableCard
            title="Questions (extrait récent)"
            description="Texte tronqué — accès complet via RLS superadmin sur la table questions."
            error={questionsError}
            empty={questions.length === 0}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Texte</TableHead>
                  <TableHead>Ordre</TableHead>
                  <TableHead>Créée</TableHead>
                  <TableHead>quiz_id</TableHead>
                  <TableHead>id</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="text-xs">{q.question_type}</TableCell>
                    <TableCell className="max-w-[320px] text-xs text-muted-foreground">
                      {truncate(q.question_text, 120)}
                    </TableCell>
                    <TableCell className="text-xs">{q.order_index}</TableCell>
                    <TableCell className="whitespace-nowrap text-[11px]">{formatDate(q.created_at)}</TableCell>
                    <TableCell className="font-mono text-[10px]">{truncate(q.quiz_id, 10)}</TableCell>
                    <TableCell className="font-mono text-[10px] text-muted-foreground">{q.id}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableCard>
        </TabsContent>
      </Tabs>

      <div className="flex flex-wrap gap-3 border-t border-border pt-8">
        <Button variant="outline" asChild>
          <Link href="/dashboard">Tableau de bord prof</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">Accueil public</Link>
        </Button>
      </div>
    </div>
  )
}

function DataTableCard({
  title,
  description,
  error,
  empty,
  children,
}: {
  title: string
  description: string
  error: string | null
  empty: boolean
  children: ReactNode
}) {
  return (
    <Card className="overflow-hidden border-border/80 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardHeader>
      <CardContent className="overflow-x-auto p-0 sm:p-0">
        {empty && !error ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">Aucune ligne pour cet échantillon.</p>
        ) : (
          <div className="min-w-[720px]">{children}</div>
        )}
      </CardContent>
    </Card>
  )
}
