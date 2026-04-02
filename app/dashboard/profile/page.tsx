import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { ProfileNameForm } from '@/components/dashboard/profile-name-form'
import { ArrowLeft, LayoutDashboard } from 'lucide-react'

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, email, created_at')
    .eq('id', user.id)
    .maybeSingle()

  const memberSince = new Date(user.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard" aria-label="Retour au tableau de bord">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              <span className="text-lg font-bold tracking-tight">Mon profil</span>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard">Tableau de bord</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12 lg:px-8">
        <h1 className="mb-8 text-3xl font-black tracking-tight">Mon profil</h1>
        <div className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div>
            <p className="mb-1 text-sm font-semibold text-muted-foreground">E-mail</p>
            <p className="text-foreground">{user.email}</p>
          </div>
          <div>
            <p className="mb-1 text-sm font-semibold text-muted-foreground">Nom d’affichage</p>
            <p className="text-foreground">{profile?.display_name ?? 'Non défini'}</p>
            <div className="mt-4">
              <ProfileNameForm initialName={profile?.display_name ?? ''} />
            </div>
          </div>
          <div>
            <p className="mb-1 text-sm font-semibold text-muted-foreground">Membre depuis</p>
            <p className="text-foreground">{memberSince}</p>
          </div>
        </div>
      </main>
    </div>
  )
}
