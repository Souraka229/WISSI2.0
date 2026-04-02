'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  DEFAULT_LEVEL_CHIPS,
  DEFAULT_THEME_CHIPS,
  parseShortcutChips,
  validateShortcutChips,
  type ShortcutChip,
} from '@/lib/quiz-shortcuts'

export type QuizCreationShortcuts = {
  themes: ShortcutChip[]
  levels: ShortcutChip[]
}

export async function getQuizCreationShortcuts(): Promise<QuizCreationShortcuts> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return {
      themes: [...DEFAULT_THEME_CHIPS],
      levels: [...DEFAULT_LEVEL_CHIPS],
    }
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('quiz_shortcut_themes, quiz_shortcut_levels')
    .eq('id', user.id)
    .maybeSingle()

  if (error || !data) {
    return {
      themes: [...DEFAULT_THEME_CHIPS],
      levels: [...DEFAULT_LEVEL_CHIPS],
    }
  }

  const row = data as {
    quiz_shortcut_themes?: unknown
    quiz_shortcut_levels?: unknown
  }

  return {
    themes: parseShortcutChips(row.quiz_shortcut_themes, DEFAULT_THEME_CHIPS),
    levels: parseShortcutChips(row.quiz_shortcut_levels, DEFAULT_LEVEL_CHIPS),
  }
}

export async function saveQuizCreationShortcuts(payload: {
  themes: ShortcutChip[]
  levels: ShortcutChip[]
}): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Non authentifié.' }
    }

    const err = validateShortcutChips(payload.themes, payload.levels)
    if (err) {
      return { success: false, error: err.message }
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        quiz_shortcut_themes: payload.themes,
        quiz_shortcut_levels: payload.levels,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (error) {
      if (error.message.includes('quiz_shortcut') || error.code === '42703') {
        return {
          success: false,
          error:
            'Colonnes manquantes : exécutez scripts/009_profile_quiz_shortcuts.sql sur Supabase.',
        }
      }
      console.error('[saveQuizCreationShortcuts]', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/create')
    return { success: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erreur inconnue'
    return { success: false, error: message }
  }
}

export async function resetQuizCreationShortcuts(): Promise<
  { success: true } | { success: false; error: string }
> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Non authentifié.' }
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        quiz_shortcut_themes: null,
        quiz_shortcut_levels: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (error) {
      if (error.message.includes('quiz_shortcut') || error.code === '42703') {
        return {
          success: false,
          error:
            'Colonnes manquantes : exécutez scripts/009_profile_quiz_shortcuts.sql sur Supabase.',
        }
      }
      return { success: false, error: error.message }
    }

    revalidatePath('/dashboard/create')
    return { success: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erreur inconnue'
    return { success: false, error: message }
  }
}
