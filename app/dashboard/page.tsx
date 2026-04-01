import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus, Play, Settings, Trash2, BarChart3, LogOut } from 'lucide-react'
import { getQuizzes } from '@/app/actions/quiz'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const quizzes = await getQuizzes()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border sticky top-0 z-40 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-foreground rounded-md flex items-center justify-center">
              <span className="text-background font-bold text-sm">Q</span>
            </div>
            <span className="text-lg font-semibold">QuizLive</span>
          </div>
          
          <div className="flex items-center gap-4">
            <ThemeSwitcher />
            <span className="text-sm text-muted-foreground hidden sm:block">{user.email}</span>
            <form action="/api/auth/signout" method="post">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-2">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Déconnexion</span>
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Page Header */}
      <div className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Mes Quiz</h1>
              <p className="text-muted-foreground mt-1">Créez, gérez et lancez vos quiz interactifs</p>
            </div>
            <Link href="/dashboard/create">
              <Button className="bg-foreground text-background hover:bg-foreground/90 gap-2">
                <Plus className="w-4 h-4" /> Créer un quiz
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        {quizzes.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-secondary/20 rounded-xl flex items-center justify-center mx-auto mb-6">
              <BarChart3 className="w-8 h-8 text-secondary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Aucun quiz pour le moment</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Créez votre premier quiz interactif pour commencer à engager vos étudiants
            </p>
            <Link href="/dashboard/create">
              <Button className="bg-foreground text-background hover:bg-foreground/90 gap-2">
                <Plus className="w-4 h-4" /> Créer mon premier quiz
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="bg-card border border-border rounded-xl overflow-hidden hover:border-secondary/50 transition-all group"
              >
                <div className="bg-gradient-to-br from-secondary/20 to-accent/10 h-20 flex items-center justify-center">
                  <div className="w-10 h-10 bg-secondary/30 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-secondary" />
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-2 line-clamp-1">
                    {quiz.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {quiz.description || 'Aucune description'}
                  </p>

                  <div className="flex gap-2 mb-4 text-xs">
                    {quiz.level && (
                      <span className="px-2.5 py-1 bg-secondary/15 text-secondary rounded-full">
                        {quiz.level}
                      </span>
                    )}
                    {quiz.theme && (
                      <span className="px-2.5 py-1 bg-accent/15 text-accent rounded-full">
                        {quiz.theme}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/dashboard/quiz/${quiz.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full gap-2 border-border hover:bg-muted">
                        <Settings className="w-4 h-4" /> Modifier
                      </Button>
                    </Link>
                    <Link href={`/dashboard/launch/${quiz.id}`} className="flex-1">
                      <Button size="sm" className="w-full bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
                        <Play className="w-4 h-4" /> Lancer
                      </Button>
                    </Link>
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
