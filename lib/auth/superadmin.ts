import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type ProfileRole = 'user' | 'admin' | 'superadmin'

export async function getViewerProfileRole(): Promise<{
  userId: string
  role: ProfileRole
} | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (error || !profile?.role) {
    return { userId: user.id, role: 'user' }
  }

  const role = profile.role as ProfileRole
  return { userId: user.id, role }
}

export async function assertSuperadmin() {
  const viewer = await getViewerProfileRole()
  if (!viewer) {
    redirect('/auth/login?redirect=/superadmin')
  }
  if (viewer.role !== 'superadmin') {
    redirect('/dashboard')
  }
}
