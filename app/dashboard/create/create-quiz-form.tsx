'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createQuiz } from '@/app/actions/quiz'
import {
  resetQuizCreationShortcuts,
  saveQuizCreationShortcuts,
} from '@/app/actions/quiz-shortcuts'
import {
  DEFAULT_LEVEL_CHIPS,
  DEFAULT_THEME_CHIPS,
  ensureUniqueValue,
  LABEL_MAX,
  MAX_CHIPS,
  mergeThemeSelectOptions,
  slugFromLabel,
  type ShortcutChip,
} from '@/lib/quiz-shortcuts'
import { ArrowLeft, HelpCircle, Pencil, Plus, RotateCcw, Sparkles, Trash2, Zap } from 'lucide-react'
import Link from 'next/link'

type Props = {
  initialThemeChips: ShortcutChip[]
  initialLevelChips: ShortcutChip[]
}

export function CreateQuizForm({ initialThemeChips, initialLevelChips }: Props) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [shortcutError, setShortcutError] = useState<string | null>(null)
  const [shortcutBusy, setShortcutBusy] = useState(false)

  const [themeChips, setThemeChips] = useState<ShortcutChip[]>(initialThemeChips)
  const [levelChips, setLevelChips] = useState<ShortcutChip[]>(initialLevelChips)

  const [customizing, setCustomizing] = useState(false)
  const [draftThemes, setDraftThemes] = useState<ShortcutChip[]>(initialThemeChips)
  const [draftLevels, setDraftLevels] = useState<ShortcutChip[]>(initialLevelChips)
  const [newThemeLabel, setNewThemeLabel] = useState('')
  const [newLevelLabel, setNewLevelLabel] = useState('')

  useEffect(() => {
    setThemeChips(initialThemeChips)
    setLevelChips(initialLevelChips)
    if (!customizing) {
      setDraftThemes(initialThemeChips)
      setDraftLevels(initialLevelChips)
    }
  }, [initialThemeChips, initialLevelChips, customizing])

  const themeSelectOptions = useMemo(() => mergeThemeSelectOptions(themeChips), [themeChips])

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    theme: 'general',
    level: 'intermediate',
  })

  useEffect(() => {
    const themeOk = themeSelectOptions.some((c) => c.value === formData.theme)
    const levelOk = levelChips.some((c) => c.value === formData.level)
    if (!themeOk && themeSelectOptions[0]) {
      setFormData((p) => ({ ...p, theme: themeSelectOptions[0].value }))
    }
    if (!levelOk && levelChips[0]) {
      setFormData((p) => ({ ...p, level: levelChips[0].value }))
    }
  }, [themeSelectOptions, levelChips, formData.theme, formData.level])

  const openCustomize = useCallback(() => {
    setDraftThemes([...themeChips])
    setDraftLevels([...levelChips])
    setShortcutError(null)
    setNewThemeLabel('')
    setNewLevelLabel('')
    setCustomizing(true)
  }, [themeChips, levelChips])

  const cancelCustomize = useCallback(() => {
    setCustomizing(false)
    setShortcutError(null)
  }, [])

  const handleSaveShortcuts = async () => {
    setShortcutBusy(true)
    setShortcutError(null)
    const res = await saveQuizCreationShortcuts({
      themes: draftThemes,
      levels: draftLevels,
    })
    setShortcutBusy(false)
    if (!res.success) {
      setShortcutError(res.error)
      return
    }
    setThemeChips([...draftThemes])
    setLevelChips([...draftLevels])
    setCustomizing(false)
    router.refresh()
  }

  const handleResetShortcuts = async () => {
    setShortcutBusy(true)
    setShortcutError(null)
    const res = await resetQuizCreationShortcuts()
    setShortcutBusy(false)
    if (!res.success) {
      setShortcutError(res.error)
      return
    }
    const t = [...DEFAULT_THEME_CHIPS]
    const l = [...DEFAULT_LEVEL_CHIPS]
    setThemeChips(t)
    setLevelChips(l)
    setDraftThemes(t)
    setDraftLevels(l)
    setCustomizing(false)
    router.refresh()
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setSubmitError(null)

    try {
      const quiz = await createQuiz(
        formData.title,
        formData.description,
        formData.theme,
        formData.level
      )
      if (!quiz?.id) {
        throw new Error('Réponse serveur invalide')
      }
      router.push(`/dashboard/quiz/${quiz.id}`)
      router.refresh()
    } catch (error) {
      console.error('Error creating quiz:', error)
      const message =
        error instanceof Error ? error.message : 'Erreur lors de la création du quiz'
      setSubmitError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const addDraftTheme = () => {
    const label = newThemeLabel.trim().slice(0, LABEL_MAX)
    if (!label || draftThemes.length >= MAX_CHIPS) return
    const base = slugFromLabel(label)
    const value = ensureUniqueValue(base, draftThemes)
    setDraftThemes((d) => [...d, { value, label }])
    setNewThemeLabel('')
  }

  const addDraftLevel = () => {
    const label = newLevelLabel.trim().slice(0, LABEL_MAX)
    if (!label || draftLevels.length >= MAX_CHIPS) return
    const base = slugFromLabel(label)
    const value = ensureUniqueValue(base, draftLevels)
    setDraftLevels((d) => [...d, { value, label }])
    setNewLevelLabel('')
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Link>
          <Button variant="outline" size="sm" className="gap-1.5 font-semibold" asChild>
            <Link href="/aide">
              <HelpCircle className="h-4 w-4" />
              Aide
            </Link>
          </Button>
        </div>
      </div>

      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="flex items-center gap-2 text-sm font-bold text-violet-600 dark:text-violet-400">
            <Sparkles className="h-4 w-4" />
            Nouveau quiz
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Créer un quiz</h1>
          <p className="mt-2 text-muted-foreground">
            Ensuite vous ajouterez les questions, le SuperPrompt (ChatGPT) ou la génération IA sur la
            fiche du quiz.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {submitError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {submitError}
            </div>
          )}
          <div className="bg-card border border-border rounded-xl p-5 sm:p-8">
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Titre du quiz *
              </label>
              <Input
                type="text"
                name="title"
                placeholder="Ex: Histoire de France - La Révolution"
                value={formData.title}
                onChange={handleChange}
                required
                className="bg-input border-border"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Description
              </label>
              <textarea
                name="description"
                placeholder="Décrivez le contenu de ce quiz..."
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="w-full px-4 py-3 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/40 resize-none"
                rows={4}
              />
            </div>

            <div className="mb-6 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">
                  Raccourcis (1 clic)
                </p>
                {!customizing ? (
                  <button
                    type="button"
                    onClick={openCustomize}
                    className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-background/80 px-3 py-1 text-xs font-semibold text-violet-800 transition-colors hover:bg-violet-500/10 dark:text-violet-200"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Personnaliser
                  </button>
                ) : null}
              </div>

              {!customizing ? (
                <>
                  <div className="mb-4 flex flex-wrap gap-2">
                    {themeChips.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            theme: c.value,
                          }))
                        }
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                          formData.theme === c.value
                            ? 'border-violet-600 bg-violet-600 text-white shadow-md'
                            : 'border-border bg-background hover:border-violet-400'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {levelChips.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            level: c.value,
                          }))
                        }
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                          formData.level === c.value
                            ? 'border-fuchsia-600 bg-fuchsia-600 text-white shadow-md'
                            : 'border-border bg-background hover:border-fuchsia-400'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="space-y-4 border-t border-violet-500/15 pt-4">
                  {shortcutError ? (
                    <p className="text-sm text-destructive">{shortcutError}</p>
                  ) : null}
                  <div>
                    <p className="mb-2 text-xs font-semibold text-muted-foreground">Thèmes (puces)</p>
                    <ul className="space-y-2">
                      {draftThemes.map((c, i) => (
                        <li
                          key={`${c.value}-${i}`}
                          className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background/60 p-2"
                        >
                          <Input
                            value={c.label}
                            onChange={(e) => {
                              const label = e.target.value.slice(0, LABEL_MAX)
                              setDraftThemes((d) =>
                                d.map((x, j) => (j === i ? { ...x, label } : x))
                              )
                            }}
                            className="h-8 min-w-[8rem] flex-1 text-sm"
                            aria-label={`Libellé thème ${i + 1}`}
                          />
                          <Input
                            value={c.value}
                            onChange={(e) => {
                              const value = e.target.value
                                .toLowerCase()
                                .replace(/[^a-z0-9_]/g, '')
                                .slice(0, 40)
                              setDraftThemes((d) =>
                                d.map((x, j) => (j === i ? { ...x, value } : x))
                              )
                            }}
                            className="h-8 w-32 font-mono text-xs"
                            title="Identifiant technique (slug)"
                            aria-label={`Valeur thème ${i + 1}`}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                            disabled={draftThemes.length <= 1 || shortcutBusy}
                            onClick={() =>
                              setDraftThemes((d) => d.filter((_, j) => j !== i))
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Input
                        placeholder="Nouveau thème (libellé)"
                        value={newThemeLabel}
                        onChange={(e) => setNewThemeLabel(e.target.value)}
                        className="h-9 max-w-xs flex-1 text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            addDraftTheme()
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        disabled={draftThemes.length >= MAX_CHIPS || shortcutBusy}
                        onClick={addDraftTheme}
                      >
                        <Plus className="h-4 w-4" />
                        Ajouter
                      </Button>
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold text-muted-foreground">Niveaux (puces)</p>
                    <ul className="space-y-2">
                      {draftLevels.map((c, i) => (
                        <li
                          key={`${c.value}-${i}`}
                          className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background/60 p-2"
                        >
                          <Input
                            value={c.label}
                            onChange={(e) => {
                              const label = e.target.value.slice(0, LABEL_MAX)
                              setDraftLevels((d) =>
                                d.map((x, j) => (j === i ? { ...x, label } : x))
                              )
                            }}
                            className="h-8 min-w-[8rem] flex-1 text-sm"
                            aria-label={`Libellé niveau ${i + 1}`}
                          />
                          <Input
                            value={c.value}
                            onChange={(e) => {
                              const value = e.target.value
                                .toLowerCase()
                                .replace(/[^a-z0-9_]/g, '')
                                .slice(0, 40)
                              setDraftLevels((d) =>
                                d.map((x, j) => (j === i ? { ...x, value } : x))
                              )
                            }}
                            className="h-8 w-32 font-mono text-xs"
                            title="Identifiant technique (slug)"
                            aria-label={`Valeur niveau ${i + 1}`}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                            disabled={draftLevels.length <= 1 || shortcutBusy}
                            onClick={() =>
                              setDraftLevels((d) => d.filter((_, j) => j !== i))
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Input
                        placeholder="Nouveau niveau (libellé)"
                        value={newLevelLabel}
                        onChange={(e) => setNewLevelLabel(e.target.value)}
                        className="h-9 max-w-xs flex-1 text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            addDraftLevel()
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        disabled={draftLevels.length >= MAX_CHIPS || shortcutBusy}
                        onClick={addDraftLevel}
                      >
                        <Plus className="h-4 w-4" />
                        Ajouter
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={shortcutBusy}
                      onClick={handleSaveShortcuts}
                      className="bg-violet-600 font-semibold text-white hover:bg-violet-500"
                    >
                      Enregistrer les raccourcis
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={shortcutBusy}
                      onClick={cancelCustomize}
                    >
                      Annuler
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-muted-foreground"
                      disabled={shortcutBusy}
                      onClick={handleResetShortcuts}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Défauts
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Thème
                </label>
                <select
                  name="theme"
                  value={formData.theme}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-secondary/40"
                >
                  {themeSelectOptions.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Niveau de difficulté
                </label>
                <select
                  name="level"
                  value={formData.level}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-secondary/40"
                >
                  {levelChips.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-secondary/10 border border-secondary/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-secondary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 text-secondary" />
                </div>
                <div>
                  <p className="font-medium mb-1">SuperPrompt (après création)</p>
                  <p className="text-sm text-muted-foreground">
                    Sur la page du quiz : copiez un SuperPrompt prêt pour <strong>ChatGPT</strong>, collez la réponse JSON pour importer les QCM — ou utilisez la génération automatique si une clé API est configurée.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Link href="/dashboard" className="flex-1">
              <Button variant="outline" size="lg" className="w-full border-border hover:bg-muted">
                Annuler
              </Button>
            </Link>
            <Button
              type="submit"
              size="lg"
              disabled={!formData.title || isLoading}
              className="flex-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 font-bold text-white shadow-lg shadow-violet-500/25 hover:from-violet-500 hover:to-fuchsia-500"
            >
              {isLoading ? 'Création…' : 'Créer et ouvrir l’éditeur'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}
