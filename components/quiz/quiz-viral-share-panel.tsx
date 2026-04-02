'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Copy, MessageCircle, Share2, Sparkles, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  quizId: string
  quizTitle: string
  isPublic: boolean
  questionCount: number
}

async function copyText(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.setAttribute('readonly', '')
  ta.style.position = 'fixed'
  ta.style.left = '-9999px'
  document.body.appendChild(ta)
  ta.select()
  const ok = document.execCommand('copy')
  document.body.removeChild(ta)
  if (!ok) throw new Error('copy failed')
}

/** Panneau partage : lien /q/[id], WhatsApp, texte prêt à coller. */
export function QuizViralSharePanel({ quizId, quizTitle, isPublic, questionCount }: Props) {
  const [copied, setCopied] = useState<'link' | 'text' | null>(null)

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const sharePath = `/q/${quizId}`
  const fullUrl = origin ? `${origin}${sharePath}` : sharePath

  const shareBlurb = useMemo(() => {
    const lines = [
      `🎯 Quiz sur SCITI-Quiz : « ${quizTitle} »`,
      questionCount > 0 ? `📚 ${questionCount} question${questionCount > 1 ? 's' : ''}` : '',
      `🔗 ${fullUrl}`,
      '',
      'Rejoins une session live avec le code PIN donné par ton prof sur :',
      origin ? `${origin}/join` : '/join',
    ]
    return lines.filter(Boolean).join('\n')
  }, [quizTitle, questionCount, fullUrl, origin])

  const whatsappHref = useMemo(() => {
    const text = encodeURIComponent(shareBlurb)
    return `https://wa.me/?text=${text}`
  }, [shareBlurb])

  const onCopyLink = useCallback(async () => {
    try {
      await copyText(fullUrl)
      setCopied('link')
      window.setTimeout(() => setCopied(null), 2000)
    } catch {
      setCopied(null)
    }
  }, [fullUrl])

  const onCopyText = useCallback(async () => {
    try {
      await copyText(shareBlurb)
      setCopied('text')
      window.setTimeout(() => setCopied(null), 2000)
    } catch {
      setCopied(null)
    }
  }, [shareBlurb])

  if (!isPublic) {
    return (
      <section
        className="mb-10 rounded-2xl border border-amber-500/35 bg-gradient-to-br from-amber-500/[0.08] to-orange-500/[0.06] p-6 shadow-sm"
        aria-labelledby="viral-locked-title"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-800 dark:text-amber-200">
            <Share2 className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 id="viral-locked-title" className="text-lg font-black tracking-tight text-foreground">
              Effet viralité — lien de partage
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Activez <strong>Quiz public</strong> dans la barre ci-dessus pour obtenir une{' '}
              <strong>page web partageable</strong> (aperçu + message WhatsApp prêt à l’emploi). Tant que le quiz
              reste privé, seul vous le voyez dans le tableau de bord.
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section
      className="mb-10 overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.10] via-violet-500/[0.06] to-fuchsia-500/[0.08] p-6 shadow-md"
      aria-labelledby="viral-share-title"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
          <h2 id="viral-share-title" className="text-lg font-black tracking-tight text-foreground">
            Effet viralité
          </h2>
        </div>
        <p className="text-xs font-medium text-muted-foreground sm:text-right">
          Page publique d’aperçu — les questions ne sont pas visibles avant une session.
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-xl border border-border/80 bg-background/85 p-4 backdrop-blur-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lien à partager</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <code className="min-w-0 flex-1 truncate rounded-lg border border-border bg-muted/40 px-3 py-2 font-mono text-xs text-foreground">
            {fullUrl}
          </code>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="shrink-0 gap-2 font-semibold"
            onClick={() => void onCopyLink()}
          >
            {copied === 'link' ? (
              <Check className="h-4 w-4 text-emerald-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied === 'link' ? 'Copié' : 'Copier le lien'}
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" size="sm" className="gap-2 bg-[#25D366] font-bold text-white hover:bg-[#20bd5a]" asChild>
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </a>
        </Button>
        <Button type="button" variant="outline" size="sm" className="gap-2 font-semibold" onClick={() => void onCopyText()}>
          {copied === 'text' ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
          {copied === 'text' ? 'Message copié' : 'Copier le message complet'}
        </Button>
        <Button type="button" variant="outline" size="sm" className="gap-2 font-semibold" asChild>
          <Link href={sharePath} target="_blank" rel="noopener noreferrer">
            <Share2 className="h-4 w-4" />
            Voir la page publique
          </Link>
        </Button>
      </div>
    </section>
  )
}
