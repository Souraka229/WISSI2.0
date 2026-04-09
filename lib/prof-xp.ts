export type ProfGrade =
  | 'Enseignant Débutant'
  | 'Animateur Actif'
  | 'Maître de Salle'
  | 'Architecte de Savoirs'
  | 'Légende SCITI'
  | 'DIEU DE LA SALLE'

export function modeXpBonus(mode: string | null | undefined): number {
  if (mode === 'prof_dual') return 120
  if (mode === 'hackathon') return 180
  return 50
}

export function computeSessionXp(input: {
  connected: number
  answers: number
  correctRatePercent: number
  mode: string | null | undefined
  sessionStreakBonus?: number
}): number {
  const connected = Math.max(1, input.connected)
  const engagement = (input.answers / connected) * 10
  const quality = (input.correctRatePercent / 100) * 5
  const streakBonus = Math.max(0, input.sessionStreakBonus ?? 0)
  return Math.round(engagement + quality + streakBonus + modeXpBonus(input.mode))
}

export function gradeFromXp(totalXp: number): ProfGrade {
  if (totalXp >= 10000) return 'DIEU DE LA SALLE'
  if (totalXp >= 6000) return 'Légende SCITI'
  if (totalXp >= 3000) return 'Architecte de Savoirs'
  if (totalXp >= 1500) return 'Maître de Salle'
  if (totalXp >= 500) return 'Animateur Actif'
  return 'Enseignant Débutant'
}
