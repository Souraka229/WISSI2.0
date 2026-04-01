import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Mail, ArrowRight } from 'lucide-react'

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-8">
            <Mail className="w-8 h-8 text-secondary" />
          </div>

          <h1 className="text-3xl font-bold mb-3">Vérifiez votre email</h1>
          <p className="text-muted-foreground mb-8">
            Nous vous avons envoyé un lien de confirmation. Cliquez dessus pour vérifier votre email et commencer à créer des quiz.
          </p>

          <div className="bg-input rounded-lg p-4 mb-8 text-sm text-muted-foreground text-left">
            <p className="font-semibold text-foreground mb-2">Vous n&apos;avez pas reçu l&apos;email ?</p>
            <ul className="space-y-1">
              <li>• Vérifiez votre dossier spam</li>
              <li>• Assurez-vous d&apos;avoir utilisé le bon email</li>
              <li>• Réessayez de vous inscrire</li>
            </ul>
          </div>

          <Link href="/auth/login" className="w-full block">
            <Button className="w-full bg-foreground text-background hover:bg-foreground/90 gap-2 h-11">
              Retour à la connexion <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          En vous inscrivant, vous acceptez nos Conditions d&apos;utilisation et notre Politique de confidentialité
        </p>
      </div>
    </div>
  )
}
