// Patrimoine : valeurs saisies chaque mois pour le PEA et les livrets.
// Un compte sans saisie pour un mois garde sa dernière valeur connue.

import { addMonths, monthStart, toDay } from './period.js'

const round2 = (n) => Math.round(n * 100) / 100

// Valeur d'un compte au mois donné (dernière saisie à ce mois ou avant)
function valueAt(values, month) {
  let best = null
  for (const v of values) {
    if (v.month <= month && (!best || v.month > best.month)) best = v
  }
  return best ? Number(best.value) : null
}

// Dernier montant versé connu à ce mois ou avant (les saisies sans versé sont ignorées)
function investedAt(values, month) {
  let best = null
  for (const v of values) {
    if (v.invested === null || v.invested === undefined || v.invested === '') continue
    if (v.month <= month && (!best || v.month > best.month)) best = v
  }
  return best ? Number(best.invested) : null
}

// Plus-value d'un compte : gain en euros et en pourcentage du versé
export function gainOf(value, invested) {
  if (value === null || value === undefined || invested === null || invested === undefined) {
    return { gain: null, gainPct: null }
  }
  const gain = round2(Number(value) - Number(invested))
  const gainPct = Number(invested) > 0 ? Math.round((gain / Number(invested)) * 1000) / 10 : null
  return { gain, gainPct }
}

export function computePatrimoine(accounts = [], holdingValues = [], today = new Date()) {
  const todayDay = typeof today === 'string' ? today : toDay(today)
  const values = holdingValues.map((v) => ({ ...v, month: monthStart(v.month) }))
  const empty = { total: 0, previousTotal: 0, deltaPct: null, lastUpdate: null, byAccount: [], history: [], investedTotal: 0, gainTotal: 0 }
  if (!values.length) {
    return {
      ...empty,
      byAccount: accounts
        .filter((a) => a.kind !== 'courant')
        .map((account) => ({ account, value: null, previous: null, invested: null, gain: null, gainPct: null })),
    }
  }

  const byAccountId = new Map()
  for (const v of values) {
    if (!byAccountId.has(v.account_id)) byAccountId.set(v.account_id, [])
    byAccountId.get(v.account_id).push(v)
  }

  const lastMonth = values.reduce((m, v) => (v.month > m ? v.month : m), values[0].month)
  const prevMonth = addMonths(lastMonth, -1)

  const totalAt = (month) => {
    let total = 0
    let known = false
    for (const list of byAccountId.values()) {
      const v = valueAt(list, month)
      if (v !== null) {
        total += v
        known = true
      }
    }
    return known ? round2(total) : null
  }

  const total = totalAt(lastMonth) ?? 0
  const previousTotal = totalAt(prevMonth) ?? 0
  const deltaPct = previousTotal > 0 ? Math.round(((total - previousTotal) / previousTotal) * 1000) / 10 : null

  // Date de la dernière saisie (jour local de created_at, sinon le mois)
  let lastUpdate = null
  for (const v of values) {
    const day = v.created_at ? toDay(new Date(v.created_at)) : v.month
    if (!lastUpdate || day > lastUpdate) lastUpdate = day
  }

  const byAccount = accounts
    .filter((a) => a.kind !== 'courant' || byAccountId.has(a.id))
    .map((account) => {
      const list = byAccountId.get(account.id) || []
      const value = valueAt(list, lastMonth)
      const invested = investedAt(list, lastMonth)
      return { account, value, previous: valueAt(list, prevMonth), invested, ...gainOf(value, invested) }
    })

  // Totaux sur les seuls comptes dont le versé est connu
  let investedTotal = 0
  let gainTotal = 0
  for (const item of byAccount) {
    if (item.invested === null || item.value === null) continue
    investedTotal += item.invested
    gainTotal += item.gain
  }
  investedTotal = round2(investedTotal)
  gainTotal = round2(gainTotal)

  // Six derniers mois jusqu'au mois courant, à partir de la première saisie
  const currentMonth = monthStart(todayDay)
  const endMonth = lastMonth > currentMonth ? lastMonth : currentMonth
  const history = []
  for (let i = 5; i >= 0; i--) {
    const month = addMonths(endMonth, -i)
    const t = totalAt(month)
    if (t !== null) history.push({ month, total: t })
  }

  return { total, previousTotal, deltaPct, lastUpdate, byAccount, history, investedTotal, gainTotal }
}
