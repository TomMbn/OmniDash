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
// Un historique absent ou mal formé ne bloque rien : la page dit elle-même
// quand la règle n'a pas pu s'appliquer.
export function availableFor(pieces, history, today) {
  const entree = history !== null && typeof history === 'object' ? history[previousDay(today)] : undefined
  const ids = Array.isArray(entree?.ids) ? entree.ids.filter((x) => typeof x === 'string') : []
  const veille = new Set(ids)
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

// Les chaussures de style « habillé » (richelieus par exemple) font trop pour le
// quotidien : elles ne sont proposées que pour l'occasion Habillé, même s'il
// n'y a pas d'autre paire.
const chaussureHabillee = (x) =>
  x.categorie === 'chaussures' && String(x.style).normalize('NFC').trim().toLowerCase() === 'habillé'

export function forOccasion(pieces, occasion) {
  return occasion === 'Habillé' ? pieces : pieces.filter((x) => !chaussureHabillee(x))
}

// Sans cette raison, une tenue sans chaussures laisserait croire que le
// dressing n'en a pas.
export function reservedShoesNote(pieces, occasion, missing) {
  const ecartees = forOccasion(pieces, occasion).length < pieces.length
  return ecartees && missing.includes('chaussures')
    ? 'Les chaussures habillées sont réservées à l’occasion Habillé.'
    : null
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
async function avecRelance(ask, prompt, lire) {
  const premier = lire(await ask(prompt))
  if (premier.ok) return premier
  const relance = `${prompt}\n\nTa réponse précédente a été refusée. ${premier.error} Réponds uniquement avec le JSON demandé.`
  return lire(await ask(relance))
}

export function askOutfit(ask, prompt, allowed) {
  return avecRelance(ask, prompt, (texte) => parseOutfit(texte, allowed))
}

// Dressing reçu du connecteur ou relu depuis la copie gardée. Seuls les
// champs connus sont repris, et seulement s'ils ont le bon type.
export function normalizePieces(payload) {
  if (payload === null || typeof payload !== 'object' || !Array.isArray(payload.pieces)) return null
  const vus = new Set()
  const pieces = []
  for (const x of payload.pieces) {
    if (x === null || typeof x !== 'object') continue
    if (typeof x.id !== 'string' || x.id === '' || vus.has(x.id)) continue
    if (typeof x.nom !== 'string' || typeof x.categorie !== 'string') continue
    vus.add(x.id)
    pieces.push({
      id: x.id,
      nom: x.nom,
      categorie: x.categorie,
      sousCategorie: texteOuVide(x.sousCategorie),
      couleur: texteOuVide(x.couleur),
      marque: texteOuVide(x.marque),
      quantite: Number.isInteger(x.quantite) && x.quantite > 0 ? x.quantite : 1,
      style: texteOuVide(x.style),
      lien: texteOuVide(x.lien)
    })
  }
  return pieces
}

// Connecteur absent ou connexion expirée : la copie gardée sert, avec sa date,
// et le message dit quoi faire. Accès refusé : la copie ne sert pas. Compte
// changé : rien n'est affiché et la page ne fait plus d'appel. Un code inconnu
// compte comme une panne passagère.
const INDISPONIBLE = 'Les connecteurs ne sont pas disponibles ici. Ouvrez l’artefact dans claude.ai pour relire le dressing.'
const ACCORD = 'La lecture du dressing attend votre accord. Touchez « Relire le dressing » et acceptez la demande.'
const DESACTIVE = 'La lecture du dressing est désactivée pour cette page. Réactivez OmniDash dans le menu Autorisations de l’artefact.'
const PANNES = {
  needs_reauth: ['copie', 'La connexion à OmniDash a expiré. Reconnectez OmniDash dans les réglages de claude.ai, rubrique Connecteurs, puis rechargez la page.'],
  server_not_connected: ['copie', 'Le connecteur OmniDash n’est pas ajouté à votre compte. Ajoutez-le dans les réglages de claude.ai, rubrique Connecteurs.'],
  server_not_found: ['copie', 'Le connecteur OmniDash n’existe plus. Ajoutez-le de nouveau dans les réglages de claude.ai, rubrique Connecteurs.'],
  selection_required: ['copie', 'Plusieurs connecteurs portent le nom OmniDash. Choisissez celui à utiliser dans claude.ai.'],
  absent: ['copie', INDISPONIBLE],
  capability_disabled: ['copie', INDISPONIBLE],
  capability_removed: ['copie', INDISPONIBLE],
  tool_error: ['copie', 'OmniDash a renvoyé une erreur en lisant le dressing. Réessayez plus tard.'],
  rate_limited: ['copie', 'Trop de lectures en peu de temps. Réessayez dans un moment.'],
  blocked_by_policy: ['refus', 'L’accès au connecteur OmniDash est bloqué par une règle de votre organisation.'],
  approval_required: ['refus', ACCORD],
  consent_required: ['refus', ACCORD],
  not_in_manifest: ['refus', DESACTIVE],
  not_granted: ['refus', DESACTIVE],
  user_changed: ['arret', 'Le compte connecté a changé. Rechargez la page.']
}
const PANNE_PASSAGERE = ['copie', 'OmniDash ne répond pas pour le moment. Réessayez dans quelques minutes.']

export function connectorFailure(code) {
  const [nature, message] = Object.hasOwn(PANNES, code) ? PANNES[code] : PANNE_PASSAGERE
  return { useCache: nature === 'copie', stop: nature === 'arret', message }
}

// Relecture automatique (retour sur l'onglet). Après une panne qui demande
// une action de la personne (reconnexion, ajout, choix, accord, réglage), seul
// le bouton « Relire le dressing » relance la lecture.
const ACTION_REQUISE = new Set([
  'needs_reauth', 'server_not_connected', 'selection_required', 'server_not_found',
  'approval_required', 'consent_required', 'not_in_manifest', 'not_granted', 'blocked_by_policy',
  'user_changed', 'absent', 'capability_disabled', 'capability_removed'
])

export function autoRefresh(lastCode) {
  return !ACTION_REQUISE.has(lastCode)
}

const PROFIL = [
  'Profil : 1,90 m, 80 à 85 kg. Coupes droites ou légèrement amples. Matières naturelles de préférence. Pas de finitions côtelées sur un blouson.',
  'Couleurs : tons terre et noir à parts égales.',
  'Le vert n’est pas une couleur préférée : ne le mets pas en avant et ne choisis jamais une pièce parce qu’elle est verte. Si du vert apparaît malgré tout, il doit être sombre et éteint, jamais vif.'
].join('\n')

// Les liens ne partent jamais vers Claude.
function lignesPieces(pieces) {
  return pieces
    .map(({ id, nom, categorie, sousCategorie, couleur, marque, style, quantite }) =>
      JSON.stringify({ id, nom, categorie, sousCategorie, couleur, marque, style, quantite }))
    .join('\n')
}

export function buildOutfitPrompt(pieces, occasion, meteo) {
  return [
    'Compose une tenue pour aujourd’hui avec les pièces de la liste ci-dessous, et seulement celles-ci.',
    `Occasion : ${occasion}. Météo : ${meteo}.`,
    PROFIL,
    'Règles : un bas au plus et une paire de chaussures au plus ; plusieurs hauts ou vestes possibles en superposition ; tenue adaptée à l’occasion et à la météo ; chaque identifiant une seule fois.',
    'Réponds uniquement avec un objet JSON, sans texte avant ou après et sans bloc de code, de cette forme :',
    '{"pieces":[{"id":"identifiant de la liste","raison":"rôle de la pièce dans la tenue, en une phrase"}],"resume":"l’ensemble en deux phrases au plus"}',
    'Pièces disponibles, une par ligne :',
    lignesPieces(pieces)
  ].join('\n')
}

const associesMin = (wardrobe) => Math.min(2, wardrobe.length)

export function buildManquesPrompt(pieces) {
  const nombre = associesMin(pieces) === 2 ? '2 ou 3' : 'de 1 à 3'
  return [
    'Analyse le dressing ci-dessous et indique de 5 à 7 pièces qui y manquent pour mieux l’utiliser.',
    PROFIL,
    `Pour chaque pièce : piece (nom court), coupe, matiere, couleur, repli (une solution plus simple ou moins chère), associer (${nombre} identifiants de pièces du dressing à porter avec).`,
    'Réponds uniquement avec un objet JSON, sans texte avant ou après et sans bloc de code, de cette forme :',
    '{"manques":[{"piece":"...","coupe":"...","matiere":"...","couleur":"...","repli":"...","associer":["identifiant","identifiant"]}]}',
    'Dressing, une pièce par ligne :',
    lignesPieces(pieces)
  ].join('\n')
}

const CHAMPS_MANQUE = ['piece', 'coupe', 'matiere', 'couleur', 'repli']
const texteRempli = (valeur) => typeof valeur === 'string' && valeur.trim() !== ''

export function parseManques(text, wardrobe) {
  const liste = lireJson(text)?.manques
  if (!Array.isArray(liste)) return refus('La réponse n’est pas au format JSON demandé.')
  if (liste.length < 5 || liste.length > 7) return refus('L’analyse doit compter de 5 à 7 pièces.')

  const parId = new Map(wardrobe.map((x) => [x.id, x]))
  const min = associesMin(wardrobe)
  const items = []

  for (const element of liste) {
    if (element === null || typeof element !== 'object') return refus('Un élément de l’analyse est mal formé.')
    if (!CHAMPS_MANQUE.every((champ) => texteRempli(element[champ]))) return refus('Un élément de l’analyse a un champ vide ou mal formé.')
    const ids = element.associer
    if (!Array.isArray(ids) || ids.length < min || ids.length > 3) return refus(`Chaque pièce doit citer de ${min} à 3 pièces du dressing.`)
    if (new Set(ids).size !== ids.length) return refus('Une pièce cite deux fois la même pièce du dressing.')
    const associer = ids.map((id) => parId.get(id))
    if (associer.some((x) => !x)) return refus('L’analyse cite une pièce qui n’est pas dans le dressing.')
    items.push({ ...Object.fromEntries(CHAMPS_MANQUE.map((champ) => [champ, element[champ]])), associer })
  }
  return { ok: true, items }
}

export function askManques(ask, prompt, wardrobe) {
  return avecRelance(ask, prompt, (texte) => parseManques(texte, wardrobe))
}

export function manquesForStorage(items) {
  return items.map((x) => ({ ...x, associer: x.associer.map((piece) => piece.id) }))
}

// Relecture de la dernière analyse : le dressing a pu changer depuis, donc
// les pièces disparues sont retirées sans refuser l'analyse entière.
export function storedManques(data, wardrobe) {
  if (data === null || typeof data !== 'object' || typeof data.date !== 'string' || !Array.isArray(data.items)) return null
  const parId = new Map(wardrobe.map((x) => [x.id, x]))
  const items = data.items
    .filter((x) => x !== null && typeof x === 'object' && CHAMPS_MANQUE.every((champ) => typeof x[champ] === 'string'))
    .map((x) => ({
      ...Object.fromEntries(CHAMPS_MANQUE.map((champ) => [champ, x[champ]])),
      associer: (Array.isArray(x.associer) ? x.associer : []).map((id) => parId.get(id)).filter(Boolean)
    }))
  return { date: data.date, items }
}

const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/
const textes = (valeur) => (Array.isArray(valeur) ? valeur.filter((x) => typeof x === 'string') : [])

// docs : [{ id, data }], un document par date.
export function historyFromDocs(docs) {
  const history = {}
  if (!Array.isArray(docs)) return history
  for (const doc of docs) {
    const data = doc?.data
    if (typeof doc?.id !== 'string' || !DATE_ISO.test(doc.id)) continue
    if (data === null || typeof data !== 'object' || !Array.isArray(data.ids)) continue
    history[doc.id] = {
      ids: textes(data.ids),
      noms: textes(data.noms),
      occasion: texteOuVide(data.occasion),
      meteo: texteOuVide(data.meteo),
      resume: texteOuVide(data.resume)
    }
  }
  return history
}

export function historyRows(history) {
  return Object.keys(history).sort().reverse().map((date) => ({ date, ...history[date] }))
}

export function makeEntry(result, occasion, meteo) {
  return {
    ids: result.cards.map((x) => x.piece.id),
    noms: result.cards.map((x) => x.piece.nom),
    occasion,
    meteo,
    resume: result.resume
  }
}

export function repeatNotes(cards, repeats) {
  const repetees = new Set(repeats)
  return cards
    .filter((x) => repetees.has(x.piece.id))
    .map(({ piece }) => ({ piece, message: `Portée hier : aucun autre ${piece.categorie} n’est disponible dans le dressing.` }))
}
