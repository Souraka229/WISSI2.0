import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

const MAX_EVENT = 120
const MAX_PATH = 2048
const MAX_REF = 2048
const MAX_META_CHARS = 8000

type Body = {
  event?: string
  path?: string
  referrer?: string | null
  anonymousId?: string | null
  metadata?: Record<string, unknown>
  analyticsConsent?: boolean
}

export async function POST(request: Request) {
  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  if (!body.analyticsConsent) {
    return NextResponse.json({ ok: false, error: 'no_consent' }, { status: 403 })
  }

  const eventName = typeof body.event === 'string' ? body.event.trim() : ''
  if (!eventName || eventName.length > MAX_EVENT) {
    return NextResponse.json({ ok: false, error: 'invalid_event' }, { status: 400 })
  }

  const path =
    typeof body.path === 'string' ? body.path.slice(0, MAX_PATH) : null
  const referrer =
    body.referrer === null || body.referrer === undefined
      ? null
      : String(body.referrer).slice(0, MAX_REF)

  const anonymousId =
    typeof body.anonymousId === 'string' && body.anonymousId.length <= 80
      ? body.anonymousId
      : null

  let metadata: Record<string, unknown> = {}
  if (body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)) {
    metadata = body.metadata
  }
  const metaStr = JSON.stringify(metadata)
  if (metaStr.length > MAX_META_CHARS) {
    metadata = { truncated: true }
  }

  const userAgent = request.headers.get('user-agent')?.slice(0, 512) ?? null

  let userId: string | null = null
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    userId = user?.id ?? null
  } catch {
    // session optionnelle
  }

  try {
    const admin = createServiceRoleClient()
    const { error } = await admin.from('analytics_events').insert({
      user_id: userId,
      anonymous_id: anonymousId,
      event_name: eventName,
      path,
      referrer,
      metadata,
      user_agent: userAgent,
    })
    if (error) {
      console.error('[analytics/collect]', error.message)
      return NextResponse.json({ ok: false, error: 'persist_failed' }, { status: 503 })
    }
  } catch (e) {
    console.error('[analytics/collect]', e)
    return NextResponse.json({ ok: false, error: 'service_unavailable' }, { status: 503 })
  }

  return NextResponse.json({ ok: true })
}
