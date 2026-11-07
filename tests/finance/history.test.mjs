import { test } from 'node:test'
import assert from 'node:assert/strict'
import { compareToPrevious, lastPeriods, spendingHistory } from '../../src/utils/finance/history.js'
import { computePeriod } from '../../src/utils/finance/period.js'

// Données fictives
const cats = ['Courses', 'Restaurants', 'Transport', 'Logement', 'Sorties', 'Shopping'].map((name, i) => ({ id: `c${i}`, name }))
const spend = (date, category_id, amount, extra = {}) => ({ id: `${date}-${category_id}-${amount}`, date, amount: -amount, kind: 'depense', category_id, label_raw: 'ACHAT TEST', ...extra })

// Six mois calendaires, de juin à novembre 2026
const periods = [
  { start: '2026-06-01', end: '2026-06-30' },
  { start: '2026-07-01', end: '2026-07-31' },
  { start: '2026-08-01', end: '2026-08-31' },
  { start: '2026-09-01', end: '2026-09-30' },
  { start: '2026-10-01', end: '2026-10-31' },
  { start: '2026-11-01', end: '2026-11-30' },
]

const sample = () => {
  const tx = []
  for (const p of periods) {
    const m = p.start.slice(0, 8)
    tx.push(spend(`${m}05`, 'c0', 300))
    tx.push(spend(`${m}06`, 'c1', 120))
    tx.push(spend(`${m}07`, 'c2', 80))
    tx.push(spend(`${m}08`, 'c3', 500))
    tx.push(spend(`${m}09`, 'c4', 30))
    tx.push(spend(`${m}10`, 'c5', 20))
  }
  return tx
}

test('agrégation par mois avec les quatre premières catégories et « Autres »', () => {
  const { months, series } = spendingHistory(sample(), cats, periods)
  assert.equal(months.length, 6)
  assert.deepEqual(series.map((s) => s.id), ['c3', 'c0', 'c1', 'c2', 'autres'])
  assert.equal(series[0].colorToken, '--module-finance')
  assert.equal(series[4].name, 'Autres')
  assert.equal(months[0].label, 'juin')
  assert.equal(months[0].total, 1050)
  assert.equal(months[0].byCategory.autres, 50)
  assert.equal(months[0].byCategory.c3, 500)
})

test('un remboursement relié réduit la dépense du mois', () => {
  const tx = sample()
  const dinner = tx.find((t) => t.date === '2026-07-06')
  tx.push({ id: 'r1', date: '2026-07-12', amount: 40, kind: 'remboursement', linked_id: dinner.id, status: 'confirme', label_raw: 'VIR AMI' })
  const { months } = spendingHistory(tx, cats, periods)
  assert.equal(months[1].byCategory.c1, 80)
  assert.equal(months[1].total, 1010)
})

test('le dernier mois est en cours et la moyenne l\'exclut', () => {
  const tx = sample().filter((t) => !(t.date >= '2026-11-01' && t.category_id === 'c3'))
  const { months, average } = spendingHistory(tx, cats, periods)
  assert.equal(months.at(-1).current, true)
  assert.equal(months.filter((m) => m.current).length, 1)
  assert.equal(months.at(-1).total, 550)
  assert.equal(average, 1050)
})

test('les périodes antérieures aux premières données sont écartées', () => {
  const tx = sample().filter((t) => t.date >= '2026-10-01')
  const { months, average } = spendingHistory(tx, cats, periods)
  assert.equal(months.length, 2)
  assert.equal(average, 1050)
  assert.equal(spendingHistory([], cats, periods).months.length, 0)
})

test('lastPeriods renvoie six périodes, la dernière étant la période en cours', () => {
  const period = computePeriod([], '2026-11-07')
  const list = lastPeriods(period, 6)
  assert.equal(list.length, 6)
  assert.equal(list[0].start, '2026-06-01')
  assert.equal(list.at(-1).start, '2026-11-01')
})

test('comparaison à date égale avec la période précédente', () => {
  const tx = [
    spend('2026-10-03', 'c0', 100),
    spend('2026-10-20', 'c0', 400), // après le 7 : hors comparaison
    spend('2026-10-04', 'c1', 60),
    spend('2026-10-05', 'c2', 10),
    spend('2026-11-02', 'c0', 118),
    spend('2026-11-03', 'c1', 36),
    spend('2026-11-04', 'c2', 10.4),
    spend('2026-11-05', 'c4', 20),
  ]
  const rows = compareToPrevious(tx, cats, periods[5], periods[4], '2026-11-07')
  assert.deepEqual(rows.map((r) => r.category.id), ['c1', 'c4', 'c0'])
  assert.equal(rows[0].delta, -24)
  assert.equal(rows[2].current, 118)
  assert.equal(rows[2].previous, 100)
  assert.equal(rows[2].delta, 18)
})
