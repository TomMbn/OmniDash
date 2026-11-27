// Logique du styliste, sans accès à la page ni au réseau.
// La réponse de Claude est un texte non fiable : seuls les identifiants du
// dressing, les raisons et le résumé en sont repris.

const FORMAT_JOUR = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
})

export function todayParis(now) {
  const parts = Object.fromEntries(FORMAT_JOUR.formatToParts(now).map((x) => [x.type, x.value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}

// Calcul sur le calendrier en UTC : le changement d'heure ne joue pas.
export function previousDay(iso) {
  const jour = new Date(`${iso}T00:00:00Z`)
  jour.setUTCDate(jour.getUTCDate() - 1)
  return jour.toISOString().slice(0, 10)
}

// Les hauts et bas portés la veille sont retirés. Une catégorie qui se
// retrouve vide les récupère, et leurs identifiants sont signalés.
export function availableFor(pieces, history, today) {
  const veille = new Set(history[previousDay(today)]?.ids ?? [])
  const bloquees = new Set()
  const repeats = []

  for (const categorie of ['haut', 'bas']) {
    const duType = pieces.filter((x) => x.categorie === categorie)
    const portees = duType.filter((x) => veille.has(x.id))
    for (const { id } of portees) {
      if (portees.length === duType.length) repeats.push(id)
      else bloquees.add(id)
    }
  }

  return { pieces: pieces.filter((x) => !bloquees.has(x.id)), repeats }
}

const refus = (error) => ({ ok: false, error })
const texteOuVide = (valeur) => (typeof valeur === 'string' ? valeur : '')

function lireJson(text) {
  if (typeof text !== 'string') return undefined
  const brut = text.trim()
  const bloc = brut.match(/^```(?:json)?([\s\S]*)```$/i)
  try {
    return JSON.parse(bloc ? bloc[1] : brut)
  } catch {
    return undefined
  }
}

export function parseOutfit(text, allowed) {
  const reponse = lireJson(text)
  if (!Array.isArray(reponse?.pieces)) return refus('La réponse n’est pas au format JSON demandé.')
  if (reponse.pieces.length === 0) return refus('La tenue ne contient aucune pièce.')

  const parId = new Map(allowed.map((x) => [x.id, x]))
  const choisis = new Set()
  const cards = []

  for (const element of reponse.pieces) {
    const piece = parId.get(element?.id)
    if (!piece) return refus('La tenue cite une pièce qui n’est pas proposée.')
    if (choisis.has(piece.id)) return refus('La tenue cite deux fois la même pièce.')
    choisis.add(piece.id)
    cards.push({ piece, raison: texteOuVide(element.raison) })
  }

  const nombre = (categorie) => cards.filter((x) => x.piece.categorie === categorie).length
  if (nombre('bas') > 1) return refus('La tenue contient deux bas.')
  if (nombre('chaussures') > 1) return refus('La tenue contient deux paires de chaussures.')

  return {
    ok: true,
    cards,
    resume: texteOuVide(reponse.resume),
    missing: ['haut', 'bas', 'chaussures'].filter((categorie) => nombre(categorie) === 0)
  }
}

// Une relance au plus, et seulement si la réponse est refusée. Une erreur de
// ask (limite atteinte, refus) remonte telle quelle à l'appelant.
export async function askOutfit(ask, prompt, allowed) {
  const premier = parseOutfit(await ask(prompt), allowed)
  if (premier.ok) return premier
  const relance = `${prompt}\n\nTa réponse précédente a été refusée. ${premier.error} Réponds uniquement avec le JSON demandé.`
  return parseOutfit(await ask(relance), allowed)
}
