'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { ArrowLeft, Radio, Trophy, Hash } from 'lucide-react'

const SCITI_LOGO_URL =
  'https://media.base44.com/images/public/69c7bf150f6a28ce3f6a0b74/501bdfc3f_logo.png'

type ScitiQuizAuthShellProps = {
  children: React.ReactNode
  /** Contenu additionnel sous le bandeau (ex. liste avantages inscription) */
  sideExtra?: React.ReactNode
}

export function ScitiQuizAuthShell({ children, sideExtra }: ScitiQuizAuthShellProps) {
  const [logoOk, setLogoOk] = useState(true)

  return (
    <div className="relative min-h-screen bg-background lg:flex">
      <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
        <ThemeSwitcher />
      </div>

      {/* Formulaire */}
      <div className="relative z-10 flex min-h-screen flex-1 flex-col px-5 py-8 sm:px-8 lg:px-14 lg:py-12">
        <Link
          href="/"
          className="mb-8 inline-flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à l&apos;accueil
        </Link>

        <div className="flex flex-1 items-center justify-center pb-8">
          <div className="w-full max-w-[420px]">{children}</div>
        </div>
      </div>

      {/* Panneau marque — style quiz live / Kahoot */}
      <div className="relative hidden min-h-screen w-full max-w-xl shrink-0 overflow-hidden lg:block xl:max-w-2xl">
        <div
          className="absolute inset-0 bg-gradient-to-br from-violet-600 via-fuchsia-600 to-orange-500"
          aria-hidden
        />
        <div
          className="absolute inset-0 opacity-40 mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.12'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
          aria-hidden
        />
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" aria-hidden />
        <div className="absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-orange-400/30 blur-3xl" aria-hidden />

        <div className="relative flex h-full flex-col justify-between p-10 text-white xl:p-14">
          <div>
            <div className="mb-10 flex items-center gap-4">
              {logoOk ? (
                <Image
                  src={SCITI_LOGO_URL}
                  alt="SCITI-Quiz"
                  width={56}
                  height={56}
                  className="h-14 w-14 rounded-2xl bg-white/95 object-contain p-1 shadow-lg ring-2 ring-white/30"
                  unoptimized
                  onError={() => setLogoOk(false)}
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-2xl font-black shadow-lg ring-2 ring-white/30">
                  Q
                </div>
              )}
              <div>
                <p className="text-2xl font-black tracking-tight">SCITI-Quiz</p>
                <p className="text-sm font-medium text-white/85">
                  Quiz interactif multijoueur en temps réel
                </p>
              </div>
            </div>

            <h2 className="max-w-md text-3xl font-black leading-[1.15] tracking-tight xl:text-4xl">
              Animez vos cours, événements et team building avec une compétition effrénée.
            </h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-white/90">
              Créez des sessions, jouez avec vos participants et suivez le classement en direct —
              inspiré de l&apos;esprit Kahoot, pensé pour la classe et l&apos;entreprise.
            </p>

            <ul className="mt-10 flex flex-col gap-4 text-sm font-semibold">
              <li className="flex items-center gap-3 rounded-xl bg-black/15 px-4 py-3 backdrop-blur-sm ring-1 ring-white/20">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
                  <Radio className="h-5 w-5" aria-hidden />
                </span>
                <span>Sessions live &amp; synchronisation instantanée</span>
              </li>
              <li className="flex items-center gap-3 rounded-xl bg-black/15 px-4 py-3 backdrop-blur-sm ring-1 ring-white/20">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
                  <Trophy className="h-5 w-5" aria-hidden />
                </span>
                <span>Classement et podium en direct</span>
              </li>
              <li className="flex items-center gap-3 rounded-xl bg-black/15 px-4 py-3 backdrop-blur-sm ring-1 ring-white/20">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
                  <Hash className="h-5 w-5" aria-hidden />
                </span>
                <span>Rejoindre une partie avec un simple code PIN</span>
              </li>
            </ul>
          </div>

          {sideExtra && (
            <div className="mt-10 border-t border-white/20 pt-8 text-white/95">{sideExtra}</div>
          )}

          <p className="mt-8 text-xs text-white/60">
            Plateforme pédagogique — connexion sécurisée pour les animateurs.
          </p>
        </div>
      </div>
    </div>
  )
}
