import { getQuizzes } from '@/app/actions/quiz'
import { TeacherComfortZone } from '@/components/dashboard/teacher-comfort-zone'
import { TeacherQuizGrid } from '@/components/dashboard/teacher-quiz-grid'

type QuizRowWithCount = {
  id: string
  title: string
  description: string | null
  level: string | null
  theme: string | null
  questions?: { count: number }[] | null
}

export async function DashboardQuizGridSection() {
  const quizzes = await getQuizzes()

  const rows = (quizzes ?? []).map((q) => {
    const row = q as QuizRowWithCount
    const count = row.questions?.[0]?.count
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      level: row.level,
      theme: row.theme,
      questionCount: typeof count === 'number' ? count : 0,
    }
  })

  return (
    <>
      <TeacherComfortZone quizCount={rows.length} />
      <TeacherQuizGrid quizzes={rows} />
    </>
  )
}
