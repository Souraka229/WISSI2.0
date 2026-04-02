import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
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

function formatDate(iso: string | null) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('fr-FR')
  } catch {
    return iso
  }
}

export default async function SuperadminPage() {
  const supabase = await createClient()

  const { count: profileCount, error: profileCountError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  const { data: events, error: eventsError } = await supabase
    .from('analytics_events')
    .select('id, event_name, path, user_id, anonymous_id, created_at')
    .order('created_at', { ascending: false })
    .limit(80)

  const { data: consents, error: consentsError } = await supabase
    .from('cookie_consents')
    .select(
      'id, anonymous_id, user_id, analytics, marketing, consent_version, decided_at',
    )
    .order('decided_at', { ascending: false })
    .limit(50)

  let authUsers: {
    id: string
    email: string | undefined
    created_at: string
    last_sign_in_at: string | null
  }[] = []
  let authError: string | null = null

  try {
    const admin = createServiceRoleClient()
    const { data, error } = await admin.auth.admin.listUsers({
      perPage: 100,
      page: 1,
    })
    if (error) {
      authError = error.message
    } else {
      authUsers =
        data.users?.map((u) => ({
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at ?? null,
        })) ?? []
    }
  } catch {
    authError =
      'Clé service_role absente ou invalide : définissez SUPABASE_SERVICE_ROLE_KEY pour lister les comptes Auth.'
  }

  const schemaIssues =
    profileCountError?.message ||
    eventsError?.message ||
    consentsError?.message ||
    null

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Superadmin</h1>
            <p className="text-sm text-muted-foreground">
              Vue d’ensemble : profils, Auth, événements analytics (consentement requis côté
              visiteur) et consentements cookies enregistrés.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/dashboard">Retour au tableau de bord</Link>
          </Button>
        </div>

        {schemaIssues ? (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader>
              <CardTitle className="text-base">Schéma Supabase</CardTitle>
              <CardDescription>
                Exécutez le script{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">scripts/003_superadmin_analytics.sql</code>{' '}
                si les tables ou la colonne <code className="text-xs">role</code> manquent.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{schemaIssues}</CardContent>
          </Card>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Profils (table)</CardDescription>
              <CardTitle className="text-3xl tabular-nums">
                {profileCountError ? '—' : (profileCount ?? 0).toLocaleString('fr-FR')}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Comptes Auth (100 derniers)</CardDescription>
              <CardTitle className="text-3xl tabular-nums">
                {authError ? '—' : authUsers.length.toLocaleString('fr-FR')}
              </CardTitle>
            </CardHeader>
            {authError ? (
              <CardContent className="text-xs text-muted-foreground">{authError}</CardContent>
            ) : null}
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Événements (échantillon)</CardDescription>
              <CardTitle className="text-3xl tabular-nums">
                {eventsError ? '—' : (events?.length ?? 0).toLocaleString('fr-FR')}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Événements récents</CardTitle>
            <CardDescription>
              Collectés uniquement lorsque l’utilisateur a accepté les cookies d’analyse.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {!events || events.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun événement pour l’instant.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Événement</TableHead>
                    <TableHead>Chemin</TableHead>
                    <TableHead>User</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {formatDate(row.created_at)}
                      </TableCell>
                      <TableCell className="text-xs">{row.event_name}</TableCell>
                      <TableCell className="max-w-[240px] truncate text-xs">
                        {row.path ?? '—'}
                      </TableCell>
                      <TableCell className="font-mono text-[10px] text-muted-foreground">
                        {row.user_id ? row.user_id.slice(0, 8) : row.anonymous_id?.slice(0, 12) ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Utilisateurs Auth</CardTitle>
              <CardDescription>Inscriptions et dernière connexion (API admin).</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {authUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {authError ? 'Liste indisponible.' : 'Aucun utilisateur renvoyé.'}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Créé</TableHead>
                      <TableHead>Dernière connexion</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {authUsers.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="max-w-[200px] truncate text-xs">
                          {u.email ?? u.id.slice(0, 8)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">
                          {formatDate(u.created_at)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">
                          {formatDate(u.last_sign_in_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Consentements cookies</CardTitle>
              <CardDescription>Derniers enregistrements synchronisés depuis le bandeau.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {!consents || consents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune entrée.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Analyse</TableHead>
                      <TableHead>Marketing</TableHead>
                      <TableHead>ID anonyme</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consents.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="whitespace-nowrap text-xs">
                          {formatDate(c.decided_at)}
                        </TableCell>
                        <TableCell className="text-xs">{c.analytics ? 'oui' : 'non'}</TableCell>
                        <TableCell className="text-xs">{c.marketing ? 'oui' : 'non'}</TableCell>
                        <TableCell className="font-mono text-[10px] text-muted-foreground">
                          {c.anonymous_id.slice(0, 14)}…
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
