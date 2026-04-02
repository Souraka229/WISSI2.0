'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createQuiz } from '@/app/actions/quiz'
import { ArrowLeft, Zap, Sparkles, HelpCircle } from 'lucide-react'
import Link from 'next/link'

const THEME_CHIPS: { value: string; label: string }[] = [
  { value: 'history', label: 'Histoire' },
  { value: 'science', label: 'Sciences' },
  { value: 'math', label: 'Maths' },
  { value: 'language', label: 'Langues' },
  { value: 'general', label: 'Général' },
]

const LEVEL_CHIPS: { value: string; label: string }[] = [
  { value: 'beginner', label: 'Débutant' },
  { value: 'intermediate', label: 'Intermédiaire' },
  { value: 'advanced', label: 'Avancé' },
]

export default function CreateQuizPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    theme: 'general',
    level: 'intermediate',
  })

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6 lg:px-8">
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

      {/* Form */}
      <main className="max-w-2xl mx-auto px-6 lg:px-8 py-12">
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
          <div className="bg-card border border-border rounded-xl p-8">
            {/* Title */}
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

            {/* Description */}
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

            {/* Theme & Level */}
            <div className="mb-6 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">
                Raccourcis (1 clic)
              </p>
              <div className="mb-4 flex flex-wrap gap-2">
                {THEME_CHIPS.map((c) => (
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
                {LEVEL_CHIPS.map((c) => (
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
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
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
                  <option value="general">Culture générale</option>
                  <option value="science">Sciences</option>
                  <option value="history">Histoire</option>
                  <option value="math">Mathématiques</option>
                  <option value="language">Langues</option>
                  <option value="geography">Géographie</option>
                  <option value="literature">Littérature</option>
                  <option value="philosophy">Philosophie</option>
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
                  <option value="beginner">Débutant</option>
                  <option value="intermediate">Intermédiaire</option>
                  <option value="advanced">Avancé</option>
                </select>
              </div>
            </div>

            {/* AI Generation Option */}
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

          {/* Actions */}
          <div className="flex gap-4">
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
