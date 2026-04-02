/**
 * Quatre couleurs fixes pour les réponses QCM en live (fond plein, texte clair).
 * Les indices > 3 réutilisent le cycle (A→bleu, B→rouge, etc.).
 */
export const LIVE_MCQ_TILE_CLASSES = [
  {
    base: 'bg-[#1d4ed8] text-white shadow-md shadow-blue-900/30',
    hover: 'hover:brightness-110',
  },
  {
    base: 'bg-[#b91c1c] text-white shadow-md shadow-red-900/30',
    hover: 'hover:brightness-110',
  },
  {
    base: 'bg-[#b45309] text-white shadow-md shadow-amber-900/25',
    hover: 'hover:brightness-110',
  },
  {
    base: 'bg-[#15803d] text-white shadow-md shadow-green-900/25',
    hover: 'hover:brightness-110',
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
  let cls = `${base} rounded-2xl border-2 border-white/10 transition-all `
  if (canInteract) cls += `${hover} active:scale-[0.98] `
  if (!answered && isSelected) {
    cls += 'ring-4 ring-white/90 ring-offset-2 ring-offset-background scale-[1.02] '
  } else if (answered && isSelected) {
    cls += 'ring-2 ring-white/80 opacity-95 '
  } else if (answered) {
    cls += 'opacity-40 saturate-50 '
  }
  return cls.trim()
}
