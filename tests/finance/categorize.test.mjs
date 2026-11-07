import { test } from 'node:test'
import assert from 'node:assert/strict'
import { displayLabel, normalizeLabel } from '../../src/utils/finance/normalize.js'
import { DEFAULT_CATEGORIES, applyAiResult, categorize, detectKind, matchRule } from '../../src/utils/finance/categorize.js'

const categories = DEFAULT_CATEGORIES.map((name, i) => ({ id: `c${i}`, name }))
const id = (name) => categories.find((c) => c.name === name).id

test('normalisation des libellés', () => {
  assert.equal(normalizeLabel('CB CARREFOUR CITY FACT 121124'), 'CARREFOUR CITY')
  assert.equal(normalizeLabel('PAIEMENT PAR CARTE X1234 MONOPRIX 12/11'), 'MONOPRIX')
  assert.equal(normalizeLabel('PRLV SEPA NETFLIX.COM 1234567890'), 'NETFLIX COM')
  assert.equal(normalizeLabel('VIR INST RE M JEAN DUPONT'), 'M JEAN DUPONT')
  assert.equal(normalizeLabel('CB  Café   Été 1211'), 'CAFE ETE')
  assert.equal(normalizeLabel('VIR SEPA LIVRET A'), 'LIVRET A')
})

test('libellé lisible', () => {
  assert.equal(displayLabel('CB CARREFOUR CITY FACT 121124'), 'Carrefour City')
  assert.equal(displayLabel('PRLV SEPA SNCF CONNECT'), 'SNCF Connect')
})

test('dictionnaire', () => {
  const cases = [
    ['CB CARREFOUR MARKET 0311', 'Courses'],
    ['CB UBER EATS PARIS', 'Restaurants'],
    ['CB UBER TRIP', 'Transport'],
    ['PRLV SEPA FREE MOBILE', 'Abonnements'],
    ['CB BASIC-FIT', 'Sport'],
    ['CB PHARMACIE DU CENTRE', 'Santé'],
    ['CB AIRBNB', 'Voyages'],
    ['PRLV SEPA LOYER OCTOBRE', 'Logement'],
    ['CB DECATHLON', 'Sport'],
    ['APPLE.COM/BILL', 'Abonnements'],
  ]
  for (const [label, expected] of cases) {
    const r = categorize({ label_raw: label, amount: -10 }, { categories })
    assert.equal(r.category_id, id(expected), label)
    assert.equal(r.status, 'auto', label)
    assert.equal(r.source, 'dictionnaire', label)
  }
})

test('inconnu : à vérifier', () => {
  const r = categorize({ label_raw: 'CB ZORGLUB SARL', amount: -42 }, { categories })
  assert.equal(r.status, 'verifier')
  assert.equal(r.category_id, null)
})

test('règle utilisateur prioritaire sur le dictionnaire', () => {
  const rules = [{ pattern: 'CARREFOUR CITY', category_id: id('Restaurants'), kind: null }]
  const r = categorize({ label_raw: 'CB CARREFOUR CITY 1211', amount: -8 }, { categories, rules })
  assert.equal(r.category_id, id('Restaurants'))
  assert.equal(r.source, 'regle')
  assert.equal(r.status, 'auto')
  assert.equal(matchRule('CB MONOPRIX', rules), null)
})

test('nature : épargne, interne, revenu, remboursement', () => {
  assert.equal(detectKind('VIR SEPA LIVRET A', -200).kind, 'epargne')
  assert.equal(detectKind('VIREMENT VERS PEA BOURSE DIRECT', -500).kind, 'epargne')
  assert.equal(detectKind('VIR SEPA TRADE REPUBLIC', -100).kind, 'epargne')
  assert.equal(detectKind('VIR SEPA EPARGNE', 300).kind, 'epargne')
  assert.equal(detectKind('VIREMENT INTERNE COMPTE JOINT', -400).kind, 'interne')
  assert.equal(detectKind('VIR SEPA SOCIETE FICTIVE SAS SALAIRE', 2100).kind, 'revenu')
  assert.equal(detectKind('VIR INST RE M JEAN DUPONT', 15).kind, 'remboursement')
  assert.equal(detectKind('LYDIA MARIE', 20).kind, 'remboursement')
  assert.equal(detectKind('VIR INST RE M JEAN DUPONT', 900).kind, 'revenu')
  assert.equal(detectKind('VIR INST CAF DE PARIS', 120).kind, 'revenu')
  assert.equal(detectKind('CB AMAZON', 30).kind, 'depense')
})

test('remboursement d\'ami : à vérifier', () => {
  const r = categorize({ label_raw: 'VIR INST RE MME MARIE MARTIN', amount: 12 }, { categories })
  assert.equal(r.kind, 'remboursement')
  assert.equal(r.status, 'verifier')
})

test('catégorie de la banque en dernier recours, à vérifier', () => {
  const r = categorize({ label_raw: 'CB ZORGLUB', amount: -5, bank_category: 'Alimentation' }, { categories })
  assert.equal(r.category_id, id('Courses'))
  assert.equal(r.status, 'verifier')
})

test('résultat IA : sous le seuil reste à vérifier', () => {
  const base = categorize({ label_raw: 'CB ZORGLUB', amount: -5 }, { categories })
  const sure = applyAiResult(base, { label: 'ZORGLUB', category: 'Shopping', kind: 'depense', confidence: 0.95 }, categories)
  assert.equal(sure.status, 'auto')
  assert.equal(sure.category_id, id('Shopping'))
  const unsure = applyAiResult(base, { label: 'ZORGLUB', category: 'Shopping', kind: 'depense', confidence: 0.5 }, categories)
  assert.equal(unsure.status, 'verifier')
})

test('un virement vers ou depuis son propre nom est un virement interne', () => {
  const owner = ['JEANNE', 'DURAND']
  const out = categorize({ label_raw: 'VIR. VERS JEANNE DURAND', amount: -400 }, { categories, owner })
  assert.equal(out.kind, 'interne')
  assert.equal(out.status, 'auto')
  const inbound = categorize({ label_raw: 'VIREMENT VERS MME DURAND JEANNE', amount: 150 }, { categories, owner })
  assert.equal(inbound.kind, 'interne')
  const friend = categorize({ label_raw: 'VIR INST MR PAUL MARTIN', amount: 20 }, { categories, owner })
  assert.equal(friend.kind, 'remboursement')
})

test('les enseignes ajoutées au dictionnaire sont reconnues', () => {
  const cases = [
    ['CB EASYJET AB12CD FACT 010126', 'Voyages'],
    ['CB NETFLIX.COM FACT 010126', 'Abonnements'],
    ['CB SNIPES FACT 010126', 'Shopping'],
    ['CB UBER TRIP FACT 010126', 'Transport'],
    ['CB STEAMPOWERED FACT 010126', 'Sorties'],
    ['CB CENTRE MEDICAL FACT 010126', 'Santé'],
  ]
  for (const [label, expected] of cases) {
    const out = categorize({ label_raw: label, amount: -10 }, { categories })
    assert.equal(out.category_id, id(expected), label)
  }
})
