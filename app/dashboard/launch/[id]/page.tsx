'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getQuiz, startSession } from '@/app/actions/quiz'
import { Button } from '@/components/ui/button'
import { Copy, Play, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function LaunchPage() {
  const params = useParams()
  const quizId = params.id as string
  const [quiz, setQuiz] = useState<any>(null)
  const [session, setSession] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLaunching, setIsLaunching] = useState(false)
  const [copied, setCopied] = useState(false)

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

  const handleLaunchSession = async () => {
    if (!quiz) return

    setIsLaunching(true)
    try {
      const newSession = await startSession(quizId)
      setSession(newSession[0])
    } catch (error) {
      console.error('Error starting session:', error)
      alert('Failed to start session')
    } finally {
      setIsLaunching(false)
    }
  }

  const copyToClipboard = () => {
    if (session?.pin_code) {
      navigator.clipboard.writeText(session.pin_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Launch Session</h1>
          </div>
        </div>
      </div>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          {!session ? (
            <div className="bg-card border border-border rounded-2xl p-12 text-center">
              <div className="w-20 h-20 bg-primary/15 rounded-full flex items-center justify-center mx-auto mb-8">
                <Play className="w-10 h-10 text-primary" />
              </div>

              <h2 className="text-3xl font-bold text-foreground mb-4">Ready to Launch?</h2>

              <div className="bg-muted/50 rounded-lg p-8 mb-8 text-left">
                <h3 className="font-semibold text-foreground mb-4">Quiz Details</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Title:</span>
                    <span className="font-medium text-foreground">{quiz.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Questions:</span>
                    <span className="font-medium text-foreground">
                      {quiz.questions?.length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Level:</span>
                    <span className="font-medium text-foreground capitalize">{quiz.level}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Theme:</span>
                    <span className="font-medium text-foreground capitalize">{quiz.theme}</span>
                  </div>
                </div>
              </div>

              <p className="text-muted-foreground mb-8">
                Students will join using a PIN code. You&apos;ll be able to control the quiz flow in
                real-time.
              </p>

              <Button
                onClick={handleLaunchSession}
                disabled={isLaunching || !quiz.questions?.length}
                size="lg"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
              >
                {isLaunching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Launching...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" /> Launch Session
                  </>
                )}
              </Button>

              {!quiz.questions?.length && (
                <p className="text-sm text-destructive mt-4">
                  Add questions to your quiz before launching
                </p>
              )}
            </div>
          ) : (
            <div className="bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/40 rounded-2xl p-12 text-center">
              <div className="w-20 h-20 bg-primary/30 rounded-full flex items-center justify-center mx-auto mb-8">
                <span className="text-4xl">✨</span>
              </div>

              <h2 className="text-3xl font-bold text-foreground mb-2">Session Live!</h2>
              <p className="text-muted-foreground mb-12">
                Share this PIN code with your students
              </p>

              <div className="bg-card border-2 border-primary/40 rounded-xl p-8 mb-8">
                <p className="text-sm text-muted-foreground mb-3 font-semibold uppercase tracking-wider">
                  PIN Code
                </p>
                <p className="text-6xl font-black text-primary tracking-wider mb-4">
                  {session.pin_code}
                </p>
                <button
                  onClick={copyToClipboard}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary/15 hover:bg-primary/25 text-primary rounded-lg transition-colors font-semibold text-sm"
                >
                  <Copy className="w-4 h-4" />
                  {copied ? 'Copied!' : 'Copy PIN'}
                </button>
              </div>

              <div className="space-y-3 text-sm mb-8">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <span>📱 Ask students to visit</span>
                  <span className="font-mono bg-muted px-2 py-1 rounded text-foreground">
                    quizlive.app/join
                  </span>
                </div>
                <div className="text-muted-foreground">
                  or share via <span className="font-semibold text-foreground">WhatsApp</span>
                </div>
              </div>

              <div className="space-y-3">
                <Button size="lg" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                  <Play className="w-4 h-4" /> Go to Host View
                </Button>
                <Button variant="outline" size="lg" className="w-full">
                  End Session
                </Button>
              </div>

              <p className="text-xs text-muted-foreground mt-8">
                Waiting for students to join...
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
