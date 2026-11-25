import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  brandFromLabel, canGoToWardrobe, categoriesFor, filterItems, groupItems, inseamAdvice,
  itemSummary, nextPosition, parseMeasure, progress, quantityFrom, safeUrl, wardrobeCategory, wardrobeDraft,
} from '../../src/utils/shopping/shopping.js'

const items = [
  { name: 'Jean', category: 'vetements', group_name: 'Bas', tier: 'mid', done: false, position: 320 },
  { name: 'Manteau', category: 'vetements', group_name: 'Manteau et vestes', tier: 'invest', done: true, position: 110 },
  { name: 'Pantalon', category: 'vetements', group_name: 'Bas', tier: 'mid', done: true, position: 310 },
  { name: 'Peigne', category: 'cheveux', group_name: 'Équipement', tier: 'mid', done: false, position: 1120 },
]

test('filtres combinés : catégorie, reste à acheter et gamme', () => {
  assert.equal(filterItems(items).length, 4)
  assert.deepEqual(filterItems(items, { category: 'vetements', onlyTodo: true }).map((i) => i.name), ['Jean'])
  assert.deepEqual(filterItems(items, { tiers: ['invest'] }).map((i) => i.name), ['Manteau'])
})

test('sous-sections et pièces triées par position', () => {
  const groups = groupItems(filterItems(items, { category: 'vetements' }))
  assert.deepEqual(groups.map((g) => g.name), ['Manteau et vestes', 'Bas'])
  assert.deepEqual(groups[1].items.map((i) => i.name), ['Pantalon', 'Jean'])
  assert.equal(groups[1].remaining, 1)
})

test('avancement, position suivante et catégories inconnues', () => {
  assert.deepEqual(progress(items), { total: 4, done: 2, remaining: 2, ratio: 0.5 })
  assert.equal(progress([]).ratio, 0)
  assert.equal(nextPosition(items), 1130)
  assert.equal(categoriesFor([{ category: 'cadeaux' }]).at(-1).id, 'cadeaux')
  assert.ok(categoriesFor([]).some((c) => c.id === 'parfums'))
})

test('seuls les liens https sont cliquables', () => {
  assert.equal(safeUrl('https://exemple.fr/a'), 'https://exemple.fr/a')
  assert.equal(safeUrl('javascript:alert(1)'), null)
  assert.equal(safeUrl('http://exemple.fr'), null)
  assert.equal(safeUrl(undefined), null)
})

test('mesures et conseil de longueur', () => {
  assert.equal(parseMeasure('28,5'), 28.5)
  assert.equal(parseMeasure(''), null)
  assert.equal(parseMeasure('-3'), null)
  assert.deepEqual(inseamAdvice(82), { min: 85, max: 87, length: 34 })
  assert.equal(inseamAdvice(20), null)
})

test('passage au dressing', () => {
  assert.equal(wardrobeCategory({ group_name: 'Manteau et vestes', name: 'Veste en daim' }), 'veste')
  assert.equal(wardrobeCategory({ group_name: 'Couches chaudes', name: 'Doudoune légère' }), 'veste')
  assert.equal(wardrobeCategory({ group_name: 'Couches chaudes', name: 'Bonnet en laine' }), 'accessoire')
  assert.equal(brandFromLabel('Massimo Dutti, polo manches longues'), 'Massimo Dutti')
  assert.equal(brandFromLabel('Suitsupply OOV10026, marron foncé'), 'Suitsupply')
  assert.equal(brandFromLabel('Poudre texturisante'), '')
  assert.equal(quantityFrom('1 à 2'), 1)
  assert.equal(quantityFrom('6 paires'), 6)
  assert.equal(quantityFrom(null), 1)
  assert.equal(canGoToWardrobe({ category: 'cheveux' }), false)
  assert.equal(canGoToWardrobe({ category: 'vetements', wardrobe_added_at: '2026-11-25' }), false)
  const draft = wardrobeDraft(
    { name: 'Chemise Oxford', group_name: 'Hauts', qty: '2' },
    { label: 'Zara, chemise Oxford basique', url: 'https://www.zara.com/x' })
  assert.deepEqual(draft, {
    name: 'Chemise Oxford', category: 'haut', color: '', brand: 'Zara', quantity: 2, link: 'https://www.zara.com/x',
  })
})

test('résumé d’une pièce : la gamme à investir est affichée à part', () => {
  assert.equal(itemSummary({ qty: '2', tier: 'basic', options: [] }), 'Quantité : 2, Basique')
  assert.equal(itemSummary({ qty: '1', tier: 'invest', options: [{ pick: true }] }), 'Quantité : 1, Choix retenu')
  assert.equal(itemSummary({}), '')
})
