/** Libellés et styles des modes live (stickers pupitre / élève / lancement). */

export type LiveGameModeKey = 'challenge_free' | 'prof_dual' | 'hackathon'

export function normalizeLiveGameMode(raw: string | null | undefined): LiveGameModeKey {
  if (raw === 'prof_dual' || raw === 'hackathon' || raw === 'challenge_free') {
    return raw
  }
  return 'challenge_free'
}

export function liveModeLabel(mode: string | null | undefined): string {
  const m = normalizeLiveGameMode(mode)
  if (m === 'hackathon') return 'Hackathon live'
  if (m === 'prof_dual') return 'Double défi'
  return 'Challenge libre'
}

export const LIVE_MODE_STICKERS: Record<
  LiveGameModeKey,
  { short: string; className: string; emoji?: string }
> = {
  challenge_free: {
    short: 'Classe',
    emoji: '📚',
    className:
      'border-emerald-500/40 bg-gradient-to-r from-emerald-500/20 to-teal-500/15 text-emerald-900 dark:text-emerald-100',
  },
  prof_dual: {
    short: 'Défi',
    emoji: '⚡',
    className:
      'border-amber-500/45 bg-gradient-to-r from-amber-500/25 to-orange-500/15 text-amber-950 dark:text-amber-100',
  },
  hackathon: {
    short: 'Hackathon',
    emoji: '🔥',
    className:
      'border-fuchsia-500/50 bg-gradient-to-r from-fuchsia-600/25 via-violet-600/20 to-orange-500/20 text-violet-950 dark:text-fuchsia-100',
  },
}
