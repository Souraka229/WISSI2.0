'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getQuiz, createQuestion } from '@/app/actions/quiz'
import {
  generateQuestionsWithSuperPrompt,
  importQuestionsFromChatGptJson,
} from '@/app/actions/superprompt'
import { buildSuperPromptForExternalChat } from '@/lib/superprompt-template'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, ArrowLeft, Loader2, Sparkles, Copy, ClipboardPaste } from 'lucide-react'
import Link from 'next/link'

export default function QuizEditorPage() {
  const params = useParams()
  const quizId = params.id as string
  const [quiz, setQuiz] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showAddQuestion, setShowAddQuestion] = useState(false)
  const [formData, setFormData] = useState({
    questionText: '',
    questionType: 'mcq',
    options: ['', '', '', ''],
    correctAnswer: '0',
    explanation: '',
    timeLimit: 30,
    points: 100,
    difficulty: 'medium',
  })
  const [superPromptText, setSuperPromptText] = useState('')
  const [superQuestionCount, setSuperQuestionCount] = useState(5)
  const [superBusy, setSuperBusy] = useState(false)
  const [superError, setSuperError] = useState<string | null>(null)
  const [superSuccess, setSuperSuccess] = useState<string | null>(null)
  const [pastedChatGptJson, setPastedChatGptJson] = useState('')
  const [importBusy, setImportBusy] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)
  const [copyFeedback, setCopyFeedback] = useState(false)

  useEffect(() => {
    const loadQuiz = async () => {
      try {
        const data = await getQuiz(quizId)
        setQuiz(data)
      } catch (error) {
        console.error('Error loading quiz:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadQuiz()
  }, [quizId])

  const handleSuperPrompt = async () => {
    setSuperError(null)
    setSuperSuccess(null)
    setSuperBusy(true)
    try {
      const { created } = await generateQuestionsWithSuperPrompt(
        quizId,
        superPromptText,
        superQuestionCount,
      )
      setSuperSuccess(`${created} question(s) générée(s) et ajoutées au quiz.`)
      setSuperPromptText('')
      const updatedQuiz = await getQuiz(quizId)
      setQuiz(updatedQuiz)
    } catch (err) {
      setSuperError(
        err instanceof Error ? err.message : 'Échec de la génération SuperPrompt',
      )
    } finally {
      setSuperBusy(false)
    }
  }

  const handleCopySuperPromptForChatGpt = async () => {
    const text = buildSuperPromptForExternalChat({
      quizTitle: quiz.title,
      quizTheme: quiz.theme,
      notes: superPromptText,
      questionCount: superQuestionCount,
    })
    try {
      await navigator.clipboard.writeText(text)
      setCopyFeedback(true)
      window.setTimeout(() => setCopyFeedback(false), 2500)
    } catch {
      setSuperError(
        'Impossible de copier (autorisez le presse-papiers ou copiez manuellement depuis la console).',
      )
    }
  }

  const handleImportPastedJson = async () => {
    setImportError(null)
    setImportSuccess(null)
    setImportBusy(true)
    try {
      const { created } = await importQuestionsFromChatGptJson(
        quizId,
        pastedChatGptJson,
      )
      setImportSuccess(`${created} question(s) importée(s) depuis ChatGPT.`)
      setPastedChatGptJson('')
      const updatedQuiz = await getQuiz(quizId)
      setQuiz(updatedQuiz)
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : 'Import impossible',
      )
    } finally {
      setImportBusy(false)
    }
  }

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createQuestion(
        quizId,
        formData.questionText,
        formData.questionType,
        formData.options.filter((o) => o),
        formData.correctAnswer,
        formData.explanation,
        formData.timeLimit,
        formData.points,
        formData.difficulty,
        quiz.questions.length
      )

      setFormData({
        questionText: '',
        questionType: 'mcq',
        options: ['', '', '', ''],
        correctAnswer: '0',
        explanation: '',
        timeLimit: 30,
        points: 100,
        difficulty: 'medium',
      })
      setShowAddQuestion(false)

      const updatedQuiz = await getQuiz(quizId)
      setQuiz(updatedQuiz)
    } catch (error) {
      console.error('Error adding question:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Quiz not found</h2>
          <Link href="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{quiz.title}</h1>
              <p className="text-muted-foreground text-sm mt-1">
                {quiz.questions?.length || 0} questions
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* SuperPrompt — génération IA */}
        <section className="mb-10 rounded-xl border border-secondary/30 bg-secondary/10 p-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/25">
              <Sparkles className="h-4 w-4 text-secondary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">SuperPrompt</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Décrivez ce que vous voulez dans le quiz (notes, chapitre, objectifs). Ensuite : soit vous
            utilisez <strong>ChatGPT</strong> (copier-coller), soit la génération automatique si une clé API
            est configurée sur le serveur.
          </p>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Ce qui vous intéresse pour ce quiz (notes / sujet) *
              </label>
              <textarea
                value={superPromptText}
                onChange={(e) => setSuperPromptText(e.target.value)}
                disabled={superBusy || importBusy}
                rows={6}
                placeholder="Ex. : Chapitre SCITI sur les réseaux — définir TCP/IP, OSI, différence paquet/circuit, 3 exemples de protocoles…"
                className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/40"
              />
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Nombre de questions
                </label>
                <select
                  value={superQuestionCount}
                  onChange={(e) => setSuperQuestionCount(Number(e.target.value))}
                  disabled={superBusy || importBusy}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                >
                  {[3, 5, 8, 10, 12, 15].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Flux ChatGPT : copier → coller réponse */}
            <div className="rounded-lg border border-border bg-background/60 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary/30 text-xs font-bold">
                  1
                </span>
                Avec ChatGPT (recommandé sans clé API)
              </h3>
              <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1 mb-3">
                <li>Cliquez sur « Copier le SuperPrompt ».</li>
                <li>Ouvrez ChatGPT et collez le texte dans une nouvelle conversation.</li>
                <li>Copiez toute la réponse JSON de ChatGPT (un objet qui commence par {'{'}"questions").</li>
                <li>Collez-la ci-dessous et cliquez sur « Importer les questions ».</li>
              </ol>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={superPromptText.trim().length < 20 || importBusy}
                  onClick={() => void handleCopySuperPromptForChatGpt()}
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" />
                  {copyFeedback ? 'Copié dans le presse-papiers !' : 'Copier le SuperPrompt pour ChatGPT'}
                </Button>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Coller ici la réponse JSON de ChatGPT
                </label>
                <textarea
                  value={pastedChatGptJson}
                  onChange={(e) => setPastedChatGptJson(e.target.value)}
                  disabled={importBusy}
                  rows={5}
                  placeholder='{"questions":[{"question_text":"...","options":["A","B","C","D"],"correct_index":0,"explanation":"..."}, ...]}'
                  className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/40"
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                disabled={importBusy || pastedChatGptJson.trim().length < 15}
                onClick={() => void handleImportPastedJson()}
                className="gap-2"
              >
                {importBusy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Import…
                  </>
                ) : (
                  <>
                    <ClipboardPaste className="h-4 w-4" />
                    Importer les questions
                  </>
                )}
              </Button>
              {importError && (
                <p className="text-sm text-destructive">{importError}</p>
              )}
              {importSuccess && (
                <p className="text-sm text-green-600 dark:text-green-400">{importSuccess}</p>
              )}
            </div>

            {/* Génération serveur */}
            <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold">
                  2
                </span>
                Génération automatique (optionnel)
              </h3>
              <p className="text-xs text-muted-foreground">
                Nécessite <code className="rounded bg-muted px-1">OPENAI_API_KEY</code> ou{' '}
                <code className="rounded bg-muted px-1">GROQ_API_KEY</code> sur Vercel / .env.local.
              </p>
              <Button
                type="button"
                disabled={superBusy || importBusy || superPromptText.trim().length < 20}
                onClick={() => void handleSuperPrompt()}
                className="gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90"
              >
                {superBusy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Génération…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Générer sur le serveur
                  </>
                )}
              </Button>
            </div>

            {superError && (
              <p className="text-sm text-destructive">{superError}</p>
            )}
            {superSuccess && (
              <p className="text-sm text-green-600 dark:text-green-400">{superSuccess}</p>
            )}
          </div>
        </section>

        {/* Questions List */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground">Questions</h2>
            <Button
              onClick={() => setShowAddQuestion(!showAddQuestion)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            >
              <Plus className="w-4 h-4" /> Add Question
            </Button>
          </div>

          {quiz.questions && quiz.questions.length > 0 ? (
            <div className="space-y-4">
              {quiz.questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="bg-card border border-border rounded-lg p-6 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-foreground">
                      {idx + 1}. {q.question_text}
                    </h3>
                    <span className="text-xs px-2 py-1 bg-primary/15 text-primary rounded-full">
                      {q.question_type}
                    </span>
                  </div>

                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <span>Time: {q.time_limit}s</span>
                    <span>•</span>
                    <span>Points: {q.points}</span>
                    <span>•</span>
                    <span>Level: {q.difficulty}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-card border border-border rounded-lg">
              <p className="text-muted-foreground">No questions yet. Add your first one!</p>
            </div>
          )}
        </div>

        {/* Add Question Form */}
        {showAddQuestion && (
          <div className="bg-card border border-border rounded-xl p-8 mb-8">
            <h3 className="text-lg font-bold text-foreground mb-6">Add New Question</h3>
            <form onSubmit={handleAddQuestion} className="space-y-6">
              {/* Question Text */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Question Text *
                </label>
                <textarea
                  value={formData.questionText}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      questionText: e.target.value,
                    }))
                  }
                  required
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  rows={3}
                  placeholder="What is 2+2?"
                />
              </div>

              {/* Question Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Question Type
                  </label>
                  <select
                    value={formData.questionType}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        questionType: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="mcq">Multiple Choice</option>
                    <option value="true_false">True/False</option>
                    <option value="short_answer">Short Answer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Difficulty
                  </label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        difficulty: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              {/* Options (MCQ only) */}
              {formData.questionType === 'mcq' && (
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-3">
                    Answer Options *
                  </label>
                  <div className="space-y-2">
                    {formData.options.map((option, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="radio"
                          name="correctAnswer"
                          value={idx.toString()}
                          checked={formData.correctAnswer === idx.toString()}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              correctAnswer: e.target.value,
                            }))
                          }
                          className="mt-3"
                        />
                        <Input
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...formData.options]
                            newOptions[idx] = e.target.value
                            setFormData((prev) => ({
                              ...prev,
                              options: newOptions,
                            }))
                          }}
                          placeholder={`Option ${idx + 1}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Settings */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Time Limit (seconds)
                  </label>
                  <Input
                    type="number"
                    value={formData.timeLimit}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        timeLimit: parseInt(e.target.value),
                      }))
                    }
                    min="5"
                    max="300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Points
                  </label>
                  <Input
                    type="number"
                    value={formData.points}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        points: parseInt(e.target.value),
                      }))
                    }
                    min="10"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddQuestion(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Add Question
                </Button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}
