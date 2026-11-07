// Historique des dépenses sur plusieurs périodes budgétaires et comparaison à date égale.

import { spentByCategory } from './budgets.js'
import { addDays, diffDays, fromDay, previousPeriods, toDay } from './period.js'

const round2 = (n) => Math.round(n * 100) / 100

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

// Couleurs des quatre premières séries, puis « Autres »
export const SERIES_COLORS = ['--module-finance', '--module-windows', '--module-muscu', '--module-sleep']
export const OTHER_COLOR = '--border-default'
export const OTHER_ID = 'autres'

// Mois qui porte la période : celui du milieu (28 oct. au 27 nov. donne novembre)
const monthOf = (period) => {
  const span = Math.max(0, diffDays(period.start, period.end))
  return fromDay(addDays(period.start, Math.floor(span / 2))).getMonth()
}

// Les count dernières périodes, de la plus ancienne à la période en cours
export function lastPeriods(period, count = 6) {
  const before = previousPeriods(period, count - 1).reverse()
  return [...before.map(({ start, end }) => ({ start, end })), { start: period.start, end: period.end }]
}

// periods : la plus récente est la période en cours.
// Les périodes antérieures à la première opération connue sont écartées.
export function spendingHistory(transactions = [], categories = [], periods = []) {
  const sorted = [...periods].sort((a, b) => (a.start < b.start ? -1 : 1))
  const firstDay = transactions.reduce((m, t) => (!m || t.date < m ? t.date : m), null)
  const kept = firstDay ? sorted.filter((p) => p.end >= firstDay) : []
  const known = new Set(categories.filter((c) => !c.archived).map((c) => c.id))

  // Dépense nette par catégorie et par période
  const perPeriod = kept.map((p) => {
    const map = new Map()
    for (const [id, v] of spentByCategory(transactions, p)) {
      const key = id && known.has(id) ? id : OTHER_ID
      map.set(key, (map.get(key) || 0) + v)
    }
    for (const [k, v] of map) map.set(k, Math.max(0, v))
    return map
  })

  // Quatre catégories les plus dépensières sur l'ensemble, le reste dans « Autres »
  const sums = new Map()
  for (const map of perPeriod) {
    for (const [k, v] of map) if (k !== OTHER_ID) sums.set(k, (sums.get(k) || 0) + v)
  }
  const top = [...sums.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k]) => k)
  const topSet = new Set(top)

  const months = kept.map((p, index) => {
    const byCategory = {}
    for (const id of top) byCategory[id] = 0
    let others = 0
    for (const [k, v] of perPeriod[index]) {
      if (topSet.has(k)) byCategory[k] = round2(byCategory[k] + v)
      else others += v
    }
    byCategory[OTHER_ID] = round2(others)
    const total = round2(Object.values(byCategory).reduce((s, v) => s + v, 0))
    const m = monthOf(p)
    return {
      key: p.start,
      label: MONTHS_SHORT[m],
      name: MONTHS[m],
      start: p.start,
      end: p.end,
      current: index === kept.length - 1,
      total,
      byCategory,
    }
  })

  const series = top.map((id, i) => ({
    id,
    name: categories.find((c) => c.id === id)?.name ?? 'Sans nom',
    colorToken: SERIES_COLORS[i],
  }))
  if (months.some((m) => m.byCategory[OTHER_ID] > 0)) {
    series.push({ id: OTHER_ID, name: 'Autres', colorToken: OTHER_COLOR })
  }

  // Moyenne des mois complets, hors mois en cours
  const complete = months.filter((m) => !m.current)
  const average = complete.length ? round2(complete.reduce((s, m) => s + m.total, 0) / complete.length) : null

  return { months, series, average }
}

// Dépense de la période en cours jusqu'à aujourd'hui face à la précédente au même nombre de jours.
// Écarts de moins d'un euro ignorés ; quatre plus gros écarts.
export function compareToPrevious(transactions = [], categories = [], period, previousPeriod, today = new Date()) {
  if (!period || !previousPeriod) return []
  const todayDay = typeof today === 'string' ? today : toDay(today)
  const end = todayDay < period.end ? todayDay : period.end
  if (end < period.start) return []
  const elapsed = diffDays(period.start, end)
  const prevEndCandidate = addDays(previousPeriod.start, elapsed)
  const prevEnd = prevEndCandidate < previousPeriod.end ? prevEndCandidate : previousPeriod.end

  const current = spentByCategory(transactions, { start: period.start, end })
  const previous = spentByCategory(transactions, { start: previousPeriod.start, end: prevEnd })

  return categories
    .filter((c) => !c.archived)
    .map((category) => {
      const cur = Math.max(0, current.get(category.id) || 0)
      const prev = Math.max(0, previous.get(category.id) || 0)
      return { category, current: round2(cur), previous: round2(prev), delta: round2(cur - prev) }
    })
    .filter((row) => Math.abs(row.delta) >= 1)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 4)
}
