/**
 * URL canonique du site (SEO, Open Graph, sitemap, « Partagé depuis »).
 *
 * Sur Vercel **preview**, `VERCEL_URL` pointe vers une URL du type
 * `projet-xxx-nom.vercel.app` — à ne pas afficher comme « site officiel ».
 * On préfère `NEXT_PUBLIC_APP_URL` ou l’URL de prod injectée par Vercel.
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '')
  if (explicit && /^https?:\/\//i.test(explicit)) return explicit

  const prodHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim().replace(/\/$/, '')
  if (prodHost) {
    return /^https?:\/\//i.test(prodHost) ? prodHost : `https://${prodHost}`
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`
  }

  return 'http://localhost:3000'
}
