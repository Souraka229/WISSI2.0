import { updateSession } from '@/lib/supabase/middleware'
import { type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Uniquement les zones qui ont besoin d’auth / refresh session.
     * Évite un appel Supabase getUser() à chaque navigation sur /join, /student, etc.
     * (sinon l’app paraît très lente en jeu live).
     */
    '/dashboard',
    '/dashboard/:path*',
    '/protected',
    '/protected/:path*',
    '/auth',
    '/auth/:path*',
  ],
}
