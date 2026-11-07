import { test } from 'node:test'
import assert from 'node:assert/strict'
import { addMonths, computePeriod, detectIncome, previousPeriods } from '../../src/utils/finance/period.js'
import { detectSubscriptions, isIncreased, mergeSubscriptions } from '../../src/utils/finance/subscriptions.js'
import { candidateExpenses, computeByCategory, computeTotals, suggestBudgets } from '../../src/utils/finance/budgets.js'
import { computePatrimoine } from '../../src/utils/finance/patrimoine.js'

const salary = (date, amount = 2100) => ({ date, amount, kind: 'revenu', label_raw: 'VIR SALAIRE' })

test('addMonths reste en fin de mois', () => {
  assert.equal(addMonths('2026-10-31', 1), '2026-11-30')
  assert.equal(addMonths('2026-01-31', 1), '2026-02-28')
  assert.equal(addMonths('2026-12-15', 1), '2027-01-15')
})

test('revenu détecté : le plus gros crédit mensuel récurrent', () => {
  const tx = [
    salary('2026-08-28', 2080), salary('2026-09-28', 2100), salary('2026-10-28', 2150),
    { date: '2026-09-10', amount: 3000, kind: 'revenu', label_raw: 'PRIME' }, // ponctuel
    { date: '2026-09-05', amount: 150, kind: 'revenu', label_raw: 'CAF' },
    { date: '2026-10-05', amount: 150, kind: 'revenu', label_raw: 'CAF' },
  ]
  const income = detectIncome(tx, '2026-11-07')
  assert.equal(income.lastDate, '2026-10-28')
  assert.equal(income.amount, 2150)
})

test('période fondée sur le revenu', () => {
  const tx = [salary('2026-09-28'), salary('2026-10-28')]
  const p = computePeriod(tx, '2026-11-07')
  assert.equal(p.start, '2026-10-28')
  assert.equal(p.end, '2026-11-27')
  assert.equal(p.daysLeft, 21)
  assert.equal(p.basedOnIncome, true)
  assert.equal(p.label, '28 oct. au 27 nov.')
})

test('repli sur le mois calendaire', () => {
  const p = computePeriod([salary('2026-10-28')], '2026-11-07')
  assert.equal(p.basedOnIncome, false)
  assert.equal(p.start, '2026-11-01')
  assert.equal(p.end, '2026-11-30')
  assert.equal(p.daysLeft, 24)
})

test('revenu en retard : la période s\'étire', () => {
  const p = computePeriod([salary('2026-09-28'), salary('2026-10-28')], '2026-11-29')
  assert.equal(p.end, '2026-11-29')
  assert.equal(p.daysLeft, 1)
})

test('périodes précédentes', () => {
  const tx = [salary('2026-07-27'), salary('2026-08-28'), salary('2026-09-26'), salary('2026-10-28')]
  const prev = previousPeriods(computePeriod(tx, '2026-11-07'), 3)
  assert.deepEqual(prev.map((p) => [p.start, p.end]), [
    ['2026-09-26', '2026-10-27'],
    ['2026-08-28', '2026-09-25'],
    ['2026-07-27', '2026-08-27'],
  ])
})

const debit = (date, amount, label, extra = {}) => ({ date, amount: -amount, label_raw: label, kind: 'depense', ...extra })

test('abonnements détectés, hausse signalée', () => {
  const tx = [
    debit('2026-08-03', 13.49, 'PRLV SEPA NETFLIX 0308'),
    debit('2026-09-03', 13.49, 'PRLV SEPA NETFLIX 0309'),
    debit('2026-10-03', 14.49, 'PRLV SEPA NETFLIX 0310'),
    debit('2026-09-12', 9.99, 'PRLV SPOTIFY'),
    debit('2026-10-12', 9.99, 'PRLV SPOTIFY'),
    debit('2026-08-20', 30, 'PRLV ZORG'), // mois non consécutifs
    debit('2026-10-20', 30, 'PRLV ZORG'),
    ...['01', '05', '09', '14', '20'].flatMap((d) => [debit(`2026-09-${d}`, 30, 'CB MONOPRIX'), debit(`2026-10-${d}`, 30, 'CB MONOPRIX')]),
  ]
  const subs = detectSubscriptions(tx)
  const names = subs.map((s) => s.pattern).sort()
  assert.deepEqual(names, ['NETFLIX', 'SPOTIFY'])
  const netflix = subs.find((s) => s.pattern === 'NETFLIX')
  assert.equal(netflix.amount, 14.49)
  assert.equal(netflix.previous_amount, 13.49)
  assert.equal(netflix.day, 3)
  assert.equal(isIncreased(netflix), true)
  assert.equal(isIncreased(subs.find((s) => s.pattern === 'SPOTIFY')), false)
})

test('fusion des abonnements : statut conservé, ancien montant gardé', () => {
  const existing = [{ id: 's1', pattern: 'SPOTIFY', name: 'Spotify', amount: 9.99, previous_amount: null, day: 12, status: 'confirme', last_seen: '2026-09-12' }]
  const detected = [{ pattern: 'SPOTIFY', name: 'Spotify', amount: 10.99, previous_amount: 9.99, day: 12, last_seen: '2026-10-12' }]
  const [m] = mergeSubscriptions(existing, detected)
  assert.equal(m.status, 'confirme')
  assert.equal(m.previous_amount, 9.99)
  assert.equal(m.amount, 10.99)
  const unchanged = mergeSubscriptions([{ ...existing[0], amount: 10.99, previous_amount: 9.99, last_seen: '2026-10-12' }], detected)
  assert.equal(unchanged.length, 0)
})

test('totaux et catégories avec remboursement relié', () => {
  const categories = [
    { id: 'r', name: 'Restaurants', budget: 200 },
    { id: 'c', name: 'Courses', budget: 100 },
    { id: 's', name: 'Sport', budget: null },
  ]
  const period = { start: '2026-10-28', end: '2026-11-27' }
  const tx = [
    { id: 't1', date: '2026-10-28', amount: 2100, kind: 'revenu' },
    { id: 't2', date: '2026-10-30', amount: -60, kind: 'depense', category_id: 'r' },
    { id: 't3', date: '2026-11-01', amount: 30, kind: 'remboursement', linked_id: 't2', status: 'confirme' },
    { id: 't4', date: '2026-11-02', amount: -90, kind: 'depense', category_id: 'c' },
    { id: 't5', date: '2026-11-03', amount: -200, kind: 'epargne' },
    { id: 't6', date: '2026-11-03', amount: -25, kind: 'depense', category_id: 's' },
    { id: 't7', date: '2026-11-04', amount: 10, kind: 'remboursement', status: 'verifier' },
    { id: 't8', date: '2026-10-01', amount: -500, kind: 'depense', category_id: 'c' }, // hors période
  ]
  const totals = computeTotals(tx, categories, period)
  assert.deepEqual(totals, { income: 2100, spent: 145, saved: 200, budget: 300, remaining: 155 })
  const byCat = computeByCategory(tx, categories, period)
  assert.deepEqual(byCat.map((b) => [b.category.id, b.spent, b.state]), [['r', 30, 'bon'], ['c', 90, 'moyen'], ['s', 25, 'libre']])
})

test('reste sans budget : revenu moins dépenses et épargne', () => {
  const totals = computeTotals(
    [{ id: 'a', date: '2026-11-01', amount: 2000, kind: 'revenu' }, { id: 'b', date: '2026-11-02', amount: -500, kind: 'depense' }, { id: 'c', date: '2026-11-02', amount: -300, kind: 'epargne' }],
    [], { start: '2026-11-01', end: '2026-11-30' })
  assert.equal(totals.remaining, 1200)
})

test('budgets suggérés : moyenne des périodes, arrondie à 10 €', () => {
  const categories = [{ id: 'c', name: 'Courses' }, { id: 'r', name: 'Restaurants' }]
  const periods = [
    { start: '2026-10-01', end: '2026-10-31' },
    { start: '2026-09-01', end: '2026-09-30' },
    { start: '2026-08-01', end: '2026-08-31' },
  ]
  const tx = [
    { id: 1, date: '2026-10-05', amount: -310, kind: 'depense', category_id: 'c' },
    { id: 2, date: '2026-09-05', amount: -290, kind: 'depense', category_id: 'c' },
    { id: 3, date: '2026-08-05', amount: -334, kind: 'depense', category_id: 'c' },
    { id: 4, date: '2026-10-06', amount: -44, kind: 'depense', category_id: 'r' },
  ]
  assert.deepEqual(suggestBudgets(tx, categories, periods), [{ categoryId: 'c', amount: 320 }, { categoryId: 'r', amount: 20 }])
})

test('dépenses candidates pour un remboursement', () => {
  const tx = [
    { id: 'a', date: '2026-10-30', amount: -60, kind: 'depense' },
    { id: 'b', date: '2026-10-01', amount: -60, kind: 'depense' }, // plus de 30 jours
    { id: 'c', date: '2026-11-01', amount: -10, kind: 'depense' }, // trop petit
    { id: 'd', date: '2026-11-02', amount: -40, kind: 'depense' },
  ]
  const res = candidateExpenses(tx, { id: 'r', date: '2026-11-03', amount: 20 })
  assert.deepEqual(res.map((t) => t.id), ['d', 'a'])
})

test('patrimoine', () => {
  const accounts = [{ id: 'pea', name: 'PEA', kind: 'pea' }, { id: 'la', name: 'Livret A', kind: 'livret' }]
  const values = [
    { account_id: 'pea', month: '2026-09-01', value: 1000 },
    { account_id: 'la', month: '2026-09-01', value: 5000 },
    { account_id: 'pea', month: '2026-10-01', value: 1200 },
  ]
  const p = computePatrimoine(accounts, values, '2026-11-07')
  assert.equal(p.total, 6200)
  assert.equal(p.previousTotal, 6000)
  assert.equal(p.deltaPct, 3.3)
  assert.equal(p.lastUpdate, '2026-10-01')
  assert.deepEqual(p.byAccount.map((b) => [b.account.id, b.value, b.previous]), [['pea', 1200, 1000], ['la', 5000, 5000]])
  assert.deepEqual(p.history, [{ month: '2026-09-01', total: 6000 }, { month: '2026-10-01', total: 6200 }, { month: '2026-11-01', total: 6200 }])
  assert.equal(computePatrimoine(accounts, [], '2026-11-07').deltaPct, null)
})
