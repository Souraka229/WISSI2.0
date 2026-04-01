'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createQuiz } from '@/app/actions/quiz'
import { ArrowLeft, Zap } from 'lucide-react'
import Link from 'next/link'

export default function CreateQuizPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    theme: 'general',
    level: 'intermediate',
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const quiz = await createQuiz(
        formData.title,
        formData.description,
        formData.theme,
        formData.level
      )
      router.push(`/dashboard/quiz/${quiz[0].id}`)
    } catch (error) {
      console.error('Error creating quiz:', error)
      alert('Erreur lors de la création du quiz')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border sticky top-0 z-40 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Retour</span>
          </Link>
        </div>
      </div>

      {/* Form */}
      <main className="max-w-2xl mx-auto px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Créer un nouveau quiz</h1>
          <p className="text-muted-foreground">Configurez les informations de base de votre quiz interactif</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-card border border-border rounded-xl p-8">
            {/* Title */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Titre du quiz *
              </label>
              <Input
                type="text"
                name="title"
                placeholder="Ex: Histoire de France - La Révolution"
                value={formData.title}
                onChange={handleChange}
                required
                className="bg-input border-border"
              />
            </div>

            {/* Description */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Description
              </label>
              <textarea
                name="description"
                placeholder="Décrivez le contenu de ce quiz..."
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="w-full px-4 py-3 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/40 resize-none"
                rows={4}
              />
            </div>

            {/* Theme & Level */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Thème
                </label>
                <select
                  name="theme"
                  value={formData.theme}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-secondary/40"
                >
                  <option value="general">Culture générale</option>
                  <option value="science">Sciences</option>
                  <option value="history">Histoire</option>
                  <option value="math">Mathématiques</option>
                  <option value="language">Langues</option>
                  <option value="geography">Géographie</option>
                  <option value="literature">Littérature</option>
                  <option value="philosophy">Philosophie</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Niveau de difficulté
                </label>
                <select
                  name="level"
                  value={formData.level}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-secondary/40"
                >
                  <option value="beginner">Débutant</option>
                  <option value="intermediate">Intermédiaire</option>
                  <option value="advanced">Avancé</option>
                </select>
              </div>
            </div>

            {/* AI Generation Option */}
            <div className="bg-secondary/10 border border-secondary/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-secondary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 text-secondary" />
                </div>
                <div>
                  <p className="font-medium mb-1">Génération IA disponible</p>
                  <p className="text-sm text-muted-foreground">
                    Après création, utilisez SuperPrompt pour générer vos questions automatiquement à partir de vos notes de cours.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <Link href="/dashboard" className="flex-1">
              <Button variant="outline" size="lg" className="w-full border-border hover:bg-muted">
                Annuler
              </Button>
            </Link>
            <Button
              type="submit"
              size="lg"
              disabled={!formData.title || isLoading}
              className="flex-1 bg-foreground text-background hover:bg-foreground/90"
            >
              {isLoading ? 'Création...' : 'Créer le quiz'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}
