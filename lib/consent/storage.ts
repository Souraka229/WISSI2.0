export const CONSENT_STORAGE_KEY = 'sciti_consent_v1'
export const ANON_ID_STORAGE_KEY = 'sciti_anon_id'

export type StoredConsent = {
  necessary: true
  analytics: boolean
  marketing: boolean
  version: string
  decidedAt: string
}

export function parseConsent(raw: string | null): StoredConsent | null {
  if (!raw) return null
  try {
    const v = JSON.parse(raw) as Partial<StoredConsent>
    if (v.necessary !== true) return null
    if (typeof v.analytics !== 'boolean' || typeof v.marketing !== 'boolean') return null
    return {
      necessary: true,
      analytics: v.analytics,
      marketing: v.marketing,
      version: typeof v.version === 'string' ? v.version : '1',
      decidedAt: typeof v.decidedAt === 'string' ? v.decidedAt : new Date().toISOString(),
    }
  } catch {
    return null
  }
}
