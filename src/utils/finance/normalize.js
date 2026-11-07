// Nettoyage des libellés bancaires.
// basicNormalize garde tout le texte (utile pour reconnaître un virement ou un prélèvement),
// normalizeLabel retire le bruit (préfixes, dates, numéros de carte) pour les règles et les abonnements.

export const stripAccents = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')

// Majuscules, sans accents, ponctuation remplacée par des espaces
export const basicNormalize = (raw) =>
  stripAccents(raw)
    .toUpperCase()
    .replace(/[  ]/g, ' ')
    .replace(/[^A-Z0-9&]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

// Préfixes d'opération, du plus long au plus court
const PREFIXES = [
  'PAIEMENT PAR CARTE', 'PAIEMENT CARTE', 'PAIEMENT CB', 'ACHAT CB', 'ACHAT CARTE', 'CARTE BANCAIRE',
  'PRELEVEMENT SEPA', 'PRELEVEMENT EUROPEEN', 'PRELEVEMENT', 'PRLV SEPA', 'PRLV EUROPEEN', 'PRLV',
  'VIREMENT SEPA RECU', 'VIREMENT SEPA EMIS', 'VIREMENT SEPA', 'VIREMENT INSTANTANE RECU', 'VIREMENT INSTANTANE EMIS',
  'VIREMENT INSTANTANE', 'VIREMENT RECU', 'VIREMENT EMIS', 'VIREMENT',
  'VIR SEPA RECU', 'VIR SEPA EMIS', 'VIR SEPA', 'VIR INST RECU', 'VIR INST EMIS', 'VIR INST RE', 'VIR INST',
  'VIR RECU', 'VIR EMIS', 'VIR',
  'RETRAIT DAB', 'RETRAIT',
  'CB', 'CARTE', 'FACT', 'FACTURE', 'DE', 'POUR', 'RECU', 'EMIS', 'SEPA',
]

// Jeton qui ressemble à une date collée (1211, 121124) ou à un jour/mois valide
const isDateToken = (t) => {
  if (/^\d{4}$/.test(t)) {
    const d = +t.slice(0, 2)
    const m = +t.slice(2, 4)
    return d >= 1 && d <= 31 && m >= 1 && m <= 12
  }
  if (/^\d{6}$/.test(t) || /^\d{8}$/.test(t)) {
    const d = +t.slice(0, 2)
    const m = +t.slice(2, 4)
    return d >= 1 && d <= 31 && m >= 1 && m <= 12
  }
  return false
}

export function normalizeLabel(raw) {
  let s = stripAccents(raw).toUpperCase().replace(/[  ]/g, ' ')
  // Dates écrites 12/11, 12/11/24, 12.11.2024
  s = s.replace(/\b\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?\b/g, ' ')
  // Heures 12H30, 12:30
  s = s.replace(/\b\d{1,2}[H:]\d{2}\b/g, ' ')
  s = s.replace(/[^A-Z0-9&]+/g, ' ').replace(/\s+/g, ' ').trim()

  let tokens = s.split(' ').filter(Boolean)
  tokens = tokens.filter((t) =>
    !/^X+\d{3,4}$/.test(t) && // numéro de carte masqué
    !isDateToken(t) &&
    !/^\d{5,}$/.test(t) && // références longues
    !/^(?=.*\d)[A-Z0-9]{10,}$/.test(t) // identifiants de mandat ou de transaction
  )
  s = tokens.join(' ')

  // Préfixes répétés en tête (CB, PRLV SEPA, VIR INST...)
  let changed = true
  while (changed && s) {
    changed = false
    for (const p of PREFIXES) {
      if (s === p) break
      if (s.startsWith(p + ' ')) {
        s = s.slice(p.length + 1).trim()
        changed = true
        break
      }
    }
  }
  // Mentions de fin sans intérêt (FACT 121124 devient FACT une fois la date retirée)
  s = s.replace(/(?: (?:FACT|FACTURE|CARTE|CB|DU|LE))+$/, '').trim()
  return s || basicNormalize(raw)
}

// Sigles laissés en majuscules à l'affichage
const ACRONYMS = new Set([
  'SNCF', 'RATP', 'SFR', 'EDF', 'GDF', 'CAF', 'CPAM', 'URSSAF', 'TGV', 'TER', 'BNP', 'LCL', 'PEA', 'LDDS', 'LEP',
  'DAB', 'SA', 'SAS', 'SARL', 'UK', 'FR', 'TV', 'H&M', 'KFC', 'IKEA', 'DGFIP', 'MAIF', 'MACIF', 'MMA', 'AXA', 'GMF',
  'BHV', 'IBIS', 'BP', 'TAG', 'TCL', 'RTM', 'SAQ', 'OVH', 'MSA', 'PMU', 'FDJ', 'UGC', 'CGR', 'NRJ',
])

// Libellé lisible, casse titre
export function displayLabel(raw) {
  const norm = normalizeLabel(raw)
  return norm
    .split(' ')
    .map((w) => {
      if (ACRONYMS.has(w)) return w
      if (/\d/.test(w)) return w
      if (w.length <= 4 && !/[AEIOUY]/.test(w)) return w
      return w.charAt(0) + w.slice(1).toLowerCase()
    })
    .join(' ')
}

// Texte complet pour la recherche de mots-clés : libellé brut et détail
export const searchText = (raw, detail = '') => basicNormalize(`${raw ?? ''} ${detail ?? ''}`)

// Le mot-clé apparaît comme mot entier (ou suite de mots) dans le texte
export function containsWords(text, keyword) {
  const k = basicNormalize(keyword)
  if (!k) return false
  return ` ${text} `.includes(` ${k} `)
}
