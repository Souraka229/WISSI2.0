import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { AlertCircle, ArrowLeft } from 'lucide-react'

export default async function ErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>
}) {
  const params = await searchParams

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-destructive/15 rounded-full flex items-center justify-center mx-auto mb-8">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>

          <h1 className="text-3xl font-bold text-foreground mb-3">Something Went Wrong</h1>
          <p className="text-muted-foreground mb-8">
            {params?.error ? `Error: ${params.error}` : 'An authentication error occurred. Please try again.'}
          </p>

          <div className="space-y-3">
            <Link href="/auth/login" className="w-full block">
              <Button size="lg" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                <ArrowLeft className="w-4 h-4" /> Back to Sign In
              </Button>
            </Link>
            <Link href="/" className="w-full block">
              <Button variant="outline" size="lg" className="w-full">
                Go Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
