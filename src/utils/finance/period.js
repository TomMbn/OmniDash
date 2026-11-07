// Mois budgétaire : d'un versement du revenu fixe au suivant, sinon mois calendaire.
// Toutes les dates sont des chaînes AAAA-MM-JJ locales.

const pad = (n) => String(n).padStart(2, '0')

export const toDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const fromDay = (s) => {
  const [y, m, d] = String(s).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const addDays = (day, n) => {
  const d = fromDay(day)
  d.setDate(d.getDate() + n)
  return toDay(d)
}

// Ajoute des mois en restant sur le dernier jour si le mois cible est plus court (31 oct. + 1 = 30 nov.)
export const addMonths = (day, n) => {
  const [y, m, d] = String(day).split('-').map(Number)
  const target = new Date(y, m - 1 + n, 1)
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(d, last))
  return toDay(target)
}

export const diffDays = (a, b) => Math.round((fromDay(b) - fromDay(a)) / 86400000)

export const monthStart = (day) => `${String(day).slice(0, 7)}-01`

const MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

export const shortDate = (day) => {
  const d = fromDay(day)
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}

export const periodLabel = (start, end) => `${shortDate(start)} au ${shortDate(end)}`

export const inPeriod = (day, period) => day >= period.start && day <= period.end

// Crédits pris en compte pour chercher le revenu
const isIncomeCandidate = (t) =>
  Number(t.amount) > 0 && (!t.kind || t.kind === 'revenu')

const MIN_INCOME = 100

// Revenu récurrent : crédits de montant proche (±15 %) espacés d'environ un mois, au moins deux fois.
// Le plus gros groupe qui remplit ces conditions l'emporte.
// Renvoie { amount, dates: [...], lastDate } ou null.
export function detectIncome(transactions = [], today = new Date()) {
  const todayDay = typeof today === 'string' ? today : toDay(today)
  const credits = transactions
    .filter((t) => isIncomeCandidate(t) && Number(t.amount) >= MIN_INCOME && t.date <= todayDay)
    .map((t) => ({ date: t.date, amount: Number(t.amount) }))
    .sort((a, b) => b.amount - a.amount)

  let best = null
  const tried = new Set()
  for (const ref of credits) {
    if (tried.has(ref.amount)) continue
    tried.add(ref.amount)
    const group = credits
      .filter((c) => Math.abs(c.amount - ref.amount) <= ref.amount * 0.15)
      .sort((a, b) => (a.date < b.date ? -1 : 1))
    // Une seule occurrence par fenêtre de 20 jours : on garde la plus proche du montant de référence
    const chain = []
    for (const c of group) {
      const prev = chain[chain.length - 1]
      if (prev && diffDays(prev.date, c.date) < 20) {
        if (Math.abs(c.amount - ref.amount) < Math.abs(prev.amount - ref.amount)) chain[chain.length - 1] = c
        continue
      }
      chain.push(c)
    }
    // Au moins un écart mensuel (20 à 40 jours)
    let monthly = 0
    for (let i = 1; i < chain.length; i++) {
      const gap = diffDays(chain[i - 1].date, chain[i].date)
      if (gap >= 20 && gap <= 40) monthly++
    }
    if (monthly < 1) continue
    const last = chain[chain.length - 1]
    const candidate = { amount: last.amount, dates: chain.map((c) => c.date), lastDate: last.date }
    if (!best || ref.amount > best.refAmount) best = { ...candidate, refAmount: ref.amount }
    // Les crédits sont triés du plus gros au plus petit : le premier groupe valide est le bon
    break
  }
  if (!best) return null
  const { refAmount, ...result } = best
  return result
}

// Période courante. Si le dernier revenu date de plus de 45 jours, repli sur le mois calendaire.
export function computePeriod(transactions = [], today = new Date()) {
  const todayDay = typeof today === 'string' ? today : toDay(today)
  const income = detectIncome(transactions, todayDay)
  let start
  let end
  let basedOnIncome = false
  if (income && diffDays(income.lastDate, todayDay) <= 45) {
    start = income.lastDate
    end = addDays(addMonths(start, 1), -1)
    // Revenu en retard : la période s'étire jusqu'à aujourd'hui
    if (end < todayDay) end = todayDay
    basedOnIncome = true
  } else {
    start = monthStart(todayDay)
    end = addDays(addMonths(start, 1), -1)
  }
  // Jours restants, aujourd'hui compris
  const daysLeft = todayDay > end ? 0 : diffDays(todayDay, end) + 1
  return { start, end, daysLeft, label: periodLabel(start, end), basedOnIncome, incomeDates: income?.dates ?? [] }
}

// Les count périodes complètes qui précèdent period, de la plus récente à la plus ancienne.
// On s'appuie sur les dates réelles du revenu quand elles existent.
export function previousPeriods(period, count = 3) {
  const out = []
  let end = addDays(period.start, -1)
  const incomeDates = [...(period.incomeDates || [])].sort()
  for (let i = 0; i < count; i++) {
    let start
    if (period.basedOnIncome) {
      const before = incomeDates.filter((d) => d <= end)
      const candidate = before[before.length - 1]
      start = candidate && diffDays(candidate, end) <= 40 ? candidate : addMonths(addDays(end, 1), -1)
    } else {
      start = monthStart(end)
    }
    out.push({ start, end, label: periodLabel(start, end) })
    end = addDays(start, -1)
  }
  return out
}
