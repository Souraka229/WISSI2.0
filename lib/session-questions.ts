import type { SupabaseClient } from '@supabase/supabase-js'

export type SessionRow = {
  quiz_id: string
  secondary_quiz_id: string | null
  game_mode?: string | null
}

/** Colonnes minimales pour l’UI joueur (évite un `select *` lourd au chargement). */
export const SESSION_QUESTION_COLUMNS_STUDENT =
  'id,question_text,question_type,correct_answer,options,time_limit,order_index,points'

export type FetchMergedSessionQuestionsOptions = {
  /** Par défaut `*` (animateur / édition). Utiliser SESSION_QUESTION_COLUMNS_STUDENT côté élève. */
  columns?: string
}

/** Liste linéaire : quiz principal, puis questions du second quiz si `secondary_quiz_id` est renseigné (modes prof_dual / hackathon). */
export async function fetchMergedSessionQuestions(
  supabase: SupabaseClient,
  session: SessionRow,
  options?: FetchMergedSessionQuestionsOptions,
) {
  const columns = options?.columns ?? '*'
  const { data: primary, error: e1 } = await supabase
    .from('questions')
    .select(columns)
    .eq('quiz_id', session.quiz_id)
    .order('order_index', { ascending: true })

  if (e1) throw e1
  const list = [...(primary ?? [])]

  if (
    session.secondary_quiz_id &&
    (session.game_mode === 'prof_dual' || session.game_mode === 'hackathon')
  ) {
    const { data: secondary, error: e2 } = await supabase
      .from('questions')
      .select(columns)
      .eq('quiz_id', session.secondary_quiz_id)
      .order('order_index', { ascending: true })

    if (e2) throw e2
    list.push(...(secondary ?? []))
  }

  return list
}

export async function countSessionQuestions(
  supabase: SupabaseClient,
  session: SessionRow,
): Promise<number> {
  const qs = await fetchMergedSessionQuestions(supabase, session)
  return qs.length
}

/** Pour le polling de secours : évite setState si rien n’a changé côté UI live. */
export function sessionLiveFieldsChanged(
  prev: Record<string, unknown> | null,
  next: Record<string, unknown>,
): boolean {
  if (!prev) return true
  return (
    prev.status !== next.status ||
    Number(prev.current_question_index ?? 0) !== Number(next.current_question_index ?? 0) ||
    prev.game_mode !== next.game_mode ||
    prev.secondary_quiz_id !== next.secondary_quiz_id ||
    String(prev.question_deadline_at ?? '') !== String(next.question_deadline_at ?? '') ||
    String(prev.question_started_at ?? '') !== String(next.question_started_at ?? '') ||
    Boolean(prev.auto_advance) !== Boolean(next.auto_advance)
  )
}
