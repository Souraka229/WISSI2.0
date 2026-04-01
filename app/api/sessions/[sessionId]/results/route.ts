import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const supabase = await createClient()

  try {
    // Get all answers for the session
    const { data: answers, error: answersError } = await supabase
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

    if (answersError) throw answersError

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError) throw sessionError

    // Get all participants
    const { data: participants, error: participantsError } = await supabase
      .from('participants')
      .select('*')
      .eq('session_id', sessionId)
      .order('score', { ascending: false })

    if (participantsError) throw participantsError

    // Calculate statistics
    const stats = {
      totalParticipants: participants.length,
      totalQuestions: session.current_question_index + 1,
      averageScore: answers.length > 0 ? Math.round(answers.reduce((sum, a) => sum + (a.points_earned || 0), 0) / participants.length) : 0,
      correctAnswers: answers.filter((a) => a.is_correct).length,
      totalAnswers: answers.length,
      correctPercentage: answers.length > 0 ? Math.round((answers.filter((a) => a.is_correct).length / answers.length) * 100) : 0,
    }

    return NextResponse.json({
      session,
      participants,
      answers,
      stats,
    })
  } catch (error) {
    console.error('Error fetching results:', error)
    return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 })
  }
}
