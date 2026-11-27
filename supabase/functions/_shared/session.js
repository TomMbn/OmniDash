// Exige un utilisateur connecté. La passerelle ne vérifie pas les jetons du projet,
// chaque fonction doit donc contrôler elle-même l'appelant.
// La décision revient à getUser, qui interroge le serveur d'authentification :
// la présence d'un jeton ne suffit pas, la clé anonyme ne désigne aucun utilisateur.

export async function requireUser(req, headers, getUser) {
  const authorization = req.headers.get('Authorization')
  if (authorization) {
    try {
      if (await getUser(authorization)) return null
    } catch {
      // Une vérification impossible vaut un refus.
    }
  }
  return new Response(JSON.stringify({ error: 'Connexion requise' }), {
    status: 401,
    headers: { ...headers, 'Content-Type': 'application/json' }
  })
}
