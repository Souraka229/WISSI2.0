/** Durées question en live : évite les 10 s trop courtes, plafonne l’excès. */
export const LIVE_QUESTION_MIN_SECONDS = 20
export const LIVE_QUESTION_MAX_SECONDS = 600

export function effectiveLiveQuestionSeconds(raw: unknown): number {
  const n = Number(raw)
  const fromQuiz = Number.isFinite(n) && n > 0 ? n : 30
  return Math.min(
    LIVE_QUESTION_MAX_SECONDS,
    Math.max(LIVE_QUESTION_MIN_SECONDS, fromQuiz),
  )
}
