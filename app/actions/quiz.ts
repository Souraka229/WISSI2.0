'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidateTag } from 'next/cache'

export async function createQuiz(
  title: string,
  description: string,
  theme: string,
  level: string
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data, error } = await supabase.from('quizzes').insert({
    user_id: user.id,
    title,
    description,
    theme,
    level,
  })

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
    `
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
  orderIndex: number
) {
  const supabase = await createClient()

  const { data, error } = await supabase.from('questions').insert({
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

  if (error) throw error

  revalidateTag(`quiz-${quizId}`)
  return data
}

export async function startSession(quizId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  // Generate unique PIN code
  const pinCode = Math.random().toString().slice(2, 8)

  const { data, error } = await supabase.from('sessions').insert({
    quiz_id: quizId,
    host_id: user.id,
    pin_code: pinCode,
    status: 'waiting',
  })

  if (error) throw error

  revalidateTag(`quiz-${quizId}`)
  return data
}

export async function updateSessionStatus(
  sessionId: string,
  status: string,
  currentQuestionIndex?: number
) {
  const supabase = await createClient()

  const updateData: any = { status }
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

export async function joinSession(sessionId: string, nickname: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.from('participants').insert({
    session_id: sessionId,
    nickname,
    avatar: `https://avatar.vercel.sh/${nickname}`,
  })

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
  timeTaken: number
) {
  const supabase = await createClient()

  const pointsEarned = isCorrect ? 100 : 0

  const { data, error } = await supabase.from('answers').insert({
    session_id: sessionId,
    participant_id: participantId,
    question_id: questionId,
    answer,
    is_correct: isCorrect,
    time_taken: timeTaken,
    points_earned: pointsEarned,
  })

  if (error) throw error

  // Update participant score
  await supabase
    .from('participants')
    .update({
      score: pointsEarned,
    })
    .eq('id', participantId)

  revalidateTag(`session-${sessionId}`)
  return data
}

export async function addReaction(
  sessionId: string,
  participantId: string,
  emoji: string
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
    `
    )
    .eq('session_id', sessionId)
    .order('points_earned', { ascending: false })

  if (error) throw error
  return data
}
