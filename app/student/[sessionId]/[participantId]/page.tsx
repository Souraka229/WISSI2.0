'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { submitAnswer, addReaction } from '@/app/actions/quiz'
import { Button } from '@/components/ui/button'
import { Loader2, Smile, ThumbsUp, Zap } from 'lucide-react'

export default function StudentPlayerPage() {
  const params = useParams()
  const sessionId = params.sessionId as string
  const participantId = params.participantId as string

  const [session, setSession] = useState<any>(null)
  const [quiz, setQuiz] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [answered, setAnswered] = useState(false)
  const [timeLeft, setTimeLeft] = useState(30)
  const [reactions, setReactions] = useState<string[]>(['😂', '🔥', '👏', '🎉'])

  const supabase = createClient()

  useEffect(() => {
    const loadData = async () => {
      try {
        // Get session
        const { data: sessionData } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .single()

        setSession(sessionData)

        // Get quiz
        const { data: quizData } = await supabase
          .from('quizzes')
          .select('*')
          .eq('id', sessionData.quiz_id)
          .single()

        setQuiz(quizData)

        // Get questions
        const { data: questionsData } = await supabase
          .from('questions')
          .select('*')
          .eq('quiz_id', sessionData.quiz_id)
          .order('order_index')

        setQuestions(questionsData || [])
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [sessionId, supabase])

  // Timer effect
  useEffect(() => {
    if (answered || !session || timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(timer)
  }, [answered, session, timeLeft])

  // Auto submit when time runs out
  useEffect(() => {
    if (timeLeft === 0 && !answered && questions.length > 0) {
      handleSubmitAnswer()
    }
  }, [timeLeft, answered, questions])

  const currentQuestion = questions[currentQuestionIndex]

  const handleSubmitAnswer = async () => {
    if (!currentQuestion || answered) return

    setAnswered(true)

    try {
      const isCorrect =
        selectedAnswer === currentQuestion.correct_answer ||
        (selectedAnswer === null && currentQuestion.correct_answer === 'timeout')

      await submitAnswer(
        participantId,
        sessionId,
        currentQuestion.id,
        selectedAnswer || 'timeout',
        isCorrect,
        currentQuestion.time_limit - timeLeft
      )
    } catch (error) {
      console.error('Error submitting answer:', error)
    }
  }

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setSelectedAnswer(null)
      setAnswered(false)
      setTimeLeft(questions[currentQuestionIndex + 1]?.time_limit || 30)
    }
  }

  const handleReaction = async (emoji: string) => {
    try {
      await addReaction(sessionId, participantId, emoji)
    } catch (error) {
      console.error('Error adding reaction:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Quiz Finished!</h2>
          <p className="text-muted-foreground">Waiting for results...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Question {currentQuestionIndex + 1} of {questions.length}</p>
            <div className="w-64 h-2 bg-muted rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{
                  width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
                }}
              />
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-foreground">{timeLeft}s</p>
            <p className="text-xs text-muted-foreground">Time Left</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-card border border-border rounded-2xl p-12">
          {/* Question */}
          <h2 className="text-3xl font-bold text-foreground mb-8 text-balance">
            {currentQuestion.question_text}
          </h2>

          {/* Options */}
          {currentQuestion.question_type === 'mcq' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
              {currentQuestion.options?.map((option: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => !answered && setSelectedAnswer(idx.toString())}
                  disabled={answered}
                  className={`p-6 rounded-lg border-2 text-left font-semibold transition-all ${
                    selectedAnswer === idx.toString()
                      ? 'border-primary bg-primary/15 text-foreground'
                      : answered
                      ? 'border-border bg-card text-muted-foreground cursor-default'
                      : 'border-border bg-card text-foreground hover:border-primary/50 hover:bg-card/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        selectedAnswer === idx.toString()
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border'
                      }`}
                    >
                      {selectedAnswer === idx.toString() && '✓'}
                    </div>
                    {option}
                  </div>
                </button>
              ))}
            </div>
          )}

          {currentQuestion.question_type === 'true_false' && (
            <div className="grid grid-cols-2 gap-4 mb-12">
              {['True', 'False'].map((value, idx) => (
                <button
                  key={idx}
                  onClick={() => !answered && setSelectedAnswer(idx.toString())}
                  disabled={answered}
                  className={`p-6 rounded-lg border-2 text-center font-semibold transition-all text-lg ${
                    selectedAnswer === idx.toString()
                      ? 'border-primary bg-primary/15 text-foreground'
                      : answered
                      ? 'border-border bg-card text-muted-foreground cursor-default'
                      : 'border-border bg-card text-foreground hover:border-primary/50 hover:bg-card/50'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          )}

          {/* Reaction Buttons */}
          {!answered && (
            <div className="flex gap-2 mb-8 justify-center">
              {reactions.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className="text-2xl hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-4">
            {!answered ? (
              <Button
                onClick={handleSubmitAnswer}
                disabled={selectedAnswer === null}
                size="lg"
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
              >
                <Zap className="w-5 h-5" /> Submit Answer
              </Button>
            ) : currentQuestionIndex < questions.length - 1 ? (
              <Button
                onClick={handleNextQuestion}
                size="lg"
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
              >
                Next Question
              </Button>
            ) : (
              <Button
                size="lg"
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
              >
                See Results
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
