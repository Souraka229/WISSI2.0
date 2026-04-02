/** URL publique du site (SEO, canonical, sitemap). */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
  if (fromEnv && /^https?:\/\//i.test(fromEnv)) return fromEnv
  if (process.env.VERCEL_URL)
    return `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`
  return 'http://localhost:3000'
}
