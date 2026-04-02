'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  createQuestion,
  deleteQuestion,
  getQuiz,
  updateQuestion,
  updateQuizIsPublic,
} from '@/app/actions/quiz'
import {
  generateQuestionsWithSuperPrompt,
  importQuestionsFromChatGptJson,
} from '@/app/actions/superprompt'
import { buildSuperPromptForExternalChat } from '@/lib/superprompt-template'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Plus,
  ArrowLeft,
  Loader2,
  Sparkles,
  Copy,
  ClipboardPaste,
  Play,
  HelpCircle,
  Pencil,
  Trash2,
  Globe2,
  Lock,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { QuizViralSharePanel } from '@/components/quiz/quiz-viral-share-panel'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

/** Copie avec API Clipboard ; repli textarea + execCommand si navigateur / contexte HTTP bloque. */
async function copyTextToClipboard(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {
      /* repli */
    }
  }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.setAttribute('readonly', '')
  ta.style.position = 'fixed'
  ta.style.left = '-9999px'
  ta.style.top = '0'
  document.body.appendChild(ta)
  ta.select()
  ta.setSelectionRange(0, text.length)
  const ok = document.execCommand('copy')
  document.body.removeChild(ta)
  if (!ok) {
    throw new Error('execCommand copy failed')
  }
}

function SuperPromptPreview({
  quiz,
  notes,
  questionCount,
}: {
  quiz: { title: string; theme?: string | null } | null
  notes: string
  questionCount: number
}) {
  if (!quiz) return null
  const text = buildSuperPromptForExternalChat({
    quizTitle: quiz.title ?? 'Quiz',
    quizTheme: quiz.theme,
    notes,
    questionCount,
  })
  return (
    <details className="mt-2 rounded-lg border border-border bg-muted/20 p-3">
      <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
        Aperçu du prompt (sélection + Ctrl+C si la copie automatique échoue)
      </summary>
      <textarea
        readOnly
        rows={10}
        value={text}
        className="mt-2 w-full rounded-md border border-border bg-background px-2 py-2 font-mono text-xs text-foreground"
        onFocus={(e) => e.currentTarget.select()}
      />
    </details>
  )
}

export default function QuizEditorPage() {
  const params = useParams()
  const router = useRouter()
  const quizId = params.id as string
  const [quiz, setQuiz] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showAddQuestion, setShowAddQuestion] = useState(false)
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)
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
  /** Saisie libre (pas de plafond) ; normalisée en entier ≥ 1 à l’envoi. */
  const [superQuestionCountStr, setSuperQuestionCountStr] = useState('5')
  const [superBusy, setSuperBusy] = useState(false)
  const [superError, setSuperError] = useState<string | null>(null)
  const [superSuccess, setSuperSuccess] = useState<string | null>(null)
  const [pastedChatGptJson, setPastedChatGptJson] = useState('')
  const [importBusy, setImportBusy] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [visibilityBusy, setVisibilityBusy] = useState(false)
  const [visibilityError, setVisibilityError] = useState<string | null>(null)

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
      const parsedCount = parseInt(superQuestionCountStr.trim(), 10)
      const countForApi = Number.isFinite(parsedCount) && parsedCount >= 1 ? parsedCount : 1
      const { created } = await generateQuestionsWithSuperPrompt(
        quizId,
        superPromptText,
        countForApi,
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
    if (!quiz) return
    setSuperError(null)
    let text: string
    try {
      const parsedCount = parseInt(superQuestionCountStr.trim(), 10)
      const countForPrompt = Number.isFinite(parsedCount) && parsedCount >= 1 ? parsedCount : 1
      text = buildSuperPromptForExternalChat({
        quizTitle: quiz.title ?? 'Quiz',
        quizTheme: quiz.theme,
        notes: superPromptText,
        questionCount: countForPrompt,
      })
    } catch {
      setSuperError('Impossible de construire le SuperPrompt.')
      return
    }
    try {
      await copyTextToClipboard(text)
      setCopyFeedback(true)
      window.setTimeout(() => setCopyFeedback(false), 2500)
    } catch {
      setSuperError(
        'Copie refusée par le navigateur. Utilisez HTTPS ou localhost, ou sélectionnez le texte affiché ci-dessous et copiez (Ctrl+C).',
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

  const resetQuestionForm = () => {
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
    setEditingQuestionId(null)
  }

  const openNewQuestion = () => {
    resetQuestionForm()
    setShowAddQuestion(true)
  }

  const openEditQuestion = (q: {
    id: string
    question_text: string
    question_type: string
    options?: unknown
    correct_answer?: string | number
    explanation?: string | null
    time_limit?: number | null
    points?: number | null
    difficulty?: string | null
  }) => {
    const rawOpts = Array.isArray(q.options) ? q.options.map((x) => String(x)) : []
    const padded = [...rawOpts]
    while (padded.length < 4) padded.push('')
    setFormData({
      questionText: q.question_text ?? '',
      questionType: q.question_type ?? 'mcq',
      options: padded.slice(0, 4),
      correctAnswer: String(q.correct_answer ?? '0'),
      explanation: q.explanation ?? '',
      timeLimit: typeof q.time_limit === 'number' ? q.time_limit : 30,
      points: typeof q.points === 'number' ? q.points : 100,
      difficulty: q.difficulty ?? 'medium',
    })
    setEditingQuestionId(q.id)
    setShowAddQuestion(true)
  }

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const optionsForDb =
        formData.questionType === 'mcq' ? formData.options.filter((o) => o.trim()) : []

      if (editingQuestionId) {
        await updateQuestion(
          editingQuestionId,
          quizId,
          formData.questionText,
          formData.questionType,
          optionsForDb,
          formData.correctAnswer,
          formData.explanation,
          formData.timeLimit,
          formData.points,
          formData.difficulty,
        )
      } else {
        await createQuestion(
          quizId,
          formData.questionText,
          formData.questionType,
          optionsForDb,
          formData.correctAnswer,
          formData.explanation,
          formData.timeLimit,
          formData.points,
          formData.difficulty,
          quiz.questions?.length ?? 0,
        )
      }

      const updatedQuiz = await getQuiz(quizId)
      setQuiz(updatedQuiz)
      setShowAddQuestion(false)
      resetQuestionForm()
      router.refresh()
    } catch (error) {
      console.error('Error saving question:', error)
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
          <h2 className="text-2xl font-bold text-foreground mb-4">Quiz introuvable</h2>
          <Link href="/dashboard">
            <Button>Retour au tableau de bord</Button>
          </Link>
        </div>
      </div>
    )
  }

  const questionCount = quiz.questions?.length ?? 0

  return (
    <div className="min-h-screen bg-background">
      {/* En-tête + barre visibilité (sticky, toujours visible) */}
      <div className="sticky top-0 z-40 border-b border-border bg-card/90 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold text-foreground">{quiz.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {questionCount} question{questionCount !== 1 ? 's' : ''}
                {questionCount === 0 && ' — ajoutez-en au moins une avant de lancer'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-2 font-semibold" asChild>
              <Link href="/aide">
                <HelpCircle className="h-4 w-4" />
                Aide prof
              </Link>
            </Button>
            <Button
              size="sm"
              className="gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 font-bold text-white shadow-md"
              asChild
            >
              <Link href={`/dashboard/launch/${quizId}`}>
                <Play className="h-4 w-4" />
                Lancer la session
              </Link>
            </Button>
          </div>
        </div>

        <div
          className={cn(
            'border-t',
            quiz.is_public
              ? 'border-emerald-500/30 bg-gradient-to-r from-emerald-500/[0.12] via-violet-500/[0.06] to-fuchsia-500/[0.08]'
              : 'border-border bg-muted/50',
          )}
          role="region"
          aria-label="Réglage de visibilité du quiz"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 sm:flex-row sm:items-center sm:justify-between lg:px-8">
            <div className="flex min-w-0 flex-1 gap-3 sm:gap-4">
              <div
                className={cn(
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-inner ring-2 ring-background',
                  quiz.is_public
                    ? 'bg-emerald-500/25 text-emerald-700 dark:text-emerald-300'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {quiz.is_public ? (
                  <Globe2 className="h-6 w-6" aria-hidden />
                ) : (
                  <Lock className="h-6 w-6" aria-hidden />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Visibilité
                </p>
                <p className="mt-0.5 text-base font-black text-foreground">
                  {quiz.is_public ? 'Quiz public' : 'Quiz privé'}
                </p>
                <p className="mt-1 max-w-xl text-sm leading-snug text-muted-foreground">
                  {quiz.is_public ? (
                    <>
                      Marqué comme <strong>partageable</strong> (catalogue communautaire / intégrations à venir).
                      Seul vous lancez les sessions ; les élèves rejoignent toujours avec le PIN.
                    </>
                  ) : (
                    <>
                      Visible <strong>uniquement pour vous</strong> dans le tableau de bord. Activez « public » pour
                      le préparer au partage large lorsque le catalogue sera disponible.
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
              <div className="flex items-center justify-between gap-4 rounded-xl border border-border/80 bg-background/80 px-4 py-3 shadow-sm sm:justify-end">
                <Label htmlFor="quiz-is-public" className="cursor-pointer text-sm font-semibold sm:order-2">
                  {quiz.is_public ? 'Mode public' : 'Mode privé'}
                </Label>
                <div className="flex items-center gap-2 sm:order-1">
                  <Switch
                    id="quiz-is-public"
                    checked={Boolean(quiz.is_public)}
                    disabled={visibilityBusy}
                    onCheckedChange={async (checked) => {
                      setVisibilityError(null)
                      setVisibilityBusy(true)
                      const prev = Boolean(quiz.is_public)
                      setQuiz((q) => (q ? { ...q, is_public: checked } : q))
                      try {
                        const res = await updateQuizIsPublic(quizId, checked)
                        if (!res.success) {
                          setQuiz((q) => (q ? { ...q, is_public: prev } : q))
                          setVisibilityError(res.error)
                        } else {
                          router.refresh()
                        }
                      } catch {
                        setQuiz((q) => (q ? { ...q, is_public: prev } : q))
                        setVisibilityError('Mise à jour impossible.')
                      } finally {
                        setVisibilityBusy(false)
                      }
                    }}
                  />
                  {visibilityBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
                  ) : null}
                </div>
              </div>
            </div>
          </div>
          {visibilityError ? (
            <div className="mx-auto max-w-7xl px-4 pb-3 sm:px-6 lg:px-8">
              <p className="text-sm text-destructive" role="alert">
                {visibilityError}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <QuizViralSharePanel
          quizId={quizId}
          quizTitle={quiz.title ?? 'Quiz'}
          isPublic={Boolean(quiz.is_public)}
          questionCount={questionCount}
        />

        {questionCount === 0 && (
          <div className="mb-10 rounded-2xl border-2 border-dashed border-violet-400/50 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/5 p-6">
            <h2 className="text-lg font-black text-foreground">Par où commencer ?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Le plus rapide : remplissez le cadre ci-dessous puis utilisez ChatGPT + import JSON, ou la
              génération automatique. Sinon, ajoutez une question à la main.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" className="font-semibold" asChild>
                <a href="#remplir-avec-ia">Remplir avec l’assistant (recommandé)</a>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="font-semibold"
                onClick={() => openNewQuestion()}
              >
                Saisir une question à la main
              </Button>
            </div>
          </div>
        )}

        {/* SuperPrompt — génération IA */}
        <section
          id="remplir-avec-ia"
          className="mb-10 scroll-mt-24 rounded-xl border border-secondary/30 bg-secondary/10 p-6"
        >
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
              <div className="min-w-[12rem]">
                <label className="mb-2 block text-sm font-medium text-foreground" htmlFor="super-question-count">
                  Nombre de questions
                </label>
                <Input
                  id="super-question-count"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={superQuestionCountStr}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '')
                    setSuperQuestionCountStr(v === '' ? '' : v)
                  }}
                  onBlur={() => {
                    const n = parseInt(superQuestionCountStr.trim(), 10)
                    setSuperQuestionCountStr(
                      Number.isFinite(n) && n >= 1 ? String(n) : '1',
                    )
                  }}
                  disabled={superBusy || importBusy}
                  className="max-w-[10rem]"
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Valeur libre (minimum 1). Les modèles IA peuvent parfois renvoyer un peu moins de questions
                  qu’annoncé si la réponse est très longue.
                </p>
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
                <li>
                  Cliquez sur « Copier le SuperPrompt pour ChatGPT » (actif dès que le quiz est chargé ;
                  des notes plus longues donnent de meilleurs résultats).
                </li>
                <li>Ouvrez ChatGPT et collez le texte dans une nouvelle conversation.</li>
                <li>Copiez toute la réponse JSON de ChatGPT (un objet qui commence par {'{'}"questions").</li>
                <li>Collez-la ci-dessous et cliquez sur « Importer les questions ».</li>
              </ol>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={importBusy}
                  onClick={() => void handleCopySuperPromptForChatGpt()}
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" />
                  {copyFeedback ? 'Copié dans le presse-papiers !' : 'Copier le SuperPrompt pour ChatGPT'}
                </Button>
              </div>
              <SuperPromptPreview
                quiz={quiz}
                notes={superPromptText}
                questionCount={
                  (() => {
                    const n = parseInt(superQuestionCountStr.trim(), 10)
                    return Number.isFinite(n) && n >= 1 ? n : 1
                  })()
                }
              />
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
                Au moins 20 caractères dans les notes ci-dessus.
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
        <div id="liste-questions" className="mb-8 scroll-mt-24">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-bold text-foreground">Questions du quiz</h2>
            <Button
              onClick={() => {
                if (showAddQuestion) {
                  setShowAddQuestion(false)
                  resetQuestionForm()
                } else {
                  openNewQuestion()
                }
              }}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />{' '}
              {showAddQuestion ? 'Fermer le formulaire' : 'Ajouter une question'}
            </Button>
          </div>

          {quiz.questions && quiz.questions.length > 0 ? (
            <div className="space-y-4">
              {quiz.questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="bg-card border border-border rounded-lg p-6 hover:border-primary/40 transition-colors"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold text-foreground">
                      {idx + 1}. {q.question_text}
                    </h3>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                      <span className="rounded-full bg-primary/15 px-2 py-1 text-xs text-primary">
                        {q.question_type}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        aria-label="Modifier la question"
                        onClick={() => openEditQuestion(q)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            aria-label="Supprimer la question"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer cette question ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action est irréversible. La question sera retirée du quiz.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={async () => {
                                try {
                                  await deleteQuestion(q.id, quizId)
                                  const updatedQuiz = await getQuiz(quizId)
                                  setQuiz(updatedQuiz)
                                  router.refresh()
                                } catch (err) {
                                  console.error(err)
                                }
                              }}
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>Temps : {q.time_limit}s</span>
                    <span>•</span>
                    <span>Points : {q.points}</span>
                    <span>•</span>
                    <span>Difficulté : {q.difficulty}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card py-12 text-center">
              <p className="text-muted-foreground">
                Aucune question pour l’instant — utilisez l’assistant plus haut ou le bouton « Ajouter une
                question ».
              </p>
            </div>
          )}
        </div>

        {/* Add Question Form */}
        {showAddQuestion && (
          <div className="bg-card border border-border rounded-xl p-8 mb-8">
            <h3 className="mb-6 text-lg font-bold text-foreground">
              {editingQuestionId ? 'Modifier la question' : 'Nouvelle question'}
            </h3>
            <form onSubmit={handleQuestionSubmit} className="space-y-6">
              {/* Question Text */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">
                  Intitulé de la question *
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
                  placeholder="Ex. : Quelle est la capitale de la France ?"
                />
              </div>

              {/* Question Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-foreground">
                    Type de question
                  </label>
                  <select
                    value={formData.questionType}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        questionType: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="mcq">QCM (choix multiples)</option>
                    <option value="true_false">Vrai / Faux</option>
                    <option value="short_answer">Réponse courte</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-foreground">
                    Difficulté
                  </label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        difficulty: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="easy">Facile</option>
                    <option value="medium">Moyen</option>
                    <option value="hard">Difficile</option>
                  </select>
                </div>
              </div>

              {/* Options (MCQ only) */}
              {formData.questionType === 'mcq' && (
                <div>
                  <label className="mb-3 block text-sm font-semibold text-foreground">
                    Réponses (cochez la bonne) *
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
                  <label className="mb-2 block text-sm font-semibold text-foreground">
                    Temps limite (secondes)
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
                  onClick={() => {
                    setShowAddQuestion(false)
                    resetQuestionForm()
                  }}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {editingQuestionId ? 'Enregistrer les modifications' : 'Enregistrer la question'}
                </Button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}
