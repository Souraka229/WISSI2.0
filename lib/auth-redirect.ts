/** Évite les redirections ouvertes : uniquement chemins relatifs internes. */
export function safeAuthRedirectPath(
  raw: string | null,
  fallback = '/dashboard',
): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return fallback
  return raw
}
