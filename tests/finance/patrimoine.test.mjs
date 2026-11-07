import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computePatrimoine } from '../../src/utils/finance/patrimoine.js'

// Données fictives
const accounts = [
  { id: 'pea', name: 'PEA', kind: 'pea' },
  { id: 'livret', name: 'Livret A', kind: 'livret' },
  { id: 'autre', name: 'Cagnotte', kind: 'autre' },
]

test('versé, plus-value et pourcentage par compte', () => {
  const values = [
    { account_id: 'pea', month: '2026-10-01', value: 3000, invested: 2800 },
    { account_id: 'pea', month: '2026-11-01', value: 3210, invested: 2900 },
    { account_id: 'livret', month: '2026-11-01', value: 5100, invested: 5000 },
    { account_id: 'autre', month: '2026-11-01', value: 200 },
  ]
  const p = computePatrimoine(accounts, values, '2026-11-07')
  const pea = p.byAccount.find((a) => a.account.id === 'pea')
  assert.equal(pea.invested, 2900)
  assert.equal(pea.gain, 310)
  assert.equal(pea.gainPct, 10.7)
  const livret = p.byAccount.find((a) => a.account.id === 'livret')
  assert.equal(livret.gain, 100)
  assert.equal(livret.gainPct, 2)
  const other = p.byAccount.find((a) => a.account.id === 'autre')
  assert.equal(other.invested, null)
  assert.equal(other.gain, null)
  assert.equal(other.gainPct, null)
  assert.equal(p.investedTotal, 7900)
  assert.equal(p.gainTotal, 410)
  assert.equal(p.total, 8510)
})

test('le dernier versé connu sert quand le mois n\'en a pas', () => {
  const values = [
    { account_id: 'pea', month: '2026-10-01', value: 3000, invested: 2800 },
    { account_id: 'pea', month: '2026-11-01', value: 2700, invested: null },
  ]
  const pea = computePatrimoine(accounts, values, '2026-11-07').byAccount.find((a) => a.account.id === 'pea')
  assert.equal(pea.invested, 2800)
  assert.equal(pea.gain, -100)
  assert.equal(pea.gainPct, -3.6)
})

test('versé nul : pas de pourcentage', () => {
  const values = [{ account_id: 'livret', month: '2026-11-01', value: 12, invested: 0 }]
  const livret = computePatrimoine(accounts, values, '2026-11-07').byAccount.find((a) => a.account.id === 'livret')
  assert.equal(livret.gain, 12)
  assert.equal(livret.gainPct, null)
})

test('sans saisie, les champs existent et restent vides', () => {
  const p = computePatrimoine(accounts, [], '2026-11-07')
  assert.equal(p.investedTotal, 0)
  assert.equal(p.gainTotal, 0)
  assert.equal(p.byAccount[0].invested, null)
  assert.equal(p.byAccount[0].gainPct, null)
})
