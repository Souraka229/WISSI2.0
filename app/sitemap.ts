import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/site-url'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl()
  const paths = [
    { path: '', priority: 1, changeFrequency: 'weekly' as const },
    { path: '/join', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/aide', priority: 0.85, changeFrequency: 'monthly' as const },
    { path: '/auth/login', priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/auth/sign-up', priority: 0.7, changeFrequency: 'monthly' as const },
  ]

  const lastModified = new Date()

  return paths.map(({ path, priority, changeFrequency }) => ({
    url: `${base}${path === '' ? '/' : path}`,
    lastModified,
    changeFrequency,
    priority,
  }))
}
