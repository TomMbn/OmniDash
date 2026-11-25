// Logique des routines et habitudes, sans dépendance à Vue ni à Supabase.
// Un jour est une chaîne AAAA-MM-JJ au fuseau de l'appareil. Lundi vaut 1, dimanche 7.
import { localDay } from '../date.js'

export const WEEKDAYS = [
  { id: 1, short: 'L', label: 'Lundi' },
  { id: 2, short: 'M', label: 'Mardi' },
  { id: 3, short: 'M', label: 'Mercredi' },
  { id: 4, short: 'J', label: 'Jeudi' },
  { id: 5, short: 'V', label: 'Vendredi' },
  { id: 6, short: 'S', label: 'Samedi' },
  { id: 7, short: 'D', label: 'Dimanche' },
]

export const SECTIONS = [
  { id: 'matin', label: 'Matin', title: 'Routine du matin' },
  { id: 'soir', label: 'Soir', title: 'Routine du soir' },
  { id: 'habitude', label: 'Habitude', title: 'Habitudes' },
]

// Le shampooing se fait le soir : le « lendemain » est le matin qui suit.
export const CONDITIONS = [
  { id: 'toujours', label: 'Sans condition' },
  { id: 'lavage', label: 'Jours de shampooing' },
  { id: 'sans_lavage', label: 'Jours sans shampooing' },
  { id: 'lendemain', label: 'Lendemain d’un shampooing' },
  { id: 'autres_matins', label: 'Autres matins' },
]

export const DEFAULT_WASH_DAYS = [3, 7]

const toDate = (day) => {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const addDays = (day, n) => {
  const date = toDate(day)
  date.setDate(date.getDate() + n)
  return localDay(date)
}

export const weekdayOf = (day) => toDate(day).getDay() || 7

export const isWashDay = (day, washDays) => washDays.includes(weekdayOf(day))

const matchesCondition = (condition, day, washDays) => {
  switch (condition) {
    case 'lavage': return isWashDay(day, washDays)
    case 'sans_lavage': return !isWashDay(day, washDays)
    case 'lendemain': return isWashDay(addDays(day, -1), washDays)
    case 'autres_matins': return !isWashDay(addDays(day, -1), washDays)
    default: return true
  }
}

// Règle de fréquence seule, sans tenir compte des dates de début et de retrait.
export const matchesRule = (item, day, washDays) =>
  (!item.days?.length || item.days.includes(weekdayOf(day))) &&
  matchesCondition(item.condition, day, washDays)

// Une étape ne compte ni avant sa création ni après son retrait : l'historique reste juste.
export const isScheduled = (item, day, washDays) =>
  (!item.start_day || day >= item.start_day) &&
  (!item.archived_on || day < item.archived_on) &&
  matchesRule(item, day, washDays)

const byPosition = (a, b) => (a.position ?? 0) - (b.position ?? 0) || String(a.title).localeCompare(String(b.title), 'fr')

export const itemsForDay = (items, day, washDays) =>
  items.filter((item) => isScheduled(item, day, washDays)).sort(byPosition)

export const logKey = (itemId, day) => `${itemId}|${day}`

export const doneSet = (logs) => new Set(logs.map((log) => logKey(log.item_id, log.day)))

// Les étapes facultatives ne comptent ni dans l'avancement ni dans les séries.
export const statsFor = (list, done, day) => {
  const expected = list.filter((item) => !item.optional)
  const count = expected.filter((item) => done.has(logKey(item.id, day))).length
  return {
    total: expected.length,
    done: count,
    ratio: expected.length ? count / expected.length : 0,
    complete: expected.length > 0 && count === expected.length,
  }
}

export const dayStats = (items, done, day, washDays) => statsFor(itemsForDay(items, day, washDays), done, day)

// État d'un groupe d'étapes (une routine ou une habitude) sur un jour donné.
export const groupState = (group, done, day, washDays, today) => {
  const stats = dayStats(group, done, day, washDays)
  if (!stats.total) return 'off'
  if (stats.complete) return 'done'
  if (day >= today) return 'todo'
  return stats.done ? 'partial' : 'missed'
}

// Jours consécutifs réussis. Les jours sans rien de prévu sont ignorés,
// et la journée en cours ne casse pas la série tant qu'elle n'est pas finie.
export const streak = (group, done, today, washDays, horizon = 400) => {
  let count = 0
  for (let i = 0; i < horizon; i += 1) {
    const day = addDays(today, -i)
    const state = groupState(group, done, day, washDays, today)
    if (state === 'done') count += 1
    else if (state === 'missed' || state === 'partial') break
  }
  return count
}

export const history = (group, done, today, washDays, length = 14) =>
  Array.from({ length }, (_, i) => {
    const day = addDays(today, i - length + 1)
    return { day, state: groupState(group, done, day, washDays, today) }
  })

// Part des jours prévus qui ont été réussis ; aujourd'hui ne compte que s'il est terminé.
export const adherence = (group, done, today, washDays, length = 30) => {
  const counted = history(group, done, today, washDays, length)
    .filter((d) => d.state !== 'off' && d.state !== 'todo')
  if (!counted.length) return null
  return Math.round((counted.filter((d) => d.state === 'done').length / counted.length) * 100)
}

// Semaines du mois, du lundi au dimanche. `month` va de 0 à 11.
export const monthGrid = (year, month) => {
  const first = new Date(year, month, 1)
  const last = localDay(new Date(year, month + 1, 0))
  let day = addDays(localDay(first), 1 - (first.getDay() || 7))
  const weeks = []
  while (day <= last) {
    weeks.push(Array.from({ length: 7 }, (_, i) => {
      const current = addDays(day, i)
      return { day: current, number: toDate(current).getDate(), inMonth: toDate(current).getMonth() === month }
    }))
    day = addDays(day, 7)
  }
  return weeks
}

export const longDay = (day) =>
  toDate(day).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

export const frequencyLabel = (item) => {
  const parts = []
  if (item.condition && item.condition !== 'toujours') {
    parts.push(CONDITIONS.find((c) => c.id === item.condition)?.label)
  }
  if (item.days?.length && item.days.length < 7) {
    parts.push(WEEKDAYS.filter((d) => item.days.includes(d.id)).map((d) => d.label.toLowerCase()).join(', '))
  }
  return parts.join(', ') || 'Tous les jours'
}

export const nextPosition = (items) => items.reduce((max, i) => Math.max(max, i.position ?? 0), 0) + 10
