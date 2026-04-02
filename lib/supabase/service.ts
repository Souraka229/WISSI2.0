import { createClient } from '@supabase/supabase-js'

/**
 * Client Supabase avec la clé service_role — serveur uniquement (API routes, Server Actions).
 * Contourne la RLS ; ne jamais importer ce module dans du code client.
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'Variables NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requises pour les opérations admin.',
    )
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
