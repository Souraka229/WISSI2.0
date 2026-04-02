import type { Metadata } from 'next'
import { assertSuperadmin } from '@/lib/auth/superadmin'

export const metadata: Metadata = {
  title: 'Superadmin',
  robots: { index: false, follow: false },
}

export default async function SuperadminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await assertSuperadmin()
  return <>{children}</>
}
