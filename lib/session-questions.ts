import type { SupabaseClient } from '@supabase/supabase-js'

export type SessionRow = {
  quiz_id: string
  secondary_quiz_id: string | null
  game_mode?: string | null
}

/** Liste linéaire des questions : quiz principal puis second défi (mode prof_dual). */
export async function fetchMergedSessionQuestions(
  supabase: SupabaseClient,
  session: SessionRow,
) {
  const { data: primary, error: e1 } = await supabase
    .from('questions')
    .select('*')
    .eq('quiz_id', session.quiz_id)
    .order('order_index', { ascending: true })

  if (e1) throw e1
  const list = [...(primary ?? [])]

  if (session.secondary_quiz_id && session.game_mode === 'prof_dual') {
    const { data: secondary, error: e2 } = await supabase
      .from('questions')
      .select('*')
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
