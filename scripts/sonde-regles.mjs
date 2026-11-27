const REFUS = [401, 403]

const listeVide = (body) => Array.isArray(body) && body.length === 0
const listeRemplie = (body) => Array.isArray(body) && body.length > 0

// Réponses acceptables en plus du refus, qui vaut ok partout sauf pour le dressing.
const REGLES = {
  compte: () => false,
  fonction: () => false,
  'lecture-autre': (status, body) => status === 200 && listeVide(body),
  ecriture: (status, body) => status === 200 && listeVide(body),
  stockage: (status, body) => status === 200 && listeVide(body),
  'lecture-dressing': (status, body) => status === 200 && listeRemplie(body)
}

export function verdict(check, status, body) {
  if (!Object.hasOwn(REGLES, check)) return 'echec'
  if (REFUS.includes(status)) return check === 'lecture-dressing' ? 'echec' : 'ok'
  return REGLES[check](status, body) ? 'ok' : 'echec'
}

// Le jeton ne doit lire que des lignes de son propre compte (mention sub).
export function verdictDressing(status, body, sub) {
  if (verdict('lecture-dressing', status, body) !== 'ok') return 'echec'
  if (typeof sub !== 'string' || !sub) return 'echec'
  return body.every((ligne) => ligne?.user_id === sub) ? 'ok' : 'echec'
}

export const codeServeur = (body) =>
  [body?.error_code, body?.error].find((v) => typeof v === 'string' && /^[a-z_]{1,60}$/.test(v))

const lireMentions = (jeton) => {
  try {
    const mentions = JSON.parse(Buffer.from(jeton.split('.')[1], 'base64url').toString())
    return mentions && typeof mentions === 'object' && !Array.isArray(mentions) ? mentions : null
  } catch {
    return null
  }
}

// Le jeton de rafraîchissement d'un client OAuth, présenté sans client_id,
// ne doit pas donner une connexion normale.
export function verdictRafraichissement(status, body) {
  const rendre = (resultat, motif) => ({ resultat, motif })
  if ([400, 401, 403].includes(status) && codeServeur(body)) return rendre('ok', 'refus')
  const jeton = body?.access_token
  const mentions = status === 200 && typeof jeton === 'string' ? lireMentions(jeton) : null
  if (!mentions) return rendre('echec', 'inattendu')
  return typeof mentions.client_id === 'string' && mentions.client_id
    ? rendre('ok', 'session-client')
    : rendre('echec', 'session-normale')
}

const noms = (texte, motif) => [...texte.matchAll(motif)].map((m) => m[1])

export const tablesDuCode = (code) =>
  noms(code, /(?<!storage|Array)\.from\(\s*['"`]([a-z0-9_]+)['"`]/g)

export const tablesDuSchema = (sql) =>
  noms(sql.replace(/--.*$/gm, ''), /\b(?:create|alter)\s+table\s+(?:if\s+(?:not\s+)?exists\s+)?(?:only\s+)?(?:public\.)?([a-z0-9_]+)/gi)
