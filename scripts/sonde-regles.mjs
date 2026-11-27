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

const noms = (texte, motif) => [...texte.matchAll(motif)].map((m) => m[1])

export const tablesDuCode = (code) =>
  noms(code, /(?<!storage|Array)\.from\(\s*['"`]([a-z0-9_]+)['"`]/g)

export const tablesDuSchema = (sql) =>
  noms(sql.replace(/--.*$/gm, ''), /\b(?:create|alter)\s+table\s+(?:if\s+(?:not\s+)?exists\s+)?(?:only\s+)?(?:public\.)?([a-z0-9_]+)/gi)
