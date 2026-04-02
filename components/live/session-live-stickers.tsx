'use client'

import { LIVE_MODE_STICKERS, normalizeLiveGameMode } from '@/lib/game-mode-live'
import { cn } from '@/lib/utils'

type Props = {
  gameMode: string | null | undefined
  className?: string
  size?: 'sm' | 'md'
}

/** Stickers LIVE selon le mode de session (pupitre, élève, etc.). */
export function SessionLiveStickers({ gameMode, className, size = 'md' }: Props) {
  const m = normalizeLiveGameMode(gameMode)
  const cfg = LIVE_MODE_STICKERS[m]
  const sm = size === 'sm'

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 font-bold text-emerald-900 dark:text-emerald-100',
          sm ? 'px-2 py-0.5 text-[9px] uppercase tracking-wide' : 'px-2.5 py-1 text-[10px] uppercase tracking-wider',
        )}
      >
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
        </span>
        Live
      </span>
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full border font-bold',
          sm ? 'px-2 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[10px]',
          cfg.className,
        )}
      >
        {cfg.emoji ? <span aria-hidden>{cfg.emoji}</span> : null}
        {m === 'hackathon' ? 'Hackathon' : m === 'prof_dual' ? 'Double quiz' : 'Classe'}
      </span>
    </div>
  )
}
