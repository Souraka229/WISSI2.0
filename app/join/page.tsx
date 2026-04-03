'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  formatSupabaseBrowserRequestError,
  isTransientSupabaseNetworkError,
} from '@/lib/supabase/format-browser-request-error'
import Link from 'next/link'

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

/** Une seconde tentative après une erreur réseau évite les faux « serveur injoignable ». */
async function sessionsByPinMaybe(
  pin: string,
  selectColumns: string,
) {
  const supabase = createClient()
  const run = () =>
    supabase
      .from('sessions')
      .select(selectColumns)
      .eq('pin_code', pin)
      .maybeSingle()

  let result = await run()
  if (result.error && isTransientSupabaseNetworkError(result.error)) {
    await sleep(700)
    result = await run()
  }
  return result
}

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

  /** PIN session : 6 chiffres (cf. startSession). */
  function normalizePin(raw: string | null | undefined) {
    return (raw?.trim() ?? '').replace(/\D/g, '').slice(0, 6)
  }

  const PIN_LENGTH = 6

  useEffect(() => {
    const pin = normalizePin(searchParams.get('pin'))
    if (pin) setPinCode(pin)
  }, [searchParams])

  /** Après scan du QR : le PIN est dans l’URL → on vérifie tout de suite, il ne reste que le pseudo. */
  useEffect(() => {
    const pin = normalizePin(searchParams.get('pin'))
    // N’auto-vérifier qu’avec un PIN complet (6 chiffres), sinon faux négatifs / requêtes inutiles.
    if (!pin || pin.length !== PIN_LENGTH) return
    if (autoCheckRef.current === pin) return
    autoCheckRef.current = pin

    let cancelled = false
    ;(async () => {
      setIsLoading(true)
      setError('')
      setFromScan(true)
      try {
        const { data, error: queryError } = await sessionsByPinMaybe(
          pin,
          'id,status',
        )

        if (cancelled) return
        if (queryError) {
          console.error('[join] lookup session', queryError)
          setError(formatSupabaseBrowserRequestError(queryError))
          setStep('pin')
          autoCheckRef.current = null
          return
        }
        if (!data) {
          setError(
            'Code invalide ou lien incorrect. Vérifiez le PIN, ou ouvrez le lien sur le même site que l’animateur (scan du QR sur place).',
          )
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
      } catch (e) {
        if (!cancelled) {
          console.error('[join] verify', e)
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
    const pin = normalizePin(pinCode)
    if (pin.length !== PIN_LENGTH) {
      setError(`Le code PIN doit comporter ${PIN_LENGTH} chiffres.`)
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const { data, error: queryError } = await sessionsByPinMaybe(pin, '*')

      if (queryError) {
        console.error('[join] pin submit', queryError)
        setError(formatSupabaseBrowserRequestError(queryError))
        return
      }

      if (!data) {
        setError(
          'Code PIN introuvable. Si vous avez scanné un QR code, assurez-vous d’être sur le même site que votre enseignant.',
        )
        return
      }

      if (data.status === 'finished') {
        setError('Cette session est déjà terminée.')
        return
      }

      setPinCode(pin)
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
      const pin = normalizePin(pinCode)
      if (pin.length !== PIN_LENGTH) {
        setError(`Code PIN incomplet (${PIN_LENGTH} chiffres requis).`)
        setIsLoading(false)
        return
      }

      const { data: session, error: sessionErr } = await sessionsByPinMaybe(
        pin,
        '*',
      )

      if (sessionErr) {
        console.error('[join] nickname session', sessionErr)
        setError(formatSupabaseBrowserRequestError(sessionErr))
        setIsLoading(false)
        return
      }

      if (!session) {
        setError('Session introuvable. Retournez à l’étape précédente et vérifiez le code.')
        setIsLoading(false)
        return
      }

      const supabase = createClient()
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
          <h1 className="text-3xl font-black mb-2">Rejoindre la partie</h1>
          <p className="text-muted-foreground mb-8">Entre le code PIN affiché par l’admin.</p>

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
              className="text-center text-2xl font-black tracking-[0.3em] bg-white/70 dark:bg-white/10 border-border h-14 rounded-xl"
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
            disabled={normalizePin(pinCode).length !== PIN_LENGTH || isLoading}
            className="w-full bg-violet-600 text-white hover:bg-violet-600/90 h-12 rounded-xl font-bold"
          >
            {isLoading ? 'Vérification...' : 'Entrer dans la partie'}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleNicknameSubmit}>
          {fromScan && (
            <div className="mb-4 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-center text-sm text-foreground">
              QR scanné · session trouvée
            </div>
          )}
          <h1 className="text-3xl font-black mb-2">Ton pseudo</h1>
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
              className="flex-1 border-border h-12 rounded-xl"
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
              className="flex-1 bg-violet-600 text-white hover:bg-violet-600/90 h-12 rounded-xl font-bold"
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
    <div className="wiaa-purple-bg min-h-screen text-white">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-6 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-white/75 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="wiaa-glass-card w-full max-w-md rounded-2xl px-6 py-10 text-center text-foreground">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-700 dark:text-violet-200">
              <span className="text-2xl" aria-hidden>
                🎮
              </span>
            </div>
            <Suspense fallback={<LoadingFallback />}>
              <JoinForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}
