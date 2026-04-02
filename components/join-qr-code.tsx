'use client'

import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState } from 'react'

type JoinQrCodeProps = {
  pin: string
  size?: number
  className?: string
}

/** Lien vers /join?pin=… — après scan, le joueur n’a plus qu’à saisir son pseudo. */
export function JoinQrCode({ pin, size = 192, className }: JoinQrCodeProps) {
  const [joinUrl, setJoinUrl] = useState('')

  useEffect(() => {
    if (!pin) return
    // Toujours privilégier l’origine actuelle : si NEXT_PUBLIC_APP_URL pointe vers un autre
    // déploiement, le QR envoyait les joueurs ailleurs → « code invalide » (autre projet / cache).
    const origin =
      typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || ''
    if (!origin) return
    setJoinUrl(`${origin}/join?pin=${encodeURIComponent(pin)}`)
  }, [pin])

  if (!joinUrl) {
    return (
      <div
        className={`mx-auto rounded-2xl bg-muted ${className ?? ''}`}
        style={{ width: size + 24, height: size + 24 }}
        aria-hidden
      />
    )
  }

  return (
    <div className={`flex flex-col items-center gap-3 ${className ?? ''}`}>
      <div className="rounded-2xl border-2 border-border bg-background p-3 shadow-sm">
        <QRCodeSVG
          value={joinUrl}
          size={size}
          level="M"
          marginSize={2}
        />
      </div>
      <p className="max-w-[220px] text-center text-xs leading-relaxed text-muted-foreground">
        Scannez avec l’appareil photo : la page s’ouvre, vous entrez uniquement votre pseudo.
      </p>
    </div>
  )
}
