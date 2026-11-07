import { test } from 'node:test'
import assert from 'node:assert/strict'
import { detectSubscriptions } from '../../src/utils/finance/subscriptions.js'

const tx = (date, label_raw, amount) => ({ date, label_raw, amount, kind: 'depense' })

test('un resto payé chaque mois par carte, à des montants différents, n\'est pas un abonnement', () => {
  const found = detectSubscriptions([
    tx('2026-08-20', 'CB LE PETIT ZINC 2008', -58),
    tx('2026-09-20', 'CB LE PETIT ZINC 2009', -61.5),
    tx('2026-10-20', 'CB LE PETIT ZINC 2010', -60)
  ])
  assert.equal(found.length, 0)
})

test('une hausse de prix garde l\'abonnement et l\'ancien montant', () => {
  const found = detectSubscriptions([
    tx('2026-08-05', 'PRLV SEPA FREE MOBILE', -15.99),
    tx('2026-09-05', 'PRLV SEPA FREE MOBILE', -15.99),
    tx('2026-10-05', 'PRLV SEPA FREE MOBILE', -15.99),
    tx('2026-11-05', 'PRLV SEPA FREE MOBILE', -19.99)
  ])
  assert.equal(found.length, 1)
  assert.equal(found[0].amount, 19.99)
  assert.equal(found[0].previous_amount, 15.99)
})

test('un service connu payé par carte compte comme abonnement', () => {
  const found = detectSubscriptions([
    tx('2026-09-12', 'CB SPOTIFY P2A1B', -11.12),
    tx('2026-10-12', 'CB SPOTIFY P2A1B', -11.12)
  ])
  assert.equal(found.length, 1)
})

test('un service inconnu payé par carte au même prix trois mois de suite est proposé', () => {
  const found = detectSubscriptions([
    tx('2026-08-07', 'CB OUTIL EN LIGNE FACT 070826', -9.5),
    tx('2026-09-07', 'CB OUTIL EN LIGNE FACT 070926', -9.5),
    tx('2026-10-07', 'CB OUTIL EN LIGNE FACT 071026', -9.5)
  ])
  assert.equal(found.length, 1)
})

test('un même libellé à deux prix donne deux abonnements', () => {
  const found = detectSubscriptions([
    tx('2026-08-10', 'CB APPLE.COM/BILL', -0.99),
    tx('2026-09-10', 'CB APPLE.COM/BILL', -0.99),
    tx('2026-09-15', 'CB APPLE.COM/BILL', -4.99),
    tx('2026-10-10', 'CB APPLE.COM/BILL', -0.99),
    tx('2026-10-15', 'CB APPLE.COM/BILL', -4.99)
  ])
  assert.deepEqual(found.map((f) => f.amount).sort(), [0.99, 4.99])
  assert.notEqual(found[0].pattern, found[1].pattern)
})

test('une cotisation bancaire mensuelle est un abonnement', () => {
  const found = detectSubscriptions([
    tx('2026-08-14', 'COTISATION OFFRE GROUPEE', -10.3),
    tx('2026-09-14', 'COTISATION OFFRE GROUPEE', -10.3)
  ])
  assert.equal(found.length, 1)
})
