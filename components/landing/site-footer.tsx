import type { ReactNode } from 'react'
import Link from 'next/link'

const footerColumns: {
  title: string
  links: { label: string; href: string; external?: boolean }[]
}[] = [
  {
    title: 'Produit',
    links: [
      { label: 'Fonctionnalités', href: '/#fonctionnalites' },
      { label: 'Tarifs', href: '/#tarifs' },
      { label: 'Changelog', href: '/#changelog' },
      { label: 'Roadmap', href: '/#roadmap' },
    ],
  },
  {
    title: 'Ressources',
    links: [
      { label: "Centre d'aide", href: '/aide' },
      { label: 'Documentation', href: '/aide' },
      { label: 'Tutoriels', href: '/aide' },
      { label: 'Témoignages', href: '/#temoignages' },
    ],
  },
  {
    title: 'Entreprise',
    links: [
      { label: 'À propos', href: '/#apropos' },
      { label: 'Carrières', href: 'mailto:carrieres@sciti-quiz.app?subject=Candidature', external: true },
      { label: 'Contact', href: 'mailto:contact@sciti-quiz.app', external: true },
      { label: 'Presse', href: 'mailto:presse@sciti-quiz.app?subject=Presse', external: true },
    ],
  },
  {
    title: 'Légal',
    links: [
      { label: 'Confidentialité', href: '/#confidentialite' },
      { label: 'CGU', href: '/#cgu' },
      { label: 'Cookies', href: '/#cookies' },
      { label: 'RGPD', href: '/#rgpd' },
    ],
  },
]

function FooterLink({
  href,
  external,
  children,
}: {
  href: string
  external?: boolean
  children: ReactNode
}) {
  const className =
    'text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm'

  if (external) {
    return (
      <a href={href} className={className} rel="noopener noreferrer" target="_blank">
        {children}
      </a>
    )
  }
  if (href.startsWith('/#')) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    )
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  )
}

export function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="relative border-t border-border/80 bg-muted/30 dark:bg-muted/10">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent dark:via-violet-400/25"
        aria-hidden
      />

      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-2 md:grid-cols-4 md:gap-12 lg:gap-16">
          {footerColumns.map((col) => (
            <div key={col.title}>
              <h3 className="mb-5 text-sm font-bold tracking-tight text-foreground">{col.title}</h3>
              <ul className="flex flex-col gap-3.5">
                {col.links.map((item) => (
                  <li key={item.label}>
                    <FooterLink href={item.href} external={item.external}>
                      {item.label}
                    </FooterLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 border-t border-border/80 pt-10">
          <div className="flex flex-col items-center justify-between gap-8 md:flex-row md:items-center">
            <Link
              href="/"
              className="group flex items-center gap-3 rounded-lg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 text-sm font-black text-white shadow-md shadow-violet-500/20">
                Q
              </div>
              <div className="text-left">
                <span className="block text-base font-bold tracking-tight text-foreground">SCITI-Quiz</span>
                <span className="text-xs font-medium text-muted-foreground">Quiz live · WISSI / SCITI</span>
              </div>
            </Link>

            <p className="text-center text-sm text-muted-foreground md:text-right">
              © {year} SCITI-Quiz. Tous droits réservés.
            </p>
          </div>
        </div>

        <div className="mt-12 max-w-4xl space-y-8 border-t border-border/60 pt-10 text-xs leading-relaxed text-muted-foreground">
          <div id="confidentialite" className="scroll-mt-28">
            <h4 className="mb-2 text-sm font-semibold text-foreground">Confidentialité</h4>
            <p>
              Nous traitons vos données pour fournir le service (compte, sessions, analytics avec consentement).
              Hébergement conforme aux usages EdTech ; vous pouvez exercer vos droits via la page contact.
            </p>
          </div>
          <div id="cgu" className="scroll-mt-28">
            <h4 className="mb-2 text-sm font-semibold text-foreground">Conditions générales d&apos;utilisation</h4>
            <p>
              L&apos;utilisation de SCITI-Quiz implique l&apos;acceptation des CGU : usage pédagogique responsable,
              respect des participants, et conformité aux lois sur les données personnelles applicables.
            </p>
          </div>
          <div id="cookies" className="scroll-mt-28">
            <h4 className="mb-2 text-sm font-semibold text-foreground">Cookies</h4>
            <p>
              Des cookies techniques assurent la connexion et la sécurité. Les cookies de mesure ou marketing ne
              sont déposés qu&apos;avec votre accord (bannière de consentement).
            </p>
          </div>
          <div id="rgpd" className="scroll-mt-28">
            <h4 className="mb-2 text-sm font-semibold text-foreground">RGPD</h4>
            <p>
              Vous disposez des droits d&apos;accès, de rectification, d&apos;effacement et d&apos;opposition. Pour
              toute demande, écrivez-nous à l&apos;adresse indiquée dans la colonne Entreprise — Contact.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
