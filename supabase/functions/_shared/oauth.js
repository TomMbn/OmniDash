// Refuse les jetons délivrés à un client externe par le serveur OAuth de Supabase.
// La signature du jeton n'est pas vérifiée ici : ces fonctions lisent seulement
// la mention client_id et ne valent pas une authentification. Chaque fonction
// vérifie ensuite l'utilisateur auprès du serveur d'authentification.

export function isOAuthClientToken(authorization) {
  if (authorization == null) return false
  // Tout ce qui ne se lit pas comme un jeton est refusé.
  try {
    const parties = /^Bearer\s+(\S+)$/i.exec(authorization)[1].split('.')
    if (parties.length !== 3) return true
    const claims = JSON.parse(atob(parties[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (!claims || typeof claims !== 'object' || Array.isArray(claims)) return true
    return claims.client_id != null
  } catch {
    return true
  }
}

export function refuseOAuthClient(req, headers) {
  if (!isOAuthClientToken(req.headers.get('Authorization'))) return null
  return new Response(JSON.stringify({ error: 'Accès refusé' }), {
    status: 403,
    headers: { ...headers, 'Content-Type': 'application/json' }
  })
}
