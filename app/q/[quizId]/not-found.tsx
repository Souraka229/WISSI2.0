import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function PublicQuizNotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Quiz introuvable ou privé</h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Ce lien ne correspond à aucun quiz public. Le créateur a peut-être repassé le quiz en privé, ou l’URL est
          incorrecte.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/join">Rejoindre une session</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">Accueil</Link>
        </Button>
      </div>
    </div>
  )
}
