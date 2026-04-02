'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  ANON_ID_STORAGE_KEY,
  CONSENT_STORAGE_KEY,
  type StoredConsent,
} from '@/lib/consent/storage'

function ensureAnonId(): string {
  try {
    const existing = localStorage.getItem(ANON_ID_STORAGE_KEY)
    if (existing && existing.length > 0) return existing
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `anon_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`
    localStorage.setItem(ANON_ID_STORAGE_KEY, id)
    return id
  } catch {
    return `anon_${Date.now()}`
  }
}

function persistLocal(consent: StoredConsent) {
  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent))
  window.dispatchEvent(new Event('sciti-consent-changed'))
}

async function syncServer(anonymousId: string, consent: StoredConsent) {
  try {
    await fetch('/api/analytics/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        anonymousId,
        analytics: consent.analytics,
        marketing: consent.marketing,
        version: consent.version,
      }),
    })
  } catch {
    // hors ligne : le choix reste en local
  }
}

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CONSENT_STORAGE_KEY)
      setVisible(!raw)
    } catch {
      setVisible(true)
    }
  }, [])

  const decide = useCallback(
    async (analytics: boolean, marketing: boolean) => {
      const anonymousId = ensureAnonId()
      const consent: StoredConsent = {
        necessary: true,
        analytics,
        marketing,
        version: '1',
        decidedAt: new Date().toISOString(),
      }
      persistLocal(consent)
      await syncServer(anonymousId, consent)
      setVisible(false)
    },
    [],
  )

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Préférences cookies"
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-border bg-background/95 p-4 shadow-lg backdrop-blur-md md:p-5"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Cookies et mesure d’audience</p>
          <p>
            Les cookies nécessaires au fonctionnement du site sont toujours actifs. Les cookies
            d’analyse (pages vues agrégées) et de personnalisation marketing ne sont activés qu’avec
            votre accord, conformément au RGPD. Vous pouvez retirer votre consentement en effaçant
            les données du site pour ce domaine dans votre navigateur.
          </p>
        </div>
        <div className="flex flex-shrink-0 flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => decide(false, false)}>
            Nécessaires uniquement
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => decide(true, false)}>
            Nécessaires + analyse
          </Button>
          <Button type="button" size="sm" onClick={() => decide(true, true)}>
            Tout accepter
          </Button>
        </div>
      </div>
    </div>
  )
}
