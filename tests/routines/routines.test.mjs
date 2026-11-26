import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  addDays, adherence, dayStats, doneSet, frequencyLabel, groupState, history, isScheduled,
  itemsForDay, monthGrid, streak, weekdayOf, cleanserHint, parseUvForecast, statsFor,
} from '../../src/utils/routines/routines.js'

// Novembre 2026 : le 22 est un dimanche, le 25 un mercredi.
const WASH = [3, 7]
const step = (id, extra = {}) => ({ id, title: id, condition: 'toujours', days: [], start_day: '2026-11-01', position: 1, ...extra })
const logs = (id, ...days) => days.map((day) => ({ item_id: id, day }))

test('dates et jours de la semaine', () => {
  assert.equal(weekdayOf('2026-11-25'), 3)
  assert.equal(weekdayOf('2026-11-22'), 7)
  assert.equal(addDays('2026-11-30', 1), '2026-12-01')
  assert.equal(addDays('2026-10-25', 1), '2026-10-26') // changement d'heure
  assert.equal(addDays('2026-01-01', -1), '2025-12-31')
})

test('conditions liées au shampooing', () => {
  const on = (condition, day) => isScheduled(step('a', { condition }), day, WASH)
  assert.equal(on('lavage', '2026-11-25'), true)
  assert.equal(on('lavage', '2026-11-26'), false)
  assert.equal(on('sans_lavage', '2026-11-26'), true)
  assert.equal(on('lendemain', '2026-11-26'), true) // jeudi
  assert.equal(on('lendemain', '2026-11-23'), true) // lundi
  assert.equal(on('lendemain', '2026-11-25'), false)
  assert.equal(on('autres_matins', '2026-11-25'), true)
  assert.equal(on('autres_matins', '2026-11-26'), false)
})

test('jours choisis, début et retrait', () => {
  const fil = step('fil', { days: [2, 5] })
  assert.equal(isScheduled(fil, '2026-11-24', WASH), true)
  assert.equal(isScheduled(fil, '2026-11-25', WASH), false)
  const ancien = step('x', { start_day: '2026-11-10', archived_on: '2026-11-20' })
  assert.equal(isScheduled(ancien, '2026-11-09', WASH), false)
  assert.equal(isScheduled(ancien, '2026-11-19', WASH), true)
  assert.equal(isScheduled(ancien, '2026-11-20', WASH), false)
})

test('avancement du jour : le facultatif ne compte pas', () => {
  const items = [step('a', { position: 2 }), step('b', { position: 1 }), step('c', { optional: true })]
  const done = doneSet(logs('a', '2026-11-25'))
  assert.deepEqual(itemsForDay(items, '2026-11-25', WASH).map((i) => i.id), ['b', 'c', 'a'])
  assert.deepEqual(dayStats(items, done, '2026-11-25', WASH), { total: 2, done: 1, ratio: 0.5, complete: false })
})

test('série : la journée en cours ne la casse pas', () => {
  const group = [step('a')]
  const done = doneSet(logs('a', '2026-11-22', '2026-11-23', '2026-11-24'))
  assert.equal(streak(group, done, '2026-11-25', WASH), 3)
  assert.equal(streak(group, doneSet(logs('a', '2026-11-23', '2026-11-25')), '2026-11-25', WASH), 1)
})

test('série : les jours sans rien de prévu sont sautés', () => {
  const weekly = [step('taie', { days: [7] })]
  const done = doneSet(logs('taie', '2026-11-15', '2026-11-22'))
  assert.equal(streak(weekly, done, '2026-11-25', WASH), 2)
})

test('états, historique et régularité', () => {
  const group = [step('a', { start_day: '2026-11-22' }), step('b', { start_day: '2026-11-22' })]
  const done = doneSet([...logs('a', '2026-11-22', '2026-11-23'), ...logs('b', '2026-11-22')])
  const state = (day) => groupState(group, done, day, WASH, '2026-11-25')
  assert.deepEqual(['2026-11-21', '2026-11-22', '2026-11-23', '2026-11-24', '2026-11-25'].map(state),
    ['off', 'done', 'partial', 'missed', 'todo'])
  assert.equal(history(group, done, '2026-11-25', WASH, 5).at(-1).day, '2026-11-25')
  assert.equal(adherence(group, done, '2026-11-25', WASH), 33)
  assert.equal(adherence([step('n', { start_day: '2026-12-01' })], done, '2026-11-25', WASH), null)
})

test('grille du mois, du lundi au dimanche', () => {
  const weeks = monthGrid(2026, 10)
  assert.equal(weeks[0][0].day, '2026-10-26')
  assert.equal(weeks.at(-1)[6].day, '2026-12-06')
  assert.ok(weeks.every((w) => w.length === 7))
  assert.equal(weeks.flat().filter((d) => d.inMonth).length, 30)
})

test('libellé de fréquence', () => {
  assert.equal(frequencyLabel(step('a')), 'Tous les jours')
  assert.equal(frequencyLabel(step('a', { days: [2, 5] })), 'mardi, vendredi')
  assert.equal(frequencyLabel(step('a', { condition: 'lavage' })), 'Jours de shampooing')
})

test('indice UV : facultatif sous le seuil, à faire au-dessus ou sans valeur', () => {
  const items = [step('a'), step('spf', { uv_min: 3 })]
  const total = (uv) => dayStats(items, new Set(), '2026-11-25', WASH, uv).total
  assert.equal(total({ '2026-11-25': 1.2 }), 1)
  assert.equal(total({ '2026-11-25': 2.4 }), 1)
  assert.equal(total({ '2026-11-25': 2.6 }), 2) // arrondi à 3
  assert.equal(total({ '2026-11-25': 6 }), 2)
  assert.equal(total({}), 2)
  assert.equal(total(undefined), 2)
})

test('indice UV : le réglage de l’étape n’est pas modifié', () => {
  const spf = step('spf', { uv_min: 3 })
  const [shown] = itemsForDay([spf], '2026-11-25', WASH, { '2026-11-25': 0 })
  assert.equal(shown.uvSkipped, true)
  assert.equal(shown.uvIndex, 0)
  assert.equal(shown.optional, undefined)
  assert.equal(spf.uvSkipped, undefined)
  assert.equal(statsFor([shown], new Set(), '2026-11-25').total, 0)
})

test('indice UV : pris en compte dans les séries et la régularité', () => {
  const group = [step('a', { start_day: '2026-11-23' }), step('spf', { uv_min: 3, start_day: '2026-11-23' })]
  const done = doneSet(logs('a', '2026-11-23', '2026-11-24'))
  const uv = { '2026-11-23': 1, '2026-11-24': 1 }
  assert.equal(streak(group, done, '2026-11-25', WASH, uv), 2)
  assert.equal(streak(group, done, '2026-11-25', WASH), 0)
  assert.equal(adherence(group, done, '2026-11-25', WASH, 3, uv), 100)
  assert.equal(groupState(group, done, '2026-11-24', WASH, '2026-11-25', uv), 'done')
})

test('lecture de la prévision UV', () => {
  const json = { daily: { time: ['2026-11-24', '2026-11-25', '2026-11-26'], uv_index_max: [0.9, null, 1.35] } }
  assert.deepEqual(parseUvForecast(json), [{ day: '2026-11-24', uv_max: 0.9 }, { day: '2026-11-26', uv_max: 1.35 }])
  assert.deepEqual(parseUvForecast({}), [])
  assert.deepEqual(parseUvForecast(null), [])
})

test('nettoyant du soir selon le SPF coché', () => {
  const list = [step('m', { slug: 'matin-spf' }), step('s', { slug: 'soir-visage' })]
  assert.match(cleanserHint(list[1], list, doneSet(logs('m', '2026-11-25')), '2026-11-25'), /huile micellaire/)
  assert.match(cleanserHint(list[1], list, new Set(), '2026-11-25'), /gel moussant/)
  assert.equal(cleanserHint(list[0], list, new Set(), '2026-11-25'), null)
  assert.equal(cleanserHint(list[1], [list[1]], new Set(), '2026-11-25'), null)
})
