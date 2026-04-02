/** Texte à coller dans ChatGPT (ou autre chat) — aucune clé API serveur requise. */
export function buildSuperPromptForExternalChat(params: {
  quizTitle: string
  quizTheme: string | null | undefined
  notes: string
  questionCount: number
}): string {
  const { quizTitle, quizTheme, notes, questionCount } = params
  const theme = quizTheme?.trim() || 'général'
  const raw = Math.floor(Number(questionCount))
  const n = Number.isFinite(raw) && raw >= 1 ? raw : 1

  return `Tu es un expert pédagogique. Réponds UNIQUEMENT avec un objet JSON valide : pas de texte avant ou après, pas de bloc markdown \`\`\`, uniquement le JSON.

Format exact attendu :
{"questions":[{"question_text":"...","options":["réponse A","réponse B","réponse C","réponse D"],"correct_index":0,"explanation":"brève explication"}]}

Règles :
- "correct_index" : entier à partir de 0 = index de la bonne réponse dans "options".
- Chaque question : exactement 4 options (QCM).
- Langue : français.
- Génère exactement ${n} questions, variées et claires.

Contexte du quiz :
- Titre : « ${quizTitle.replace(/"/g, "'")} »
- Thème : « ${theme.replace(/"/g, "'")} »

Notes / sujet à couvrir (ce qui m’intéresse pour le quiz) :
---
${notes.trim()}
---

Réponds uniquement avec le JSON, ${n} questions.`
}
