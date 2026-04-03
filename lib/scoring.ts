import { effectiveLiveQuestionSeconds } from '@/lib/live-quiz'

/**
 * Points par niveau (score cumulé participant). Plus élevé = courbe douce avec questions à gros pots (ex. 1000 pts).
 */
export const SCORE_PER_LEVEL = 450

/**
 * Calcule les points gagnés pour une réponse, selon le mode de session et le temps (secondes).
 *
 * - **classic** : bonne réponse = `basePoints`, sinon 0.
 * - **speed** : bonne réponse = entre ~25 % et 100 % de `basePoints` selon la rapidité (linéaire sur le chrono).
 * - **precision** : bonne réponse dans la première moitié du temps = plein pot ; sinon ~55 % (récompense l’exactitude + un minimum de réactivité).
 *
 * `timeTakenSec` et `budgetSec` sont en **secondes** (cohérent avec le client live actuel).
 */
export function computeAnswerPoints(params: {
  scoringMode: string | null | undefined
  isCorrect: boolean
  basePoints: number
  timeTakenSec: number
  budgetSec: number
}): number {
  const base = Math.max(0, Math.floor(params.basePoints))
  if (!params.isCorrect || base === 0) return 0

  const mode = (params.scoringMode ?? 'classic').toLowerCase()
  const budget = Math.max(1, Math.floor(params.budgetSec))
  const t = Math.max(0, Math.min(Math.floor(params.timeTakenSec), budget))

  if (mode === 'speed') {
    /**
     * Logique type Kahoot (adaptée) :
     * - t=0 → 100 % du max
     * - t=budget → 0 pt
     * - décroissance "smooth" (pas strictement linéaire)
     */
    const x = t / budget // 0..1
    const frac = Math.max(0, 1 - Math.pow(x, 1.35))
    return Math.max(0, Math.round(base * frac))
  }

  if (mode === 'precision') {
    if (t <= budget / 2) return base
    return Math.max(0, Math.round(base * 0.55))
  }

  // classic
  return base
}

/** Budget chrono cohérent avec l’UI élève (même fonction que le timer). */
export function scoringBudgetSeconds(timeLimitRaw: unknown): number {
  return effectiveLiveQuestionSeconds(timeLimitRaw)
}
