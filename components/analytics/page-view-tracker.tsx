'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'
import {
  ANON_ID_STORAGE_KEY,
  CONSENT_STORAGE_KEY,
  parseConsent,
} from '@/lib/consent/storage'

function getAnonId(): string | null {
  try {
    return localStorage.getItem(ANON_ID_STORAGE_KEY)
  } catch {
    return null
  }
}

function InnerPageViewTracker() {
  const pathname = usePathname() ?? '/'
  const searchParams = useSearchParams()
  const lastSent = useRef<string | null>(null)
  const [consentRev, setConsentRev] = useState(0)

  useEffect(() => {
    const onConsent = () => {
      lastSent.current = null
      setConsentRev((n) => n + 1)
    }
    window.addEventListener('sciti-consent-changed', onConsent)
    return () => window.removeEventListener('sciti-consent-changed', onConsent)
  }, [])

  useEffect(() => {
    const search = searchParams?.toString() ?? ''
    const fullPath = search ? `${pathname}?${search}` : pathname
    if (lastSent.current === fullPath) return

    const raw = localStorage.getItem(CONSENT_STORAGE_KEY)
    const consent = parseConsent(raw)
    if (!consent?.analytics) return

    lastSent.current = fullPath
    const anonymousId = getAnonId()
    const referrer = typeof document !== 'undefined' ? document.referrer || null : null

    void fetch('/api/analytics/collect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'page_view',
        path: fullPath.slice(0, 2048),
        referrer: referrer?.slice(0, 2048) ?? null,
        anonymousId,
        analyticsConsent: true,
        metadata: {
          title: typeof document !== 'undefined' ? document.title?.slice(0, 200) : undefined,
        },
      }),
    }).catch(() => {})
  }, [pathname, searchParams, consentRev])

  return null
}

export function PageViewTracker() {
  return (
    <Suspense fallback={null}>
      <InnerPageViewTracker />
    </Suspense>
  )
}
