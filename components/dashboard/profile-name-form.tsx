'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateProfileDisplayName } from '@/app/actions/profile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle2, PencilLine } from 'lucide-react'

export function ProfileNameForm({ initialName }: { initialName: string }) {
  const router = useRouter()
  const [value, setValue] = useState(initialName)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [pending, startTransition] = useTransition()

  const submit = () => {
    setError(null)
    setOk(false)
    startTransition(async () => {
      try {
        await updateProfileDisplayName(value)
        setOk(true)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Échec de la mise à jour')
      }
    })
  }

  return (
    <form
      className="space-y-4 rounded-2xl border border-violet-500/20 bg-gradient-to-br from-muted/40 to-violet-500/[0.06] p-5"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <PencilLine className="h-4 w-4 text-violet-600 dark:text-violet-400" />
        Modifier le nom d’affichage
      </div>
      <p className="text-xs text-muted-foreground">
        Jusqu’à 120 caractères. Visible dans votre espace et utile pour vous repérer parmi vos quiz.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <label htmlFor="display-name" className="sr-only">
            Nom d’affichage
          </label>
          <Input
            id="display-name"
            value={value}
            onChange={(e) => {
              setOk(false)
              setValue(e.target.value)
            }}
            disabled={pending}
            className="h-11 border-border/80 bg-background text-base"
            maxLength={120}
            placeholder="Ex. Marie Dupont"
            autoComplete="name"
          />
        </div>
        <Button type="submit" disabled={pending} className="h-11 shrink-0 font-semibold sm:min-w-[140px]">
          {pending ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      </div>
      {error && (
        <p className="text-sm font-medium text-destructive" role="alert">
          {error}
        </p>
      )}
      {ok && (
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Nom enregistré — l’en-tête et les initiales sont à jour.
        </p>
      )}
    </form>
  )
}
