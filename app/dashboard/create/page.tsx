import { CreateQuizForm } from './create-quiz-form'
import { getQuizCreationShortcuts } from '@/app/actions/quiz-shortcuts'

export default async function CreateQuizPage() {
  const { themes, levels } = await getQuizCreationShortcuts()
  return (
    <CreateQuizForm initialThemeChips={themes} initialLevelChips={levels} />
  )
}
