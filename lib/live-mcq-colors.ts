/**
 * Quatre couleurs fixes pour les réponses QCM en live (fond plein, texte clair).
 * Les indices > 3 réutilisent le cycle (A→bleu, B→rouge, etc.).
 */
export const LIVE_MCQ_TILE_CLASSES = [
  {
    base: 'bg-[#2563eb] text-white shadow-lg shadow-blue-950/35 sm:shadow-xl',
    hover: 'hover:brightness-110 hover:shadow-blue-900/40',
  },
  {
    base: 'bg-[#dc2626] text-white shadow-lg shadow-red-950/35 sm:shadow-xl',
    hover: 'hover:brightness-110 hover:shadow-red-900/40',
  },
  {
    base: 'bg-[#d97706] text-white shadow-lg shadow-amber-950/30 sm:shadow-xl',
    hover: 'hover:brightness-110 hover:shadow-amber-900/35',
  },
  {
    base: 'bg-[#16a34a] text-white shadow-lg shadow-emerald-950/30 sm:shadow-xl',
    hover: 'hover:brightness-110 hover:shadow-emerald-900/35',
  },
] as const

export function liveMcqTileClass(
  optionIndex: number,
  opts: {
    isSelected: boolean
    answered: boolean
    canInteract: boolean
  },
): string {
  const { base, hover } = LIVE_MCQ_TILE_CLASSES[optionIndex % 4]
  const { isSelected, answered, canInteract } = opts
  let cls = `${base} rounded-2xl border-2 border-white/15 transition-all duration-150 touch-manipulation select-none sm:rounded-3xl `
  if (canInteract) cls += `${hover} active:scale-[0.97] sm:active:scale-[0.98] `
  if (!answered && isSelected) {
    cls += 'ring-4 ring-white/90 ring-offset-2 ring-offset-background scale-[1.02] '
  } else if (answered && isSelected) {
    cls += 'ring-2 ring-white/80 opacity-95 '
  } else if (answered) {
    cls += 'opacity-40 saturate-50 '
  }
  return cls.trim()
}
