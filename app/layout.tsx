import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { PageViewTracker } from '@/components/analytics/page-view-tracker'
import { CookieConsentBanner } from '@/components/consent/cookie-consent-banner'
import { ThemeProvider } from '@/components/theme-provider'
import { OrganizationJsonLd } from '@/components/seo/organization-json-ld'
import { getSiteUrl } from '@/lib/site-url'
import './globals.css'

const _geist = Geist({ subsets: ['latin'] })
const _geistMono = Geist_Mono({ subsets: ['latin'] })

const siteUrl = getSiteUrl()

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'SCITI-Quiz — Quiz interactif multijoueur en temps réel',
    template: '%s | SCITI-Quiz',
  },
  description:
    'Quiz interactif multijoueur en temps réel inspiré de Kahoot. Créez des sessions, partagez un code PIN ou un QR code, suivez le classement et le podium en direct. Idéal pour la classe, la formation et le team building.',
  keywords: [
    'quiz interactif',
    'kahoot alternative',
    'quiz temps réel',
    'classe interactive',
    'SCITI',
    'formation',
    'team building',
    'QCM en ligne',
    'code PIN quiz',
    'quiz multijoueur',
    'podium live',
    'éducation',
    'edtech',
  ],
  authors: [{ name: 'SCITI-Quiz' }],
  creator: 'SCITI-Quiz',
  publisher: 'SCITI-Quiz',
  formatDetection: { email: false, telephone: false },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: '/icon.svg',
  },
  manifest: '/manifest.webmanifest',
  alternates: {
    canonical: '/',
    languages: { 'fr-FR': '/' },
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: '/',
    siteName: 'SCITI-Quiz',
    title: 'SCITI-Quiz — Quiz live, PIN, QR code, classement temps réel',
    description:
      'Animez vos cours et événements : sessions multijoueur, QR pour rejoindre, podium instantané.',
    images: [{ url: '/icon.svg', width: 512, height: 512, alt: 'SCITI-Quiz' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SCITI-Quiz',
    description:
      'Quiz multijoueur en direct — PIN, QR code, classement live pour la classe et les entreprises.',
    images: ['/icon.svg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  category: 'education',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <OrganizationJsonLd />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <CookieConsentBanner />
          <PageViewTracker />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
