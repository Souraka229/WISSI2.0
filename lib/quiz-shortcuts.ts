/** Raccourcis thème / niveau pour la création de quiz (défauts + persistance profil). */

export type ShortcutChip = {
  value: string
  label: string
}

export const DEFAULT_THEME_CHIPS: ShortcutChip[] = [
  { value: 'history', label: 'Histoire' },
  { value: 'science', label: 'Sciences' },
  { value: 'math', label: 'Maths' },
  { value: 'language', label: 'Langues' },
  { value: 'general', label: 'Général' },
]

export const DEFAULT_LEVEL_CHIPS: ShortcutChip[] = [
  { value: 'beginner', label: 'Débutant' },
  { value: 'intermediate', label: 'Intermédiaire' },
  { value: 'advanced', label: 'Avancé' },
]

/** Thèmes supplémentaires uniquement dans le menu déroulant (pas en puce par défaut). */
export const EXTRA_THEME_SELECT_OPTIONS: ShortcutChip[] = [
  { value: 'geography', label: 'Géographie' },
  { value: 'literature', label: 'Littérature' },
  { value: 'philosophy', label: 'Philosophie' },
]

export function mergeThemeSelectOptions(chips: ShortcutChip[]): ShortcutChip[] {
  const seen = new Set(chips.map((c) => c.value))
  const out = [...chips]
  for (const c of EXTRA_THEME_SELECT_OPTIONS) {
    if (!seen.has(c.value)) {
      out.push(c)
      seen.add(c.value)
    }
  }
  return out
}

const MAX_CHIPS = 15
const MIN_CHIPS = 1
const VALUE_RE = /^[a-z0-9_]{1,40}$/
const LABEL_MAX = 40

function slugFromLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'custom'
}

function isChipRecord(x: unknown): x is ShortcutChip {
  if (typeof x !== 'object' || x === null) return false
  const o = x as Record<string, unknown>
  return typeof o.value === 'string' && typeof o.label === 'string'
}

export function parseShortcutChips(raw: unknown, fallback: ShortcutChip[]): ShortcutChip[] {
  if (!Array.isArray(raw)) return [...fallback]
  const out: ShortcutChip[] = []
  for (const item of raw) {
    if (!isChipRecord(item)) continue
    const v = item.value.trim().toLowerCase()
    const l = item.label.trim().slice(0, LABEL_MAX)
    if (!l || !VALUE_RE.test(v)) continue
    if (out.some((c) => c.value === v)) continue
    out.push({ value: v, label: l })
    if (out.length >= MAX_CHIPS) break
  }
  return out.length >= MIN_CHIPS ? out : [...fallback]
}

export type ShortcutValidationError = { field: string; message: string }

export function validateShortcutChips(
  themes: ShortcutChip[],
  levels: ShortcutChip[],
): ShortcutValidationError | null {
  if (themes.length < MIN_CHIPS || themes.length > MAX_CHIPS) {
    return { field: 'themes', message: `Entre ${MIN_CHIPS} et ${MAX_CHIPS} thèmes.` }
  }
  if (levels.length < MIN_CHIPS || levels.length > MAX_CHIPS) {
    return { field: 'levels', message: `Entre ${MIN_CHIPS} et ${MAX_CHIPS} niveaux.` }
  }
  const seenT = new Set<string>()
  for (const c of themes) {
    const l = c.label.trim().slice(0, LABEL_MAX)
    const v = c.value.trim().toLowerCase()
    if (!l) return { field: 'themes', message: 'Libellé de thème vide.' }
    if (!VALUE_RE.test(v)) {
      return {
        field: 'themes',
        message: `Valeur « ${v} » invalide : minuscules, chiffres et _ uniquement (max 40).`,
      }
    }
    if (seenT.has(v)) return { field: 'themes', message: `Doublon de valeur : ${v}` }
    seenT.add(v)
  }
  const seenL = new Set<string>()
  for (const c of levels) {
    const l = c.label.trim().slice(0, LABEL_MAX)
    const v = c.value.trim().toLowerCase()
    if (!l) return { field: 'levels', message: 'Libellé de niveau vide.' }
    if (!VALUE_RE.test(v)) {
      return {
        field: 'levels',
        message: `Valeur « ${v} » invalide : minuscules, chiffres et _ uniquement (max 40).`,
      }
    }
    if (seenL.has(v)) return { field: 'levels', message: `Doublon de valeur : ${v}` }
    seenL.add(v)
  }
  return null
}

export function ensureUniqueValue(value: string, existing: ShortcutChip[]): string {
  let v = value || 'item'
  let n = 0
  while (existing.some((c) => c.value === v)) {
    n += 1
    v = `${value || 'item'}_${n}`.slice(0, 40)
  }
  return v
}

export { slugFromLabel, LABEL_MAX, MAX_CHIPS, MIN_CHIPS, VALUE_RE }
