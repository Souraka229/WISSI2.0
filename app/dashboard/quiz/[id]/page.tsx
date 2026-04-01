'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getQuiz, createQuestion } from '@/app/actions/quiz'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, ArrowLeft, Loader2 } from 'lucide-react'
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
