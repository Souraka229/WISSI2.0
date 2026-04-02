import type { Metadata } from 'next'
import { CommandPalette } from '@/components/command-palette'

/** Espace enseignant : pas d’indexation (contenu privé, évite duplicate thin content SEO). */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <CommandPalette />
      {children}
    </>
  )
}
