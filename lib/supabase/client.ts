import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Un seul client navigateur pour toute l’app. Sinon chaque rendu React recrée un client,
 * les useEffect [supabase] se relancent en boucle : désabonnements / réabonnements Realtime,
 * interface lente et synchro « cassée ».
 */
let browserClient: SupabaseClient | undefined

export function createClient(): SupabaseClient {
  if (browserClient) return browserClient
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY sont requis')
  }
  browserClient = createBrowserClient(url, key)
  return browserClient
}
