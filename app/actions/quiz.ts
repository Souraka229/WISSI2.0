'use server'

import { randomInt } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import {
  countSessionQuestions,
  fetchMergedSessionQuestions,
  type SessionRow,
} from '@/lib/session-questions'
import { effectiveLiveQuestionSeconds } from '@/lib/live-quiz'
import { computeAnswerPoints, scoringBudgetSeconds, SCORE_PER_LEVEL } from '@/lib/scoring'
import { revalidateTag } from 'next/cache'

export type GameMode = 'challenge_free' | 'prof_dual' | 'hackathon'
export type SessionScoringMode = 'classic' | 'precision' | 'speed'

export async function createQuiz(
  title: string,
  description: string,
  theme: string,
  level: string,
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data, error } = await supabase
    .from('quizzes')
    .insert({
      user_id: user.id,
      title,
      description: description || null,
      theme,
      level,
    })
    .select()
    .single()

  if (error) throw error

  revalidateTag('quizzes')
  return data
}

export async function getQuizzes() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data, error } = await supabase
    .from('quizzes')
    .select('*, questions(count)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getQuiz(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('quizzes')
    .select(
      `
      *,
      questions (*)
    `,
    )
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function deleteQuiz(id: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { error } = await supabase
    .from('quizzes')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw error

  revalidateTag('quizzes')
}

/**
 * Bascule la visibilité « catalogue / partage » du quiz (colonne is_public).
 */
export async function updateQuizIsPublic(
  quizId: string,
  isPublic: boolean,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Non authentifié.' }
    }

    const { error } = await supabase
      .from('quizzes')
      .update({ is_public: isPublic, updated_at: new Date().toISOString() })
      .eq('id', quizId)
      .eq('user_id', user.id)

    if (error) {
      console.error('[updateQuizIsPublic]', error)
      return { success: false, error: error.message }
    }

    revalidateTag('quizzes')
    revalidateTag(`quiz-${quizId}`)
    return { success: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erreur inconnue'
    console.error('[updateQuizIsPublic]', e)
    return { success: false, error: message }
  }
}

type QuestionRow = {
  question_text: string
  question_type: string
  options: unknown
  correct_answer: string
  explanation: string | null
  time_limit: number | null
  points: number | null
  difficulty: string | null
  order_index: number
}

/**
 * Duplique un quiz et toutes ses questions (titre préfixé [Copie]).
 */
export async function duplicateQuiz(
  id: string,
): Promise<{ success: true; newId: string } | { success: false; error: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Non authentifié.' }
    }

    const source = await getQuiz(id)
    if (!source || (source as { user_id?: string }).user_id !== user.id) {
      return { success: false, error: 'Quiz introuvable ou accès refusé.' }
    }

    const src = source as {
      title: string
      description: string | null
      theme: string | null
      level: string | null
      is_public: boolean | null
      questions: QuestionRow[] | null
    }

    const { data: newQuiz, error: insertErr } = await supabase
      .from('quizzes')
      .insert({
        user_id: user.id,
        title: `[Copie] ${src.title}`,
        description: src.description,
        theme: src.theme,
        level: src.level,
        is_public: src.is_public ?? false,
      })
      .select('id')
      .single()

    if (insertErr || !newQuiz) {
      console.error('[duplicateQuiz] insert', insertErr)
      return { success: false, error: 'Impossible de créer la copie.' }
    }

    const newId = newQuiz.id as string
    const qs = src.questions ?? []

    for (const q of qs) {
      const { error: qErr } = await supabase.from('questions').insert({
        quiz_id: newId,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation ?? null,
        time_limit: q.time_limit ?? 30,
        points: q.points ?? 100,
        difficulty: q.difficulty,
        order_index: q.order_index,
      })
      if (qErr) {
        console.error('[duplicateQuiz] question', qErr)
        await supabase.from('quizzes').delete().eq('id', newId)
        return { success: false, error: 'Copie interrompue lors de la duplication des questions.' }
      }
    }

    revalidateTag('quizzes')
    revalidateTag(`quiz-${newId}`)
    return { success: true, newId }
  } catch (e) {
    console.error('[duplicateQuiz]', e)
    const message = e instanceof Error ? e.message : 'Erreur inconnue'
    return { success: false, error: message }
  }
}

/** Index léger pour la palette de commandes (Cmd+K). */
export async function getQuizPaletteItems(): Promise<{ id: string; title: string }[]> {
  const rows = await getQuizzes()
  return (rows ?? []).map((q) => ({
    id: (q as { id: string }).id,
    title: (q as { title: string }).title,
  }))
}

export async function createQuestion(
  quizId: string,
  questionText: string,
  questionType: string,
  options: string[],
  correctAnswer: string,
  explanation: string,
  timeLimit: number,
  points: number,
  difficulty: string,
  orderIndex: number,
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('questions')
    .insert({
      quiz_id: quizId,
      question_text: questionText,
      question_type: questionType,
      options: options,
      correct_answer: correctAnswer,
      explanation,
      time_limit: timeLimit,
      points,
      difficulty,
      order_index: orderIndex,
    })
    .select()
    .single()

  if (error) throw error

  revalidateTag(`quiz-${quizId}`)
  return data
}

export async function deleteQuestion(questionId: string, quizId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data: owned, error: ownErr } = await supabase
    .from('quizzes')
    .select('id')
    .eq('id', quizId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (ownErr) throw ownErr
  if (!owned) {
    throw new Error('Quiz introuvable ou accès refusé')
  }

  const { error } = await supabase
    .from('questions')
    .delete()
    .eq('id', questionId)
    .eq('quiz_id', quizId)

  if (error) throw error

  revalidateTag(`quiz-${quizId}`)
  revalidateTag('quizzes')
}

export async function updateQuestion(
  questionId: string,
  quizId: string,
  questionText: string,
  questionType: string,
  options: string[],
  correctAnswer: string,
  explanation: string,
  timeLimit: number,
  points: number,
  difficulty: string,
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data: owned, error: ownErr } = await supabase
    .from('quizzes')
    .select('id')
    .eq('id', quizId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (ownErr) throw ownErr
  if (!owned) {
    throw new Error('Quiz introuvable ou accès refusé')
  }

  const { error } = await supabase
    .from('questions')
    .update({
      question_text: questionText,
      question_type: questionType,
      options,
      correct_answer: correctAnswer,
      explanation,
      time_limit: timeLimit,
      points,
      difficulty,
    })
    .eq('id', questionId)
    .eq('quiz_id', quizId)

  if (error) throw error

  revalidateTag(`quiz-${quizId}`)
  revalidateTag('quizzes')
}

export async function startSession(
  quizId: string,
  options?: {
    gameMode?: GameMode
    secondaryQuizId?: string | null
    scoringMode?: SessionScoringMode
  },
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  const { data: ownedQuiz, error: quizErr } = await supabase
    .from('quizzes')
    .select('id')
    .eq('id', quizId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (quizErr) throw quizErr
  if (!ownedQuiz) {
    throw new Error('Quiz introuvable ou vous n’êtes pas autorisé à le lancer')
  }

  const gameMode = options?.gameMode ?? 'challenge_free'
  let secondaryQuizId: string | null = null

  const isDualStyleMode = gameMode === 'prof_dual' || gameMode === 'hackathon'

  if (isDualStyleMode) {
    const sid = options?.secondaryQuizId
    const sidStr = typeof sid === 'string' ? sid.trim() : ''
    if (sidStr.length > 0) {
      if (sidStr === quizId) {
        throw new Error('Le deuxième quiz doit être différent du quiz principal.')
      }
      const { data: q2, error: e2 } = await supabase
        .from('quizzes')
        .select('id')
        .eq('id', sidStr)
        .eq('user_id', user.id)
        .maybeSingle()
      if (e2) throw e2
      if (!q2) throw new Error('Le deuxième quiz est introuvable ou ne vous appartient pas')
      secondaryQuizId = sidStr
    }
  }

  const maxAttempts = 10
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const pinCode = String(randomInt(100000, 1000000))

    const scoringMode = options?.scoringMode ?? 'classic'

    const insertPayload: Record<string, unknown> = {
      quiz_id: quizId,
      host_id: user.id,
      pin_code: pinCode,
      status: 'waiting',
      scoring_mode: scoringMode,
    }

    if (isDualStyleMode) {
      insertPayload.game_mode = gameMode
      insertPayload.secondary_quiz_id = secondaryQuizId
    } else {
      insertPayload.game_mode = 'challenge_free'
      insertPayload.secondary_quiz_id = null
    }

    const { data, error } = await supabase
      .from('sessions')
      .insert(insertPayload)
      .select()
      .single()

    if (!error && data) {
      revalidateTag(`quiz-${quizId}`)
      return data
    }

    if (error?.code === '23505') {
      continue
    }

    if (
      error?.message?.includes('game_mode') ||
      error?.message?.includes('secondary_quiz')
    ) {
      throw new Error(
        'Exécutez la migration SQL scripts/002_live_game_modes.sql sur votre base Supabase.',
      )
    }

    throw error ?? new Error('Impossible de créer la session')
  }

  throw new Error('Impossible d’attribuer un code PIN unique, réessayez')
}

export async function updateSessionStatus(
  sessionId: string,
  status: string,
  currentQuestionIndex?: number,
) {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = { status }
  if (currentQuestionIndex !== undefined) {
    updateData.current_question_index = currentQuestionIndex
  }

  const { data, error } = await supabase
    .from('sessions')
    .update(updateData)
    .eq('id', sessionId)

  if (error) throw error

  revalidateTag(`session-${sessionId}`)
  return data
}

export type HostControlResult = { ok: true } | { ok: false; error: string }

export type HostControlAction =
  | 'start'
  | 'show_leaderboard'
  | 'next_question'
  | 'end'
  | 'timer_cut'
  | 'timer_subtract_10'

export async function setSessionAutoAdvance(
  sessionId: string,
  enabled: boolean,
): Promise<HostControlResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: 'Non authentifié.' }
  }

  const { data: sess, error: sErr } = await supabase
    .from('sessions')
    .select('host_id')
    .eq('id', sessionId)
    .single()

  if (sErr || !sess || sess.host_id !== user.id) {
    return { ok: false, error: 'Vous n’êtes pas l’animateur de cette session.' }
  }

  const { error } = await supabase
    .from('sessions')
    .update({ auto_advance: enabled })
    .eq('id', sessionId)

  if (error) {
    console.error('[setSessionAutoAdvance]', error)
    if (
      error.message?.includes('auto_advance') ||
      error.message?.includes('column') ||
      error.code === '42703'
    ) {
      return {
        ok: false,
        error:
          'Colonne auto_advance absente : exécutez scripts/006_session_auto_advance.sql sur Supabase.',
      }
    }
    return { ok: false, error: 'Impossible d’enregistrer l’option.' }
  }

  revalidateTag(`session-${sessionId}`)
  return { ok: true }
}

/**
 * Ne pas utiliser `throw` pour les erreurs métier : en production Next.js remplace le message
 * par « An error occurred in the Server Components render… » sur le client.
 */
export async function hostControlSession(
  sessionId: string,
  action: HostControlAction,
): Promise<HostControlResult> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return {
        ok: false,
        error: 'Non authentifié — reconnectez-vous puis rouvrez le pupitre depuis le tableau de bord.',
      }
    }

    const { data: session, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (error || !session) {
      return { ok: false, error: 'Session introuvable ou vous n’y avez pas accès.' }
    }
    if (session.host_id !== user.id) {
      return { ok: false, error: 'Vous n’êtes pas l’animateur de cette session.' }
    }

    let total: number
    try {
      total = await countSessionQuestions(supabase, session)
    } catch (e) {
      console.error('[hostControlSession] countSessionQuestions', e)
      return {
        ok: false,
        error:
          'Impossible de charger les questions du quiz (second quiz manquant, RLS ou migration 002). Vérifiez le mode « Défis du prof » et la base Supabase.',
      }
    }

    if (total === 0) {
      return { ok: false, error: 'Aucune question dans cette session.' }
    }

    const buildQuestionTimerFields = async (questionIndex: number) => {
      const qs = await fetchMergedSessionQuestions(supabase, session as SessionRow)
      const q = qs[questionIndex] as { time_limit?: number } | undefined
      const sec = effectiveLiveQuestionSeconds(q?.time_limit)
      const question_started_at = new Date().toISOString()
      const question_deadline_at = new Date(Date.now() + sec * 1000).toISOString()
      return { question_started_at, question_deadline_at }
    }

    const patch = async (
      fields: Record<string, unknown>,
    ): Promise<string | null> => {
      const { error: uErr } = await supabase
        .from('sessions')
        .update(fields)
        .eq('id', sessionId)
      if (uErr) {
        console.error('[hostControlSession] update', uErr)
        if (
          uErr.code === '23514' ||
          uErr.message?.includes('sessions_status_check')
        ) {
          return 'Statut incompatible — exécutez scripts/002_live_game_modes.sql sur Supabase (contrainte sur sessions.status).'
        }
        if (uErr.code === '42501') {
          return 'Mise à jour refusée par la base (politique RLS sur sessions).'
        }
        return 'La base a refusé la mise à jour. Détail dans les logs serveur.'
      }
      revalidateTag(`session-${sessionId}`)
      return null
    }

    const st = String(session.status)

    switch (action) {
      case 'start': {
        if (st !== 'waiting') {
          return { ok: false, error: 'La partie est déjà lancée ou terminée.' }
        }
        const timer = await buildQuestionTimerFields(0)
        const err = await patch({
          status: 'question',
          current_question_index: 0,
          started_at: new Date().toISOString(),
          ...timer,
        })
        if (err) return { ok: false, error: err }
        break
      }
      case 'show_leaderboard': {
        const err = await patch({
          status: 'results',
          question_started_at: null,
          question_deadline_at: null,
        })
        if (err) return { ok: false, error: err }
        break
      }
      case 'next_question': {
        const idx = session.current_question_index ?? 0
        const nextIdx = idx + 1
        if (nextIdx >= total) {
          const err = await patch({
            status: 'finished',
            ended_at: new Date().toISOString(),
            question_started_at: null,
            question_deadline_at: null,
          })
          if (err) return { ok: false, error: err }
        } else {
          const timer = await buildQuestionTimerFields(nextIdx)
          const err = await patch({
            status: 'question',
            current_question_index: nextIdx,
            ...timer,
          })
          if (err) return { ok: false, error: err }
        }
        break
      }
      case 'end': {
        const err = await patch({
          status: 'finished',
          ended_at: new Date().toISOString(),
          question_started_at: null,
          question_deadline_at: null,
        })
        if (err) return { ok: false, error: err }
        break
      }
      case 'timer_cut': {
        if (st !== 'question') {
          return {
            ok: false,
            error: 'Le chrono n’est actif que pendant une question affichée aux élèves.',
          }
        }
        const err = await patch({
          question_deadline_at: new Date().toISOString(),
        })
        if (err) return { ok: false, error: err }
        break
      }
      case 'timer_subtract_10': {
        if (st !== 'question') {
          return {
            ok: false,
            error: 'Le chrono n’est actif que pendant une question affichée aux élèves.',
          }
        }
        const d = session.question_deadline_at
        if (d == null || String(d).length === 0) {
          return {
            ok: false,
            error:
              'Chrono serveur absent : exécutez scripts/005_question_timer_sync.sql sur Supabase, puis relancez une question.',
          }
        }
        const ms = new Date(String(d)).getTime() - 10_000
        const newDeadline = new Date(Math.max(Date.now(), ms)).toISOString()
        const err = await patch({ question_deadline_at: newDeadline })
        if (err) return { ok: false, error: err }
        break
      }
      default:
        return { ok: false, error: 'Action inconnue.' }
    }

    return { ok: true }
  } catch (e) {
    console.error('[hostControlSession] unexpected', e)
    return {
      ok: false,
      error:
        'Erreur serveur. En local, lancez npm run dev pour voir le détail ; en prod, consultez les logs Vercel.',
    }
  }
}

export type HostQuestionParticipantStatus = 'waiting' | 'correct' | 'wrong' | 'timeout'

export type HostQuestionLiveRow = {
  participantId: string
  nickname: string
  status: HostQuestionParticipantStatus
  /** Lettre A–D pour QCM, « Vrai » / « Faux » pour V/F, null si en attente */
  answerLabel: string | null
}

/**
 * Pupitre : pour la question courante, état de chaque élève (réponse ou non, bon / mauvais / temps écoulé).
 * Réservé à l’animateur (host) de la session.
 */
export async function getHostQuestionLiveOverview(
  sessionId: string,
  questionId: string,
): Promise<
  | { ok: false; error: string }
  | { ok: true; rows: HostQuestionLiveRow[] }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: 'Non authentifié.' }
  }

  const { data: sess, error: sErr } = await supabase
    .from('sessions')
    .select('host_id')
    .eq('id', sessionId)
    .single()

  if (sErr || !sess || sess.host_id !== user.id) {
    return { ok: false, error: 'Session introuvable ou vous n’êtes pas l’animateur.' }
  }

  const { data: participants, error: pErr } = await supabase
    .from('participants')
    .select('id, nickname')
    .eq('session_id', sessionId)
    .order('nickname', { ascending: true })

  if (pErr) {
    console.error('[getHostQuestionLiveOverview] participants', pErr)
    return { ok: false, error: 'Impossible de charger les participants.' }
  }

  const { data: answers, error: aErr } = await supabase
    .from('answers')
    .select('participant_id, answer, is_correct')
    .eq('session_id', sessionId)
    .eq('question_id', questionId)

  if (aErr) {
    console.error('[getHostQuestionLiveOverview] answers', aErr)
    return { ok: false, error: 'Impossible de charger les réponses.' }
  }

  const { data: qMeta } = await supabase
    .from('questions')
    .select('question_type')
    .eq('id', questionId)
    .maybeSingle()

  const qType = qMeta?.question_type ?? 'mcq'

  const byParticipant = new Map(
    (answers ?? []).map((a) => [a.participant_id as string, a]),
  )

  const formatAnswerLabel = (raw: string | number | null | undefined): string => {
    const answer = raw == null ? '' : String(raw)
    if (answer === 'timeout') return '—'
    const n = Number(answer)
    if (qType === 'true_false') {
      if (answer === '0' || n === 0) return 'Vrai'
      if (answer === '1' || n === 1) return 'Faux'
    }
    if (Number.isFinite(n) && n >= 0 && n <= 25) {
      return String.fromCharCode(65 + n)
    }
    return answer || '—'
  }

  const rows: HostQuestionLiveRow[] = (participants ?? []).map((p) => {
    const a = byParticipant.get(p.id)
    if (!a) {
      return {
        participantId: p.id,
        nickname: p.nickname,
        status: 'waiting',
        answerLabel: null,
      }
    }
    if (String(a.answer) === 'timeout') {
      return {
        participantId: p.id,
        nickname: p.nickname,
        status: 'timeout',
        answerLabel: '—',
      }
    }
    return {
      participantId: p.id,
      nickname: p.nickname,
      status: a.is_correct ? 'correct' : 'wrong',
      answerLabel: formatAnswerLabel(a.answer),
    }
  })

  return { ok: true, rows }
}

/** Classement pour l’affichage joueur (anonyme autorisé par RLS). */
export async function getSessionLeaderboard(sessionId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('participants')
    .select('id, nickname, score, level')
    .eq('session_id', sessionId)
    .order('score', { ascending: false })

  if (error) throw error

  const ranked = (data ?? []).map((p, i) => ({
    rank: i + 1,
    ...p,
  }))

  return {
    top5: ranked.slice(0, 5),
    all: ranked,
  }
}

export async function joinSession(sessionId: string, nickname: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('participants')
    .insert({
      session_id: sessionId,
      nickname,
      avatar: `https://avatar.vercel.sh/${encodeURIComponent(nickname)}`,
    })
    .select()
    .single()

  if (error) throw error

  revalidateTag(`session-${sessionId}`)
  return data
}

export async function submitAnswer(
  participantId: string,
  sessionId: string,
  questionId: string,
  answer: string,
  isCorrect: boolean,
  timeTaken: number,
) {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('answers')
    .select('id')
    .eq('participant_id', participantId)
    .eq('question_id', questionId)
    .maybeSingle()

  if (existing) {
    return { duplicate: true as const }
  }

  const [{ data: sessionRow }, { data: qRow }] = await Promise.all([
    supabase.from('sessions').select('scoring_mode').eq('id', sessionId).maybeSingle(),
    supabase.from('questions').select('points, time_limit').eq('id', questionId).maybeSingle(),
  ])

  const basePoints = typeof qRow?.points === 'number' ? qRow.points : 100
  const budgetSec = scoringBudgetSeconds(qRow?.time_limit)
  const pointsEarned = computeAnswerPoints({
    scoringMode: sessionRow?.scoring_mode ?? 'classic',
    isCorrect,
    basePoints,
    timeTakenSec: timeTaken,
    budgetSec,
  })

  const { error } = await supabase.from('answers').insert({
    session_id: sessionId,
    participant_id: participantId,
    question_id: questionId,
    answer,
    is_correct: isCorrect,
    time_taken: timeTaken,
    points_earned: pointsEarned,
  })

  if (error) throw error

  const { data: participant } = await supabase
    .from('participants')
    .select('score')
    .eq('id', participantId)
    .single()

  const prev = participant?.score ?? 0
  const newScore = prev + pointsEarned
  const newLevel = Math.min(99, 1 + Math.floor(newScore / SCORE_PER_LEVEL))

  await supabase
    .from('participants')
    .update({
      score: newScore,
      level: newLevel,
    })
    .eq('id', participantId)

  revalidateTag(`session-${sessionId}`)
  return { duplicate: false as const, pointsEarned, newScore, newLevel }
}

export async function addReaction(
  sessionId: string,
  participantId: string,
  emoji: string,
) {
  const supabase = await createClient()

  const { data, error } = await supabase.from('reactions').insert({
    session_id: sessionId,
    participant_id: participantId,
    emoji,
  })

  if (error) throw error

  revalidateTag(`session-${sessionId}`)
  return data
}

export async function getSessionResults(sessionId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('answers')
    .select(
      `
      *,
      participant:participants (*),
      question:questions (*)
    `,
    )
    .eq('session_id', sessionId)
    .order('points_earned', { ascending: false })

  if (error) throw error
  return data
}

export type HostedSessionRow = {
  id: string
  pin_code: string
  status: string
  created_at: string
  ended_at: string | null
  quiz_id: string
  scoring_mode: string | null
  quizzes: { title: string } | null
}

export async function getMyHostedSessions(): Promise<HostedSessionRow[]> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  // Deux FK sessions → quizzes (quiz_id + secondary_quiz_id après 002) : sans hint,
  // PostgREST refuse l’embed (« more than one relationship ») → historique vide / erreur.
  const { data, error } = await supabase
    .from('sessions')
    .select(
      `
      id,
      pin_code,
      status,
      created_at,
      ended_at,
      quiz_id,
      scoring_mode,
      quizzes!quiz_id ( title )
    `,
    )
    .eq('host_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('[getMyHostedSessions]', error.message, error)
    throw error
  }
  return (data ?? []) as HostedSessionRow[]
}
