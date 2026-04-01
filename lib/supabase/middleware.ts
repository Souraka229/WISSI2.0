import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    !/^https?:\/\//i.test(supabaseUrl)
  ) {
    return NextResponse.next()
  }

  // Get the access token from cookies
  const accessToken = request.cookies.get('sb-access-token')?.value
  const refreshToken = request.cookies.get('sb-refresh-token')?.value

  // Also check for the auth token in the standard Supabase cookie format
  const authCookieName = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`
  const authCookie = request.cookies.get(authCookieName)?.value

  let user = null

  if (authCookie) {
    try {
      const parsed = JSON.parse(authCookie)
      if (parsed?.access_token) {
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          global: {
            headers: {
              Authorization: `Bearer ${parsed.access_token}`,
            },
          },
        })
        const { data } = await supabase.auth.getUser()
        user = data?.user
      }
    } catch {
      // Invalid cookie format
    }
  } else if (accessToken) {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    })
    const { data } = await supabase.auth.getUser()
    user = data?.user
  }

  // Protected routes check
  const protectedPaths = ['/dashboard', '/protected']
  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // Auth pages redirect if already logged in
  const authPaths = ['/auth/login', '/auth/sign-up']
  const isAuthPath = authPaths.some(path => 
    request.nextUrl.pathname === path
  )

  if (isAuthPath && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}
