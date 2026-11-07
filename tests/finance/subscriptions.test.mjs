import { test } from 'node:test'
import assert from 'node:assert/strict'
import { detectSubscriptions } from '../../src/utils/finance/subscriptions.js'

const tx = (date, label_raw, amount) => ({ date, label_raw, amount, kind: 'depense' })

test('un resto payé chaque mois par carte n\'est pas un abonnement', () => {
  const found = detectSubscriptions([
    tx('2026-08-20', 'CB LE PETIT ZINC 2008', -60),
    tx('2026-09-20', 'CB LE PETIT ZINC 2009', -60),
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
