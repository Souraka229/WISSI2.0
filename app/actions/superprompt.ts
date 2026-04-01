'use server'

import { createClient } from '@/lib/supabase/server'
import { createQuestion } from '@/app/actions/quiz'
import { revalidateTag } from 'next/cache'

type AiQuestion = {
  question_text: string
  options: string[]
  correct_index: number
  explanation?: string
}

function parseQuestionsJson(raw: string): AiQuestion[] {
  const trimmed = raw.trim()
  const jsonBlock = trimmed.match(/\{[\s\S]*\}/)
  const text = jsonBlock ? jsonBlock[0] : trimmed
  const parsed = JSON.parse(text) as { questions?: AiQuestion[] }
  if (!Array.isArray(parsed.questions)) {
    throw new Error('Format JSON inattendu : tableau "questions" manquant')
  }
  return parsed.questions
}

async function verifyQuizAccess(quizId: string, userId: string) {
  const supabase = await createClient()
  const { data: quiz, error: quizError } = await supabase
    .from('quizzes')
    .select('id,user_id,title,theme')
    .eq('id', quizId)
    .single()

  if (quizError || !quiz) {
    throw new Error('Quiz introuvable')
  }
  if (quiz.user_id !== userId) {
    throw new Error('Accès refusé')
  }

  const { count: existingCountRaw } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('quiz_id', quizId)

  return {
    quiz,
    existingCount: existingCountRaw ?? 0,
  }
}

async function persistAiQuestionsToQuiz(
  quizId: string,
  aiQuestions: AiQuestion[],
  existingCount: number,
): Promise<{ created: number }> {
  let orderBase = existingCount
  let created = 0

  for (const q of aiQuestions) {
    if (!q.question_text || !Array.isArray(q.options) || q.options.length < 2) {
      continue
    }
    const opts = q.options.map((o) => String(o).trim()).filter(Boolean)
    if (opts.length < 2) continue

    let idx =
      typeof q.correct_index === 'number'
        ? q.correct_index
        : parseInt(String(q.correct_index), 10)
    if (Number.isNaN(idx) || idx < 0 || idx >= opts.length) {
      idx = 0
    }

    await createQuestion(
      quizId,
      q.question_text.trim(),
      'mcq',
      opts,
      String(idx),
      (q.explanation ?? '').trim() || '—',
      30,
      100,
      'medium',
      orderBase,
    )
    orderBase += 1
    created += 1
  }

  if (created === 0) {
    throw new Error(
      'Aucune question valide à importer. Vérifiez le JSON (QCM, 4 options, correct_index).',
    )
  }

  revalidateTag('quizzes')
  revalidateTag(`quiz-${quizId}`)
  return { created }
}

async function callLlmForQuestions(
  userPrompt: string,
  count: number,
  quizTitle: string,
  quizTheme: string | null,
): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY
  const groqKey = process.env.GROQ_API_KEY

  const system = `Tu es un expert pédagogique. Tu réponds UNIQUEMENT avec un objet JSON valide, sans markdown, de la forme :
{"questions":[{"question_text":"...","options":["A","B","C","D"],"correct_index":0,"explanation":"..."}]}
où correct_index est l'index (0-based) de la bonne réponse dans options, et chaque question a exactement 4 options pour un QCM.`

  const user = `Contexte du quiz — titre: "${quizTitle}", thème: "${quizTheme ?? 'général'}".
Nombre de questions demandé: ${count}.

Consignes / notes de cours de l'enseignant :
---
${userPrompt}
---

Génère exactement ${count} questions à choix multiples, variées, claires, en français.`

  if (openaiKey) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.6,
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`OpenAI: ${res.status} — ${err.slice(0, 200)}`)
    }
    const body = (await res.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    const content = body.choices?.[0]?.message?.content
    if (!content) throw new Error('Réponse OpenAI vide')
    return content
  }

  if (groqKey) {
    const res = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.6,
        }),
      },
    )
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Groq: ${res.status} — ${err.slice(0, 200)}`)
    }
    const body = (await res.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    const content = body.choices?.[0]?.message?.content
    if (!content) throw new Error('Réponse Groq vide')
    return content
  }

  throw new Error(
    'Aucune clé IA configurée. Ajoutez OPENAI_API_KEY ou GROQ_API_KEY dans les variables d’environnement (Vercel / .env.local).',
  )
}

export async function generateQuestionsWithSuperPrompt(
  quizId: string,
  instructions: string,
  questionCount: number,
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  const trimmed = instructions.trim()
  if (trimmed.length < 20) {
    throw new Error(
      'Décrivez vos notes ou le sujet du cours (au moins quelques phrases).',
    )
  }

  const count = Math.min(15, Math.max(3, Math.floor(questionCount)))

  const { quiz, existingCount } = await verifyQuizAccess(quizId, user.id)

  const raw = await callLlmForQuestions(
    trimmed,
    count,
    quiz.title,
    quiz.theme,
  )
  let aiQuestions: AiQuestion[]
  try {
    aiQuestions = parseQuestionsJson(raw)
  } catch {
    throw new Error(
      'La réponse de l’IA n’a pas pu être lue. Réessayez ou raccourcissez le texte.',
    )
  }

  if (aiQuestions.length === 0) {
    throw new Error('Aucune question générée')
  }

  return persistAiQuestionsToQuiz(quizId, aiQuestions, existingCount)
}

/** Collez la réponse JSON copiée depuis ChatGPT (même format que le SuperPrompt). */
export async function importQuestionsFromChatGptJson(
  quizId: string,
  jsonText: string,
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Non authentifié')
  }

  const trimmed = jsonText.trim()
  if (trimmed.length < 15) {
    throw new Error('Collez la réponse JSON complète de ChatGPT.')
  }

  const { existingCount } = await verifyQuizAccess(quizId, user.id)

  let aiQuestions: AiQuestion[]
  try {
    aiQuestions = parseQuestionsJson(trimmed)
  } catch {
    throw new Error(
      'JSON invalide. Demandez à ChatGPT de renvoyer uniquement un objet {"questions":[...]} sans markdown.',
    )
  }

  if (aiQuestions.length === 0) {
    throw new Error('Le tableau "questions" est vide.')
  }

  return persistAiQuestionsToQuiz(quizId, aiQuestions, existingCount)
}
