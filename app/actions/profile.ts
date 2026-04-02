'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfileDisplayName(displayName: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  const name = displayName.trim()
  if (name.length < 1) {
    throw new Error('Indiquez au moins un caractère.')
  }
  if (name.length > 120) {
    throw new Error('Nom trop long (120 caractères max).')
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: name,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) throw error

  revalidatePath('/dashboard/profile')
  revalidatePath('/dashboard')
}
