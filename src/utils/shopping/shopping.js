// Logique de la liste d'achats, sans dépendance à Vue ni à Supabase.

export const CATEGORIES = [
  { id: 'vetements', label: 'Vêtements' },
  { id: 'cheveux', label: 'Cheveux' },
  { id: 'visage', label: 'Visage' },
  { id: 'corps', label: 'Corps' },
  { id: 'dents', label: 'Dents' },
  { id: 'sante', label: 'Santé et confort' },
  { id: 'parfums', label: 'Parfums' },
]

export const TIERS = {
  invest: 'Investir',
  mid: 'Milieu de gamme',
  basic: 'Basique',
}

export const MEASURES = [
  { key: 'chest', label: 'Tour de poitrine', how: 'Au plus large, sous les aisselles, sans serrer.' },
  { key: 'shoulders', label: 'Largeur d’épaules', how: 'D’un bout d’épaule à l’autre, dans le dos.' },
  { key: 'arm', label: 'Longueur de bras', how: 'De la pointe de l’épaule à l’os du poignet.' },
  { key: 'waist', label: 'Tour de taille', how: 'Là où tu portes tes pantalons.' },
  { key: 'hips', label: 'Tour de hanches', how: 'Au plus large, au niveau des fesses.' },
  { key: 'thigh', label: 'Tour de cuisse', how: 'Au plus large.' },
  { key: 'inseam', label: 'Entrejambe', how: 'De l’entrejambe à la cheville, à l’intérieur de la jambe.' },
  { key: 'footL', label: 'Pied gauche', how: 'Longueur, debout, en fin de journée.' },
  { key: 'footR', label: 'Pied droit', how: 'Pour les chaussures, garde le plus long.' },
  { key: 'hand', label: 'Tour de main', how: 'Autour de la paume, sans le pouce.' },
  { key: 'belt', label: 'Ceinture actuelle', how: 'De la base de la boucle au trou utilisé.' },
]

const byPosition = (a, b) =>
  (a.position ?? 0) - (b.position ?? 0) || String(a.name).localeCompare(String(b.name), 'fr')

// Les catégories connues restent toujours visibles ; une catégorie inconnue est ajoutée à la fin.
export const categoriesFor = (items) => {
  const known = new Set(CATEGORIES.map((c) => c.id))
  const extra = [...new Set(items.map((i) => i.category).filter((id) => id && !known.has(id)))]
  return [...CATEGORIES, ...extra.map((id) => ({ id, label: id }))]
}

export const filterItems = (items, { category = 'all', onlyTodo = false, tiers = [] } = {}) =>
  items.filter((item) =>
    (category === 'all' || item.category === category) &&
    (!onlyTodo || !item.done) &&
    (tiers.length === 0 || tiers.includes(item.tier)))

// Sous-sections dans l'ordre de leur première pièce.
export const groupItems = (items) => {
  const groups = new Map()
  for (const item of [...items].sort(byPosition)) {
    const name = item.group_name || 'Divers'
    if (!groups.has(name)) groups.set(name, [])
    groups.get(name).push(item)
  }
  return [...groups].map(([name, list]) => ({ name, items: list, remaining: list.filter((i) => !i.done).length }))
}

export const progress = (items) => {
  const total = items.length
  const done = items.filter((i) => i.done).length
  return { total, done, remaining: total - done, ratio: total ? done / total : 0 }
}

// Ligne résumée sous le nom d'une pièce.
export const itemSummary = (item) => [
  item.qty ? `Quantité : ${item.qty}` : null,
  item.tier && item.tier !== 'invest' ? TIERS[item.tier] : null,
  item.price,
  item.options?.some((o) => o.pick) ? 'Choix retenu' : null,
  item.wardrobe_added_at ? 'Dans le dressing' : null,
].filter(Boolean).join(', ')

export const nextPosition = (items) => items.reduce((max, i) => Math.max(max, i.position ?? 0), 0) + 10

export const safeUrl = (url) => (typeof url === 'string' && /^https:\/\//i.test(url.trim()) ? url.trim() : null)

export const parseMeasure = (value) => {
  if (value === '' || value === null || value === undefined) return null
  const n = Number(String(value).replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}

// La mesure s'arrête à la cheville : l'ourlet doit descendre de quelques centimètres de plus.
export const inseamAdvice = (inseam) => {
  const v = parseMeasure(inseam)
  if (v === null || v < 60 || v > 110) return null
  return { min: v + 3, max: v + 5, length: Math.round((v + 4) / 2.54) }
}

/* ── Passage au Dressing ── */

const BRANDS = [
  'Massimo Dutti', 'Father & Sons', 'La Roche-Posay', "Levi's", 'Suitsupply', 'Zara',
  'Uniqlo', 'Arket', 'COS', 'Meermin', 'Veja',
]

export const brandFromLabel = (label = '') =>
  BRANDS.find((b) => label.toLowerCase().startsWith(b.toLowerCase())) || ''

const WARDROBE_GROUPS = {
  'manteau et vestes': 'veste',
  hauts: 'haut',
  bas: 'bas',
  chaussures: 'chaussures',
  accessoires: 'accessoire',
}

export const wardrobeCategory = (item) => {
  const byGroup = WARDROBE_GROUPS[String(item.group_name || '').toLowerCase()]
  if (byGroup) return byGroup
  const name = String(item.name || '').toLowerCase()
  if (/doudoune|veste|blouson|manteau/.test(name)) return 'veste'
  if (/sous-couche|pull|chemise|polo|t-shirt/.test(name)) return 'haut'
  if (/pantalon|jean|chino|short/.test(name)) return 'bas'
  if (/chaussure|boots|sneaker|loafer|mocassin/.test(name)) return 'chaussures'
  return 'accessoire'
}

export const canGoToWardrobe = (item) => item.category === 'vetements' && !item.wardrobe_added_at

// « 2 », « 1 à 2 », « 6 paires » : on retient le premier nombre.
export const quantityFrom = (qty) => {
  const match = String(qty || '').match(/\d+/)
  return match ? Math.max(1, Number(match[0])) : 1
}

export const wardrobeDraft = (item, option = null) => ({
  name: item.name,
  category: wardrobeCategory(item),
  color: '',
  brand: option ? brandFromLabel(option.label) : '',
  quantity: quantityFrom(item.qty),
  link: safeUrl(option?.url) || '',
})
