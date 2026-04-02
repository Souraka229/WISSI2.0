'use client'

import { useState, useTransition } from 'react'
import { updateProfileDisplayName } from '@/app/actions/profile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function ProfileNameForm({ initialName }: { initialName: string }) {
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
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Échec de la mise à jour')
      }
    })
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
      <label htmlFor="display-name" className="text-sm font-semibold text-foreground">
        Modifier le nom d’affichage
      </label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          id="display-name"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={pending}
          className="max-w-md"
          maxLength={120}
        />
        <Button type="button" disabled={pending} onClick={() => submit()}>
          {pending ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {ok && <p className="text-sm text-emerald-600 dark:text-emerald-400">Nom mis à jour.</p>}
    </div>
  )
}
