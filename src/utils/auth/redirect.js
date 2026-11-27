// Seul un chemin interne est accepté comme destination après connexion.
// "//hote" et "/\hote" sont lus par le navigateur comme une adresse externe,
// et il supprime les tabulations et retours à la ligne avant de les lire.
export function safeRedirect(value) {
  if (typeof value !== 'string' || /[\u0000-\u001f]/.test(value)) return '/'
  return /^\/(?![/\\])/.test(value) ? value : '/'
}

const BLOCKED_PROTOCOLS = ['javascript:', 'data:', 'vbscript:', 'blob:', 'file:']

// Adresse de retour d'un client externe : absolue, et sans protocole capable
// d'exécuter du code dans l'application. Les protocoles d'applications restent permis.
export function isSafeReturnUrl(value) {
  if (typeof value !== 'string') return false
  try {
    return !BLOCKED_PROTOCOLS.includes(new URL(value).protocol)
  } catch {
    return false
  }
}
