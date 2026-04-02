import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

export type CountResult = { count: number | null; error: string | null }

export type AnalyticsEventRow = {
  id: string
  event_name: string
  path: string | null
  referrer: string | null
  user_id: string | null
  anonymous_id: string | null
  metadata: unknown
  user_agent: string | null
  created_at: string
}

export type CookieConsentRow = {
  id: string
  anonymous_id: string
  user_id: string | null
  necessary: boolean
  analytics: boolean
  marketing: boolean
  consent_version: string
  decided_at: string
  updated_at: string
}

export type ProfileRow = {
  id: string
  email: string | null
  display_name: string | null
  avatar_url: string | null
  created_at: string | null
  role?: string | null
}

export type QuizRow = {
  id: string
  user_id: string
  title: string
  description: string | null
  theme: string | null
  level: string | null
  is_public: boolean | null
  created_at: string | null
}

export type SessionRow = {
  id: string
  quiz_id: string
  host_id: string
  pin_code: string
  status: string
  scoring_mode: string | null
  game_mode: string | null
  created_at: string | null
  started_at: string | null
  ended_at: string | null
}

export type ParticipantRow = {
  id: string
  session_id: string
  nickname: string
  score: number | null
  joined_at: string | null
}

export type AnswerRow = {
  id: string
  session_id: string
  participant_id: string
  question_id: string
  answer: string
  is_correct: boolean
  points_earned: number | null
  answered_at: string | null
}

export type QuestionRow = {
  id: string
  quiz_id: string
  question_text: string
  question_type: string
  order_index: number
  created_at: string | null
}

export type AuthUserSummary = {
  id: string
  email: string | undefined
  created_at: string
  last_sign_in_at: string | null
  email_confirmed: boolean
}

export type SuperadminDashboardPayload = {
  counts: {
    profiles: CountResult
    quizzes: CountResult
    questions: CountResult
    sessions: CountResult
    participants: CountResult
    answers: CountResult
    reactions: CountResult
    analytics: CountResult
    cookies: CountResult
  }
  analyticsEvents: AnalyticsEventRow[]
  analyticsError: string | null
  cookieConsents: CookieConsentRow[]
  cookiesError: string | null
  profiles: ProfileRow[]
  profilesError: string | null
  quizzes: QuizRow[]
  quizzesError: string | null
  sessions: SessionRow[]
  sessionsError: string | null
  participants: ParticipantRow[]
  participantsError: string | null
  answers: AnswerRow[]
  answersError: string | null
  questions: QuestionRow[]
  questionsError: string | null
  authUsers: AuthUserSummary[]
  authError: string | null
}

async function headCount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
): Promise<CountResult> {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
  return { count: count ?? null, error: error?.message ?? null }
}

async function fetchAuthUsersSummaries(maxUsers: number): Promise<{ users: AuthUserSummary[]; error: string | null }> {
  try {
    const admin = createServiceRoleClient()
    const users: AuthUserSummary[] = []
    let page = 1
    const perPage = 100
    while (users.length < maxUsers) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
      if (error) {
        return { users, error: error.message }
      }
      const batch = data.users ?? []
      if (batch.length === 0) break
      for (const u of batch) {
        users.push({
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at ?? null,
          email_confirmed: Boolean(u.email_confirmed_at),
        })
        if (users.length >= maxUsers) break
      }
      if (batch.length < perPage) break
      page += 1
      if (page > 30) break
    }
    return { users, error: null }
  } catch {
    return {
      users: [],
      error:
        'Clé SUPABASE_SERVICE_ROLE_KEY absente ou invalide — liste Auth limitée. Les tables Supabase restent consultables.',
    }
  }
}

/**
 * Charge toutes les données exposées dans la console superadmin (échantillons + comptages).
 */
export async function loadSuperadminDashboard(): Promise<SuperadminDashboardPayload> {
  const supabase = await createClient()

  const [
    profilesCount,
    quizzesCount,
    questionsCount,
    sessionsCount,
    participantsCount,
    answersCount,
    reactionsCount,
    analyticsCount,
    cookiesCount,
    analyticsRes,
    cookiesRes,
    profilesRes,
    quizzesRes,
    sessionsRes,
    participantsRes,
    answersRes,
    questionsRes,
    authRes,
  ] = await Promise.all([
    headCount(supabase, 'profiles'),
    headCount(supabase, 'quizzes'),
    headCount(supabase, 'questions'),
    headCount(supabase, 'sessions'),
    headCount(supabase, 'participants'),
    headCount(supabase, 'answers'),
    headCount(supabase, 'reactions'),
    headCount(supabase, 'analytics_events'),
    headCount(supabase, 'cookie_consents'),
    supabase
      .from('analytics_events')
      .select(
        'id, event_name, path, referrer, user_id, anonymous_id, metadata, user_agent, created_at',
      )
      .order('created_at', { ascending: false })
      .limit(400),
    supabase.from('cookie_consents').select('*').order('decided_at', { ascending: false }).limit(300),
    supabase
      .from('profiles')
      .select('id, email, display_name, avatar_url, created_at, role')
      .order('created_at', { ascending: false })
      .limit(250),
    supabase
      .from('quizzes')
      .select('id, user_id, title, description, theme, level, is_public, created_at')
      .order('created_at', { ascending: false })
      .limit(250),
    supabase
      .from('sessions')
      .select('id, quiz_id, host_id, pin_code, status, scoring_mode, game_mode, created_at, started_at, ended_at')
      .order('created_at', { ascending: false })
      .limit(250),
    supabase
      .from('participants')
      .select('id, session_id, nickname, score, joined_at')
      .order('joined_at', { ascending: false })
      .limit(250),
    supabase
      .from('answers')
      .select('id, session_id, participant_id, question_id, answer, is_correct, points_earned, answered_at')
      .order('answered_at', { ascending: false })
      .limit(250),
    supabase
      .from('questions')
      .select('id, quiz_id, question_text, question_type, order_index, created_at')
      .order('created_at', { ascending: false })
      .limit(200),
    fetchAuthUsersSummaries(600),
  ])

  return {
    counts: {
      profiles: profilesCount,
      quizzes: quizzesCount,
      questions: questionsCount,
      sessions: sessionsCount,
      participants: participantsCount,
      answers: answersCount,
      reactions: reactionsCount,
      analytics: analyticsCount,
      cookies: cookiesCount,
    },
    analyticsEvents: (analyticsRes.data ?? []) as AnalyticsEventRow[],
    analyticsError: analyticsRes.error?.message ?? null,
    cookieConsents: (cookiesRes.data ?? []) as CookieConsentRow[],
    cookiesError: cookiesRes.error?.message ?? null,
    profiles: (profilesRes.data ?? []) as ProfileRow[],
    profilesError: profilesRes.error?.message ?? null,
    quizzes: (quizzesRes.data ?? []) as QuizRow[],
    quizzesError: quizzesRes.error?.message ?? null,
    sessions: (sessionsRes.data ?? []) as SessionRow[],
    sessionsError: sessionsRes.error?.message ?? null,
    participants: (participantsRes.data ?? []) as ParticipantRow[],
    participantsError: participantsRes.error?.message ?? null,
    answers: (answersRes.data ?? []) as AnswerRow[],
    answersError: answersRes.error?.message ?? null,
    questions: (questionsRes.data ?? []) as QuestionRow[],
    questionsError: questionsRes.error?.message ?? null,
    authUsers: authRes.users,
    authError: authRes.error,
  }
}
