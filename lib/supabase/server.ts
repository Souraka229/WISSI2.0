import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  
  // Get auth token from cookies
  const authCookieName = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`
  const authCookie = cookieStore.get(authCookieName)?.value
  
  let accessToken: string | undefined
  
  if (authCookie) {
    try {
      const parsed = JSON.parse(authCookie)
      accessToken = parsed?.access_token
    } catch {
      // Invalid cookie format
    }
  }
  
  const client = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: accessToken ? {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    } : undefined,
  })
  
  return client
}
