import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

type Body = {
  anonymousId?: string
  analytics?: boolean
  marketing?: boolean
  version?: string
}

export async function POST(request: Request) {
  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const anonymousId =
    typeof body.anonymousId === 'string' && body.anonymousId.length > 0 && body.anonymousId.length <= 80
      ? body.anonymousId
      : null
  if (!anonymousId) {
    return NextResponse.json({ ok: false, error: 'anonymous_id' }, { status: 400 })
  }

  const analytics = Boolean(body.analytics)
  const marketing = Boolean(body.marketing)
  const version = typeof body.version === 'string' && body.version.length <= 16 ? body.version : '1'

  let userId: string | null = null
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    userId = user?.id ?? null
  } catch {
    // ignore
  }

  const decidedAt = new Date().toISOString()

  try {
    const admin = createServiceRoleClient()
    const { error } = await admin.from('cookie_consents').upsert(
      {
        anonymous_id: anonymousId,
        user_id: userId,
        necessary: true,
        analytics,
        marketing,
        consent_version: version,
        decided_at: decidedAt,
        updated_at: decidedAt,
      },
      { onConflict: 'anonymous_id' },
    )
    if (error) {
      console.error('[analytics/consent]', error.message)
      return NextResponse.json({ ok: false }, { status: 503 })
    }
  } catch (e) {
    console.error('[analytics/consent]', e)
    return NextResponse.json({ ok: false }, { status: 503 })
  }

  return NextResponse.json({ ok: true })
}
