import Link from 'next/link'
import { loadSuperadminDashboard } from '@/lib/superadmin/load-dashboard'
import { SuperadminConsole } from '@/components/superadmin/superadmin-console'
import { Button } from '@/components/ui/button'

export default async function SuperadminPage() {
  const data = await loadSuperadminDashboard()

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-500/[0.04] via-background to-background p-6 md:p-10">
      <div className="mx-auto max-w-[1600px] space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400">
              Console opérationnelle
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">Superadmin</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Vue consolidée : comptages globaux, Auth, profils, quiz, sessions, réponses, analytics, consentements
              cookies. Exécutez{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">scripts/008_superadmin_full_access.sql</code>{' '}
              pour la lecture / modification complète des tables métier (en plus du script 003).
            </p>
          </div>
          <Button variant="outline" className="shrink-0 font-semibold" asChild>
            <Link href="/dashboard">Retour tableau de bord</Link>
          </Button>
        </div>

        <SuperadminConsole {...data} />
      </div>
    </div>
  )
}
