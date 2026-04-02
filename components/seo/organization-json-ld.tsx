import { getSiteUrl } from '@/lib/site-url'

/** Données structurées schema.org — aide les moteurs à comprendre l’application. */
export function OrganizationJsonLd() {
  const url = getSiteUrl()
  const payload = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${url}/#website`,
        url,
        name: 'SCITI-Quiz',
        description:
          'Quiz interactif multijoueur en temps réel pour la classe, la formation et le team building.',
        inLanguage: 'fr-FR',
        publisher: { '@id': `${url}/#organization` },
      },
      {
        '@type': 'Organization',
        '@id': `${url}/#organization`,
        name: 'SCITI-Quiz',
        url,
        description:
          'Plateforme de quiz en direct avec code PIN, QR code et classement temps réel.',
      },
      {
        '@type': 'SoftwareApplication',
        name: 'SCITI-Quiz',
        applicationCategory: 'EducationalApplication',
        operatingSystem: 'Web',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'EUR',
        },
        description:
          'Créez des sessions live, partagez un PIN ou un QR code, suivez le podium en direct.',
      },
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  )
}
