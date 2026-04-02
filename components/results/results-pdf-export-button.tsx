'use client'

import { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { FileText } from 'lucide-react'

type SessionRow = { id: string }
type ParticipantRow = { id: string; nickname: string; score: number | null }
type AnswerRow = { participant_id: string; is_correct: boolean | null }

type ResultsPayload = {
  session: SessionRow
  participants: ParticipantRow[]
  answers: AnswerRow[]
}

export function ResultsPdfExportButton({ results }: { results: ResultsPayload }) {
  const exportAsPDF = useCallback(async () => {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()

    doc.setFontSize(20)
    doc.text('Résultats — SCITI-Quiz', 20, 20)
    doc.setFontSize(12)
    doc.text(`Session : ${results.session.id}`, 20, 35)
    doc.text(`Date : ${new Date().toLocaleDateString('fr-FR')}`, 20, 45)

    let y = 65
    doc.setFontSize(14)
    doc.text('Classement final', 20, y)
    y += 10

    results.participants.forEach((p, idx) => {
      const participantAnswers = results.answers.filter((a) => a.participant_id === p.id)
      const correct = participantAnswers.filter((a) => a.is_correct).length
      const accuracy =
        participantAnswers.length > 0
          ? Math.round((correct / participantAnswers.length) * 100)
          : 0

      doc.setFontSize(11)
      doc.text(
        `${idx + 1}. ${p.nickname} — ${p.score ?? 0} pts — Précision : ${accuracy}%`,
        20,
        y,
      )
      y += 8
      if (y > 270) {
        doc.addPage()
        y = 20
      }
    })

    doc.save(`resultats-quiz-${results.session.id}.pdf`)
  }, [results])

  return (
    <Button variant="outline" size="sm" className="gap-2" onClick={() => void exportAsPDF()}>
      <FileText className="h-4 w-4" /> Exporter PDF
    </Button>
  )
}
