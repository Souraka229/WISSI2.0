'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

function JoinForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState<'pin' | 'nickname'>('pin')
  const [pinCode, setPinCode] = useState('')
  const [nickname, setNickname] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [fromScan, setFromScan] = useState(false)
  const autoCheckRef = useRef<string | null>(null)

  function normalizePinFromSearch(raw: string | null) {
    return (raw?.trim() ?? '').replace(/\D/g, '').slice(0, 6)
  }

  useEffect(() => {
    const pin = normalizePinFromSearch(searchParams.get('pin'))
    if (pin) setPinCode(pin)
  }, [searchParams])

  /** Après scan du QR : le PIN est dans l’URL → on vérifie tout de suite, il ne reste que le pseudo. */
  useEffect(() => {
    const pin = normalizePinFromSearch(searchParams.get('pin'))
    if (!pin || pin.length < 4) return
    if (autoCheckRef.current === pin) return
    autoCheckRef.current = pin

    let cancelled = false
    ;(async () => {
      setIsLoading(true)
      setError('')
      setFromScan(true)
      try {
        const supabase = createClient()
        const { data, error: queryError } = await supabase
          .from('sessions')
          .select('id,status')
          .eq('pin_code', pin)
          .single()

        if (cancelled) return
        if (queryError || !data) {
          setError('Code invalide ou lien incorrect.')
          setStep('pin')
          autoCheckRef.current = null
          return
        }
        if (data.status === 'finished') {
          setError('Cette session est déjà terminée.')
          setStep('pin')
          autoCheckRef.current = null
          return
        }
        setStep('nickname')
      } catch {
        if (!cancelled) {
          setError('Impossible de vérifier le code. Réessayez.')
          setStep('pin')
          autoCheckRef.current = null
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [searchParams])

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const { data, error: queryError } = await supabase
        .from('sessions')
        .select('*')
        .eq('pin_code', pinCode.trim())
        .single()

      if (queryError || !data) {
        setError('Code PIN invalide. Vérifiez et réessayez.')
        setIsLoading(false)
        return
      }

      if (data.status === 'finished') {
        setError('Cette session est déjà terminée.')
        setIsLoading(false)
        return
      }

      setStep('nickname')
    } catch (err) {
      console.error('Error:', err)
      setError('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleNicknameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nickname.trim()) return

    setIsLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const { data: session } = await supabase
        .from('sessions')
        .select('*')
        .eq('pin_code', pinCode.trim())
        .single()

      if (!session) {
        setError('Session introuvable. Veuillez réessayer.')
        setIsLoading(false)
        return
      }

      const { data: participant, error: participantError } = await supabase
        .from('participants')
        .insert({
          session_id: session.id,
          nickname: nickname.trim(),
          avatar: `https://avatar.vercel.sh/${nickname.trim()}`,
        })
        .select()
        .single()

      if (participantError) throw participantError

      router.push(`/student/${session.id}/${participant.id}`)
    } catch (err) {
      console.error('Error:', err)
      setError('Impossible de rejoindre la session. Veuillez réessayer.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {step === 'pin' ? (
        <form onSubmit={handlePinSubmit}>
          <h1 className="text-3xl font-bold mb-2">Rejoindre un quiz</h1>
          <p className="text-muted-foreground mb-8">
            Code PIN affiché ou scanné depuis le QR code du professeur
          </p>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Code PIN</label>
            <Input
              type="text"
              value={pinCode}
              onChange={(e) =>
                setPinCode(e.target.value.replace(/\D/g, '').slice(0, 6))
              }
              placeholder="123456"
              maxLength={6}
              inputMode="numeric"
              pattern="[0-9]*"
              disabled={isLoading}
              className="text-center text-2xl font-bold tracking-widest bg-input border-border h-14"
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-destructive/15 border border-destructive/40 text-destructive text-sm p-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={!pinCode || isLoading}
            className="w-full bg-foreground text-background hover:bg-foreground/90 h-11"
          >
            {isLoading ? 'Vérification...' : 'Continuer'}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleNicknameSubmit}>
          {fromScan && (
            <div className="mb-4 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-center text-sm text-foreground">
              QR scanné · session trouvée
            </div>
          )}
          <h1 className="text-3xl font-bold mb-2">Votre pseudo</h1>
          <p className="text-muted-foreground mb-6">
            C&apos;est ainsi que vous apparaîtrez dans le classement. Le code est déjà
            renseigné.
          </p>
          <div className="mb-6 rounded-lg border border-border bg-muted/50 px-3 py-2 text-center">
            <span className="text-xs text-muted-foreground">Code PIN</span>
            <p className="font-mono text-xl font-bold tracking-widest">{pinCode}</p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Pseudo</label>
            <Input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Ex: Marie D."
              disabled={isLoading}
              className="bg-input border-border h-11"
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-destructive/15 border border-destructive/40 text-destructive text-sm p-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-border h-11"
              onClick={() => {
                setStep('pin')
                setError('')
                setFromScan(false)
                autoCheckRef.current = null
              }}
              disabled={isLoading}
            >
              Changer de code
            </Button>
            <Button
              type="submit"
              disabled={!nickname || isLoading}
              className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 h-11"
            >
              {isLoading ? 'Connexion...' : 'Rejoindre'}
            </Button>
          </div>
        </form>
      )}

      <p className="text-center text-sm text-muted-foreground mt-8">
        Pas de code ? Demandez-le à votre enseignant.
      </p>
    </>
  )
}

function LoadingFallback() {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      <p className="text-muted-foreground">Chargement...</p>
    </div>
  )
}

export default function JoinPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Back Link */}
      <div className="p-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Retour à l&apos;accueil
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-8 h-8 bg-foreground rounded-md flex items-center justify-center">
              <span className="text-background font-bold text-sm">Q</span>
            </div>
            <span className="text-lg font-semibold">SCITI-Quiz</span>
          </div>

          <Suspense fallback={<LoadingFallback />}>
            <JoinForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
