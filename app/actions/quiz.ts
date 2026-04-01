'use server'

import { randomInt } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { countSessionQuestions } from '@/lib/session-questions'
import { revalidateTag } from 'next/cache'

export type GameMode = 'challenge_free' | 'prof_dual'

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
    .select('*')
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

export async function startSession(
  quizId: string,
  options?: { gameMode?: GameMode; secondaryQuizId?: string | null },
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

  if (gameMode === 'prof_dual') {
    const sid = options?.secondaryQuizId
    if (!sid || sid === quizId) {
      throw new Error('Choisissez un deuxième quiz différent pour les Défis du prof')
    }
    const { data: q2, error: e2 } = await supabase
      .from('quizzes')
      .select('id')
      .eq('id', sid)
      .eq('user_id', user.id)
      .maybeSingle()
    if (e2) throw e2
    if (!q2) throw new Error('Le deuxième quiz est introuvable ou ne vous appartient pas')
    secondaryQuizId = sid
  }

  const maxAttempts = 10
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const pinCode = String(randomInt(100000, 1000000))

    const insertPayload: Record<string, unknown> = {
      quiz_id: quizId,
      host_id: user.id,
      pin_code: pinCode,
      status: 'waiting',
    }

    if (gameMode === 'prof_dual' && secondaryQuizId) {
      insertPayload.game_mode = 'prof_dual'
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

export async function hostControlSession(
  sessionId: string,
  action: 'start' | 'show_leaderboard' | 'next_question' | 'end',
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Non authentifié')

  const { data: session, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (error || !session) throw new Error('Session introuvable')
  if (session.host_id !== user.id) throw new Error('Accès refusé')

  const total = await countSessionQuestions(supabase, session)

  if (total === 0) throw new Error('Aucune question dans cette session')

  const patch = async (fields: Record<string, unknown>) => {
    const { error: uErr } = await supabase
      .from('sessions')
      .update(fields)
      .eq('id', sessionId)
    if (uErr) throw uErr
    revalidateTag(`session-${sessionId}`)
  }

  switch (action) {
    case 'start': {
      if (!['waiting'].includes(session.status)) {
        throw new Error('La partie est déjà lancée')
      }
      await patch({
        status: 'question',
        current_question_index: 0,
        started_at: new Date().toISOString(),
      })
      break
    }
    case 'show_leaderboard': {
      await patch({ status: 'results' })
      break
    }
    case 'next_question': {
      const idx = session.current_question_index ?? 0
      const nextIdx = idx + 1
      if (nextIdx >= total) {
        await patch({
          status: 'finished',
          ended_at: new Date().toISOString(),
        })
      } else {
        await patch({
          status: 'question',
          current_question_index: nextIdx,
        })
      }
      break
    }
    case 'end': {
      await patch({
        status: 'finished',
        ended_at: new Date().toISOString(),
      })
      break
    }
    default:
      throw new Error('Action inconnue')
  }

  return { ok: true as const }
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

  const { data: qRow } = await supabase
    .from('questions')
    .select('points')
    .eq('id', questionId)
    .maybeSingle()

  const basePoints = typeof qRow?.points === 'number' ? qRow.points : 100
  const pointsEarned = isCorrect ? basePoints : 0

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
  const newLevel = Math.min(99, 1 + Math.floor(newScore / 200))

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
