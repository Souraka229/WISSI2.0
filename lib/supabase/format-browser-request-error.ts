/** Erreur réseau typique (coupure, pare-feu, onglet en veille) — une nouvelle tentative peut suffire. */
export function isTransientSupabaseNetworkError(error: unknown): boolean {
  const obj = error as Record<string, unknown>
  const msg =
    typeof obj.message === 'string' ? obj.message.toLowerCase() : ''
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('load failed')
  )
}

/**
 * Texte affiché quand un appel Supabase depuis le navigateur échoue (hors « 0 ligne »).
 */
export function formatSupabaseBrowserRequestError(error: unknown): string {
  if (error == null) {
    return 'Erreur inconnue. Réessayez dans un instant.'
  }

  const obj = error as Record<string, unknown>
  const msg =
    typeof obj.message === 'string' ? obj.message : String(error)
  const lower = msg.toLowerCase()
  const code = typeof obj.code === 'string' ? obj.code : ''

  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network request failed') ||
    lower.includes('load failed') ||
    lower.includes('echec du réseau') ||
    lower.includes('échec du réseau')
  ) {
    return 'Connexion au serveur impossible. Vérifiez votre connexion internet, essayez une autre Wi‑Fi ou la 4G, et désactivez temporairement VPN ou bloqueur de pubs qui pourrait bloquer supabase.co.'
  }

  if (
    code === 'PGRST301' ||
    lower.includes('jwt') ||
    lower.includes('invalid api key') ||
    lower.includes('no api key')
  ) {
    return 'Configuration Supabase invalide : vérifiez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY (sans espace en trop), puis relancez le build / le déploiement.'
  }

  if (
    code === '42501' ||
    lower.includes('permission denied') ||
    lower.includes('row-level security')
  ) {
    return 'La base refuse la lecture (sécurité RLS). Exécutez le script scripts/004_fix_sessions_join_rls.sql dans Supabase pour autoriser la lecture des sessions au join.'
  }

  if (process.env.NODE_ENV === 'development') {
    return `Échec de la requête : ${code ? `[${code}] ` : ''}${msg}`
  }

  return 'Le service de données ne répond pas correctement. Réessayez plus tard ou contactez l’administrateur du site.'
}
