import { createClient } from '@/lib/supabase/server'

export type PublicQuizPreview = {
  id: string
  title: string
  description: string | null
  theme: string | null
  level: string | null
  question_count: number
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Données pour la page partageable /q/[id] (RPC Supabase script 007). */
export async function fetchPublicQuizPreview(quizId: string): Promise<PublicQuizPreview | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_public_quiz_preview', {
    p_quiz_id: quizId,
  })

  if (error) {
    console.error('[fetchPublicQuizPreview]', error.message)
    return null
  }

  if (data == null) return null
  const raw = data as unknown
  if (!isRecord(raw)) return null

  const id = typeof raw.id === 'string' ? raw.id : null
  const title = typeof raw.title === 'string' ? raw.title : null
  if (!id || !title) return null

  const qc = raw.question_count
  const questionCount = typeof qc === 'number' && Number.isFinite(qc) ? qc : 0

  return {
    id,
    title,
    description: typeof raw.description === 'string' ? raw.description : null,
    theme: typeof raw.theme === 'string' ? raw.theme : null,
    level: typeof raw.level === 'string' ? raw.level : null,
    question_count: questionCount,
  }
}
