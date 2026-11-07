// Totaux de la période, dépenses par catégorie et budgets suggérés.
// Un remboursement relié réduit la dépense de la catégorie de la dépense d'origine.

import { inPeriod } from './period.js'

const round2 = (n) => Math.round(n * 100) / 100

// Map categoryId (ou null) vers dépense nette sur la période
export function spentByCategory(transactions = [], period) {
  const byId = new Map(transactions.map((t) => [t.id, t]))
  const spent = new Map()
  const add = (key, value) => spent.set(key, (spent.get(key) || 0) + value)
  for (const t of transactions) {
    if (!inPeriod(t.date, period)) continue
    const amount = Number(t.amount)
    if (t.kind === 'depense') {
      add(t.category_id ?? null, -amount)
    } else if (t.kind === 'remboursement' && amount > 0) {
      // Remboursement encore non confirmé et non relié : pas compté
      if (!t.linked_id && t.status === 'verifier') continue
      const origin = t.linked_id ? byId.get(t.linked_id) : null
      add(origin?.category_id ?? t.category_id ?? null, -amount)
    }
  }
  for (const [k, v] of spent) spent.set(k, round2(v))
  return spent
}

export function computeTotals(transactions = [], categories = [], period) {
  let income = 0
  let saved = 0
  for (const t of transactions) {
    if (!inPeriod(t.date, period)) continue
    const amount = Number(t.amount)
    if (t.kind === 'revenu' && amount > 0) income += amount
    if (t.kind === 'epargne') saved -= amount
  }
  let spent = 0
  for (const v of spentByCategory(transactions, period).values()) spent += v
  spent = Math.max(0, spent)
  saved = Math.max(0, saved)
  const budget = categories.filter((c) => !c.archived).reduce((s, c) => s + (Number(c.budget) > 0 ? Number(c.budget) : 0), 0)
  const remaining = budget > 0 ? budget - spent : income - spent - saved
  return {
    income: round2(income),
    spent: round2(spent),
    saved: round2(saved),
    budget: round2(budget),
    remaining: round2(remaining),
  }
}

export const budgetState = (spent, budget) => {
  if (!(Number(budget) > 0)) return 'libre'
  const ratio = spent / Number(budget)
  if (ratio < 0.75) return 'bon'
  if (ratio <= 1) return 'moyen'
  return 'rate'
}

export function computeByCategory(transactions = [], categories = [], period) {
  const spent = spentByCategory(transactions, period)
  return categories
    .filter((c) => !c.archived)
    .map((category) => {
      const s = Math.max(0, spent.get(category.id) || 0)
      const budget = Number(category.budget) > 0 ? Number(category.budget) : null
      return {
        category,
        spent: s,
        budget,
        ratio: budget ? round2(s / budget) : null,
        state: budgetState(s, budget),
      }
    })
    .sort((a, b) => (b.budget || 0) - (a.budget || 0) || b.spent - a.spent)
}

// Moyenne des périodes complètes passées, arrondie à 10 €.
// Seules les périodes qui contiennent au moins une opération comptent.
export function suggestBudgets(transactions = [], categories = [], periods = []) {
  const covered = periods.filter((p) => transactions.some((t) => inPeriod(t.date, p)))
  if (!covered.length) return []
  const totals = new Map()
  for (const p of covered) {
    for (const [id, v] of spentByCategory(transactions, p)) {
      if (id) totals.set(id, (totals.get(id) || 0) + v)
    }
  }
  const out = []
  for (const c of categories) {
    if (c.archived) continue
    const avg = (totals.get(c.id) || 0) / covered.length
    if (avg <= 0) continue
    // Arrondi à la dizaine supérieure : un budget juste en dessous de l'habitude serait dépassé d'office
    out.push({ categoryId: c.id, amount: Math.max(10, Math.ceil(avg / 10) * 10) })
  }
  return out
}

// Dépenses des 30 jours précédant le remboursement, d'un montant au moins égal, plus proches d'abord
export function candidateExpenses(transactions = [], refund, max = 5) {
  if (!refund) return []
  const refundAmount = Math.abs(Number(refund.amount))
  const refundTime = new Date(refund.date + 'T12:00:00').getTime()
  const from = refundTime - 30 * 86400000
  return transactions
    .filter((t) => {
      if (t.id === refund.id || t.kind !== 'depense' || Number(t.amount) >= 0) return false
      const time = new Date(t.date + 'T12:00:00').getTime()
      return time >= from && time <= refundTime && Math.abs(Number(t.amount)) >= refundAmount
    })
    .map((t) => ({
      t,
      dist: refundTime - new Date(t.date + 'T12:00:00').getTime(),
      gap: Math.abs(Number(t.amount)) - refundAmount,
    }))
    .sort((a, b) => a.dist - b.dist || a.gap - b.gap)
    .slice(0, max)
    .map((x) => x.t)
}
