// Classement des opérations : nature (kind) puis catégorie.
// Ordre de confiance : règle de l'utilisateur, puis dictionnaire, puis IA. Sous le seuil, l'opération passe « à vérifier ».

import { basicNormalize, containsWords, normalizeLabel, searchText, stripAccents } from './normalize.js'

export const DEFAULT_CATEGORIES = [
  'Courses', 'Restaurants', 'Transport', 'Logement', 'Sorties', 'Shopping',
  'Santé', 'Sport', 'Abonnements', 'Voyages', 'Divers',
]

export const CONFIDENCE = { rule: 1, dictionary: 0.85, kind: 0.9, bank: 0.6, threshold: 0.7 }

// Mots-clés par catégorie, comparés mot à mot sur le libellé sans accents
export const KEYWORDS = {
  Courses: [
    'CARREFOUR', 'CARREFOUR MARKET', 'CARREFOUR CITY', 'CRF', 'LECLERC', 'E LECLERC', 'AUCHAN', 'INTERMARCHE', 'ITM',
    'SUPER U', 'HYPER U', 'U EXPRESS', 'MARCHE U', 'SYSTEME U', 'MONOPRIX', 'MONOP', 'FRANPRIX', 'CASINO', 'GEANT CASINO',
    'LIDL', 'ALDI', 'NETTO', 'LEADER PRICE', 'CORA', 'MATCH', 'SPAR', 'VIVAL', 'PICARD', 'GRAND FRAIS', 'NATURALIA',
    'BIOCOOP', 'LA VIE CLAIRE', 'G20', 'PROXI', 'COCCINELLE', 'COLRUYT', 'DIA', 'AMAZON FRESH', 'LA GRANDE EPICERIE',
    'BOULANGERIE', 'BOUCHERIE', 'PRIMEUR', 'FROMAGERIE', 'EPICERIE', 'MARIE BLACHERE', 'PAUL',
  ],
  Restaurants: [
    'MCDONALDS', 'MC DONALDS', 'MCDO', 'BURGER KING', 'KFC', 'QUICK', 'SUBWAY', 'FIVE GUYS', 'O TACOS', 'DOMINOS',
    'PIZZA HUT', 'PIZZA', 'SUSHI', 'SUSHI SHOP', 'PLANET SUSHI', 'STARBUCKS', 'COLUMBUS', 'PRET A MANGER', 'EXKI',
    'BAGELSTEIN', 'POKAWA', 'BIG FERNAND', 'BRIOCHE DOREE', 'LA CROISSANTERIE', 'FLUNCH', 'BUFFALO GRILL',
    'HIPPOPOTAMUS', 'LEON DE BRUXELLES', 'COURTEPAILLE', 'DELIVEROO', 'UBER EATS', 'UBEREATS', 'JUST EAT', 'RESTAURANT', 'RESTO',
    'BRASSERIE', 'BISTROT', 'CAFE', 'CAFETERIA', 'TRAITEUR', 'KEBAB', 'BURGER', 'CREPERIE', 'SNACK', 'CROUS',
  ],
  Transport: [
    'SNCF', 'SNCF CONNECT', 'OUIGO', 'TGV', 'TER', 'RATP', 'NAVIGO', 'TRANSILIEN', 'UBER', 'BOLT', 'HEETCH', 'G7',
    'FREENOW', 'FREE NOW', 'BLABLACAR', 'LIME', 'DOTT', 'VELIB', 'TOTAL', 'TOTALENERGIES', 'ESSO', 'SHELL',
    'BP', 'AVIA', 'STATION', 'CARBURANT', 'PEAGE', 'VINCI AUTOROUTES', 'SANEF', 'APRR', 'ASF', 'AUTOROUTE', 'PARKING',
    'INDIGO', 'SAEMES', 'ONEPARK', 'TCL', 'RTM', 'TISSEO', 'TBM', 'ILEVIA', 'FLIXBUS', 'TRAINLINE',
  ],
  Logement: [
    'LOYER', 'LOYERS', 'FONCIA', 'NEXITY', 'CITYA', 'ORPI', 'SYNDIC', 'EDF', 'ENGIE', 'TOTALENERGIES ELEC',
    'ENI', 'EKWATEUR', 'OHM ENERGIE', 'GDF', 'VEOLIA', 'EAU DE PARIS', 'SUEZ', 'SAUR', 'ASSURANCE HABITATION',
    'TAXE FONCIERE', 'TAXE HABITATION', 'LEROY MERLIN', 'CASTORAMA', 'BRICORAMA', 'BRICO DEPOT', 'MR BRICOLAGE', 'IKEA',
    'CONFORAMA', 'MAISONS DU MONDE',
  ],
  Sorties: [
    'UGC', 'PATHE', 'GAUMONT', 'MK2', 'CGR', 'CINEMA', 'FNAC SPECTACLES', 'TICKETMASTER', 'DICE', 'SHOTGUN', 'BILLETREDUC',
    'THEATRE', 'CONCERT', 'MUSEE', 'BAR', 'PUB', 'CLUB', 'BOWLING', 'ESCAPE', 'KARAOKE', 'PMU', 'FDJ', 'LE PERCOLATEUR',
  ],
  Shopping: [
    'AMAZON', 'AMZN', 'AMAZON PAYMENTS', 'FNAC', 'DARTY', 'BOULANGER', 'CDISCOUNT', 'ZARA', 'H&M', 'H M', 'UNIQLO',
    'PRIMARK', 'KIABI', 'CELIO', 'JULES', 'BERSHKA', 'PULL&BEAR', 'PULL BEAR', 'MANGO', 'ZALANDO', 'VINTED', 'SHEIN',
    'ASOS', 'NIKE', 'ADIDAS', 'SEPHORA', 'NOCIBE', 'MARIONNAUD', 'ACTION', 'GIFI', 'HEMA', 'ALIEXPRESS', 'TEMU',
    'APPLE STORE', 'LEBONCOIN', 'GALERIES LAFAYETTE', 'PRINTEMPS', 'BHV', 'NATURE & DECOUVERTES', 'CULTURA', 'RAKUTEN',
  ],
  'Santé': [
    'PHARMACIE', 'PHARMA', 'PARAPHARMACIE', 'MEDECIN', 'DOCTEUR', 'DOCTOLIB', 'DENTISTE', 'CABINET DENTAIRE',
    'KINE', 'KINESITHERAPEUTE', 'OSTEOPATHE', 'OSTEO', 'OPTICIEN', 'OPTIC', 'AFFLELOU', 'KRYS', 'ATOL', 'GRANDOPTICAL',
    'LABORATOIRE', 'LABO', 'BIOGROUP', 'CERBALLIANCE', 'HOPITAL', 'CLINIQUE', 'MUTUELLE', 'ALAN', 'PSYCHOLOGUE',
  ],
  Sport: [
    'DECATHLON', 'GO SPORT', 'INTERSPORT', 'SPORT 2000', 'BASIC FIT', 'BASICFIT', 'FITNESS PARK', 'ON AIR', 'NEONESS',
    'KEEP COOL', 'L ORANGE BLEUE', 'CMG', 'CLUB MED GYM', 'UCPA', 'URBAN SOCCER', 'LE FIVE', 'PISCINE', 'CLIMBING',
    'ARKOSE', 'STRAVA', 'MYPROTEIN', 'NUTRIMUSCLE', 'FOOTBALL', 'TENNIS', 'PADEL',
  ],
  Abonnements: [
    'NETFLIX', 'SPOTIFY', 'DEEZER', 'DISNEY', 'DISNEY PLUS', 'CANAL', 'CANAL+', 'MOLOTOV', 'PRIME VIDEO', 'AMAZON PRIME',
    'YOUTUBE', 'YOUTUBE PREMIUM', 'GOOGLE STORAGE', 'GOOGLE ONE', 'APPLE COM BILL', 'APPLE COM', 'ITUNES', 'ICLOUD',
    'MICROSOFT', 'XBOX', 'PLAYSTATION', 'PSN', 'NINTENDO', 'ADOBE', 'CHATGPT', 'OPENAI', 'ANTHROPIC', 'NOTION', 'DROPBOX',
    'FREE MOBILE', 'FREE TELECOM', 'FREE', 'SFR', 'ORANGE', 'BOUYGUES', 'BOUYGUES TELECOM', 'SOSH', 'RED BY SFR',
    'B&YOU', 'LA POSTE MOBILE', 'PRIXTEL', 'SYMA', 'OVH', 'AUDIBLE', 'KINDLE', 'LE MONDE', 'MEDIAPART', 'LEQUIPE',
    'TWITCH', 'PATREON', 'CRUNCHYROLL', 'PARAMOUNT', 'HBO MAX', 'DAZN', 'BEIN',
  ],
  Voyages: [
    'AIRBNB', 'BOOKING', 'BOOKING COM', 'HOTELS COM', 'EXPEDIA', 'ABRITEL', 'HOTEL', 'IBIS', 'NOVOTEL', 'MERCURE',
    'ACCOR', 'B&B HOTEL', 'CAMPANILE', 'AIR FRANCE', 'EASYJET', 'RYANAIR', 'TRANSAVIA', 'VUELING', 'VOLOTEA',
    'LUFTHANSA', 'KLM', 'AEROPORT', 'AIRPORT', 'EUROSTAR', 'HERTZ', 'AVIS', 'EUROPCAR', 'SIXT', 'GETAROUND', 'OPODO',
    'LASTMINUTE', 'CLUB MED', 'PIERRE ET VACANCES', 'CENTER PARCS',
  ],
  Divers: [
    'RETRAIT', 'RETRAIT DAB', 'DAB', 'FRAIS', 'COTISATION', 'COMMISSION', 'AGIOS', 'DGFIP', 'IMPOT', 'IMPOTS',
    'AMENDE', 'ANTAI', 'LA POSTE', 'COIFFEUR', 'PRESSING', 'TABAC',
  ],
}

// Index plat trié par longueur décroissante : le mot-clé le plus précis gagne (UBER EATS avant UBER)
const KEYWORD_INDEX = Object.entries(KEYWORDS)
  .flatMap(([category, words]) => words.map((w) => ({ category, keyword: basicNormalize(w) })))
  .filter((k) => k.keyword)
  .sort((a, b) => b.keyword.length - a.keyword.length)

// Catégories de la banque (colonne Catégorie du CSV) vers les nôtres, en dernier recours
const BANK_CATEGORY_HINTS = [
  ['ALIMENTATION', 'Courses'], ['SUPERMARCHE', 'Courses'], ['RESTAURANT', 'Restaurants'], ['TRANSPORT', 'Transport'],
  ['CARBURANT', 'Transport'], ['VEHICULE', 'Transport'], ['LOGEMENT', 'Logement'], ['ENERGIE', 'Logement'],
  ['LOISIRS', 'Sorties'], ['SORTIE', 'Sorties'], ['SHOPPING', 'Shopping'], ['HABILLEMENT', 'Shopping'],
  ['SANTE', 'Santé'], ['SPORT', 'Sport'], ['TELECOM', 'Abonnements'], ['ABONNEMENT', 'Abonnements'],
  ['MULTIMEDIA', 'Abonnements'], ['VOYAGE', 'Voyages'], ['VACANCES', 'Voyages'], ['BANQUE', 'Divers'],
]

export function matchKeyword(text) {
  for (const k of KEYWORD_INDEX) {
    if (containsWords(text, k.keyword)) return k
  }
  return null
}

// ── Nature de l'opération ──

const SAVINGS_WORDS = [
  'PEA', 'LIVRET', 'LIVRET A', 'LDDS', 'LDD', 'LEP', 'PEL', 'EPARGNE', 'ASSURANCE VIE', 'COMPTE TITRES',
  'BOURSE DIRECT', 'BOURSORAMA BANQUE', 'DEGIRO', 'TRADE REPUBLIC', 'FORTUNEO', 'SAXO', 'INTERACTIVE BROKERS', 'IBKR',
  'LINXEA', 'YOMONI', 'NALO', 'RAMIFY', 'GOODVEST', 'SCALABLE', 'ETORO', 'BITSTACK', 'BITPANDA', 'COINBASE',
]
const INTERNAL_WORDS = [
  'VIREMENT INTERNE', 'VIR INTERNE', 'MOI MEME', 'ENTRE COMPTES', 'ENTRE MES COMPTES', 'COMPTE JOINT', 'VERS CPT',
  'VERS COMPTE', 'DE CPT', 'COMPTE COURANT', 'ALIMENTATION COMPTE',
]
const P2P_WORDS = ['LYDIA', 'WERO', 'PAYLIB', 'PUMPKIN', 'PAYPAL', 'SUMERIA']
const COMPANY_WORDS = [
  'SAS', 'SARL', 'SA', 'EURL', 'SASU', 'SCI', 'CAF', 'CPAM', 'DGFIP', 'URSSAF', 'POLE EMPLOI', 'FRANCE TRAVAIL',
  'SALAIRE', 'PAIE', 'REMUNERATION', 'PRIME', 'MUTUELLE', 'ASSURANCE', 'BANQUE', 'REMBOURSEMENT', 'TRESOR PUBLIC',
]
const REFUND_MAX = 200

const isTransfer = (text) => ['VIR', 'VIREMENT', 'VIRT'].some((w) => containsWords(text, w))
const isDebitOrder = (text) => ['PRLV', 'PRELEVEMENT'].some((w) => containsWords(text, w))
const isInstantTransfer = (text) => containsWords(text, 'VIR INST') || containsWords(text, 'VIREMENT INSTANTANE')
const isCard = (text) => /^(CB|CARTE|PAIEMENT PAR CARTE|PAIEMENT CB|ACHAT CB)\b/.test(text)

// Le reste du libellé ressemble à un nom de personne (M JEAN DUPONT, MARIE MARTIN)
function looksLikePerson(label) {
  const words = label.split(' ').filter(Boolean)
  if (!words.length || words.length > 5) return false
  if (words.some((w) => /\d/.test(w))) return false
  if (COMPANY_WORDS.some((w) => containsWords(label, w))) return false
  if (/^(M|MR|MME|MLLE|MONSIEUR|MADAME)$/.test(words[0])) return true
  return words.length >= 2 && words.length <= 4
}

// Renvoie { kind, confidence } ; null si rien de particulier (dépense ou revenu standard)
export function detectKind(labelRaw, amount, detail = '') {
  const text = searchText(labelRaw, detail)
  const transfer = isTransfer(text)
  if ((transfer || isDebitOrder(text)) && SAVINGS_WORDS.some((w) => containsWords(text, w))) {
    return { kind: 'epargne', confidence: CONFIDENCE.kind }
  }
  if (transfer && INTERNAL_WORDS.some((w) => containsWords(text, w))) {
    return { kind: 'interne', confidence: CONFIDENCE.kind }
  }
  if (amount > 0) {
    if (isCard(text)) return { kind: 'depense', confidence: CONFIDENCE.kind } // avoir d'un commerçant
    const small = amount <= REFUND_MAX
    if (small && P2P_WORDS.some((w) => containsWords(text, w))) return { kind: 'remboursement', confidence: 0.5 }
    if (small && isInstantTransfer(text) && looksLikePerson(normalizeLabel(labelRaw))) {
      return { kind: 'remboursement', confidence: 0.5 }
    }
    return { kind: 'revenu', confidence: CONFIDENCE.kind }
  }
  return { kind: 'depense', confidence: null }
}

// ── Règles de l'utilisateur ──

export const rulePattern = (labelRaw) => normalizeLabel(labelRaw)

// La règle au motif le plus long qui figure dans le libellé normalisé
export function matchRule(labelRaw, rules = []) {
  const norm = normalizeLabel(labelRaw)
  let best = null
  for (const r of rules) {
    const p = String(r.pattern || '').toUpperCase().trim()
    if (!p) continue
    if (` ${norm} `.includes(` ${p} `) || norm.includes(p)) {
      if (!best || p.length > best.pattern.length) best = { ...r, pattern: p }
    }
  }
  return best
}

// ── Classement complet ──

const nameKey = (s) => stripAccents(s).toLowerCase().trim()

export function categoryIdByName(categories = []) {
  const map = new Map()
  for (const c of categories) if (!c.archived) map.set(nameKey(c.name), c.id)
  return (name) => (name ? map.get(nameKey(name)) ?? null : null)
}

// tx : { label_raw, amount, detail?, bank_category? }
// Renvoie { label, kind, category_id, status, source, confidence }
export function categorize(tx, { rules = [], categories = [] } = {}) {
  const idOf = categoryIdByName(categories)
  const label = normalizeLabel(tx.label_raw)
  const base = { label, kind: 'depense', category_id: null, status: 'verifier', source: null, confidence: 0 }

  const rule = matchRule(tx.label_raw, rules)
  if (rule) {
    const kind = rule.kind || detectKind(tx.label_raw, tx.amount, tx.detail).kind
    return { ...base, kind, category_id: rule.category_id ?? null, status: 'auto', source: 'regle', confidence: CONFIDENCE.rule }
  }

  const { kind, confidence: kindConfidence } = detectKind(tx.label_raw, tx.amount, tx.detail)
  if (kind === 'epargne' || kind === 'interne' || kind === 'revenu') {
    return { ...base, kind, status: 'auto', source: 'nature', confidence: kindConfidence }
  }
  if (kind === 'remboursement') {
    // À relier à la dépense d'origine
    return { ...base, kind, status: 'verifier', source: 'nature', confidence: kindConfidence }
  }

  const text = searchText(tx.label_raw, tx.detail)
  const hit = matchKeyword(text)
  if (hit && idOf(hit.category)) {
    return { ...base, kind, category_id: idOf(hit.category), status: 'auto', source: 'dictionnaire', confidence: CONFIDENCE.dictionary }
  }

  if (tx.bank_category) {
    const bank = basicNormalize(tx.bank_category)
    const hint = BANK_CATEGORY_HINTS.find(([w]) => bank.includes(w))
    if (hint && idOf(hint[1])) {
      return { ...base, kind, category_id: idOf(hint[1]), status: 'verifier', source: 'banque', confidence: CONFIDENCE.bank }
    }
  }
  return base
}

// Résultat de l'IA appliqué à une opération restée incertaine
export function applyAiResult(current, ai, categories = []) {
  if (!ai) return current
  const idOf = categoryIdByName(categories)
  const confidence = Math.max(0, Math.min(1, Number(ai.confidence) || 0)) * 0.9
  const categoryId = idOf(ai.category)
  const kinds = ['depense', 'revenu', 'epargne', 'interne']
  const kind = kinds.includes(ai.kind) ? ai.kind : current.kind
  if (confidence <= current.confidence) return current
  // Une dépense sans catégorie reste à vérifier
  const ok = confidence >= CONFIDENCE.threshold && (kind !== 'depense' || categoryId)
  return {
    ...current,
    kind,
    category_id: kind === 'depense' ? categoryId ?? current.category_id : null,
    status: ok ? 'auto' : 'verifier',
    source: 'ia',
    confidence,
  }
}
