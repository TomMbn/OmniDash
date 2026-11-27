import { test } from 'node:test'
import assert from 'node:assert/strict'
import { todayParis, previousDay, availableFor, parseOutfit, askOutfit } from '../../artifacts/styliste/logic.js'

const p = (id, categorie) => ({ id, nom: id, categorie })
const pieces = [p('h1', 'haut'), p('h2', 'haut'), p('b1', 'bas'), p('c1', 'chaussures')]

test('la date suit Paris', () => {
  assert.equal(todayParis(new Date('2026-11-27T23:30:00Z')), '2026-11-28')
  assert.equal(todayParis(new Date('2026-03-28T22:30:00Z')), '2026-03-28')
  assert.equal(previousDay('2027-01-01'), '2026-12-31')
  assert.equal(previousDay('2026-03-30'), '2026-03-29')
})

test('la veille bloque hauts et bas, pas les chaussures', () => {
  const r = availableFor(pieces, { '2026-11-26': { ids: ['h1', 'c1'] } }, '2026-11-27')
  assert.deepEqual(r.pieces.map((x) => x.id), ['h2', 'b1', 'c1'])
  assert.deepEqual(r.repeats, [])
})

test('un seul bas porté la veille revient et se signale', () => {
  const r = availableFor(pieces, { '2026-11-26': { ids: ['b1'] } }, '2026-11-27')
  assert.ok(r.pieces.some((x) => x.id === 'b1'))
  assert.deepEqual(r.repeats, ['b1'])
})

test('avant-hier ne bloque rien', () => {
  assert.equal(availableFor(pieces, { '2026-11-25': { ids: ['h1', 'b1'] } }, '2026-11-27').pieces.length, 4)
})

test('vestes et accessoires de la veille peuvent revenir', () => {
  const tout = [...pieces, p('v1', 'veste'), p('a1', 'accessoire')]
  const r = availableFor(tout, { '2026-11-26': { ids: ['v1', 'a1'] } }, '2026-11-27')
  assert.deepEqual(r.pieces, tout)
  assert.deepEqual(r.repeats, [])
})

test('tous les hauts et le bas de la veille reviennent dans leur ordre', () => {
  const r = availableFor(pieces, { '2026-11-26': { ids: ['b1', 'h2', 'h1', 'disparu'] } }, '2026-11-27')
  assert.deepEqual(r.pieces, pieces)
  assert.deepEqual(r.repeats, ['h1', 'h2', 'b1'])
})

test('historique vide ou entrée incomplète', () => {
  for (const history of [{}, { '2026-11-26': {} }, { '2026-11-26': null }]) {
    assert.deepEqual(availableFor(pieces, history, '2026-11-27'), { pieces, repeats: [] })
  }
})

test('réponses refusées', () => {
  for (const bad of ['bonjour', '{"pieces":[{"id":"zz"}]}', '{"pieces":[{"id":"b1"},{"id":"b1"}]}', '{"pieces":[]}']) {
    assert.equal(parseOutfit(bad, pieces).ok, false)
  }
})

test('deux bas ou deux paires de chaussures refusés', () => {
  const doubles = [p('b1', 'bas'), p('b2', 'bas'), p('c1', 'chaussures'), p('c2', 'chaussures')]
  for (const ids of [['b1', 'b2'], ['c1', 'c2']]) {
    const reponse = JSON.stringify({ pieces: ids.map((id) => ({ id })) })
    assert.equal(parseOutfit(reponse, doubles).ok, false)
  }
})

test('plusieurs hauts et vestes permis', () => {
  const couches = [p('h1', 'haut'), p('h2', 'haut'), p('v1', 'veste'), p('v2', 'veste')]
  const reponse = JSON.stringify({ pieces: couches.map(({ id }) => ({ id })) })
  const r = parseOutfit(reponse, couches)
  assert.equal(r.ok, true)
  assert.equal(r.cards.length, 4)
})

test('aucune réponse ne fait lever une erreur', () => {
  const mauvaises = [
    undefined, null, 42, {}, [], '', '   ', 'null', 'true', '42', '"texte"', '[]', '{}', '{', '``````', '```json\n```',
    '{"pieces":null}', '{"pieces":"h1"}', '{"pieces":{"id":"h1"}}', '{"pieces":{"length":1}}',
    '{"pieces":[null]}', '{"pieces":[1]}', '{"pieces":["h1"]}', '{"pieces":[[]]}', '{"pieces":[{}]}',
    '{"pieces":[{"id":null}]}', '{"pieces":[{"id":["h1"]}]}', '{"pieces":[{"id":{"toString":1}}]}',
    '{"pieces":[{"id":"__proto__"}]}', '{"pieces":[{"id":"constructor"}]}',
    '['.repeat(100000) + ']'.repeat(100000), '```' + ' '.repeat(100000)
  ]
  for (const texte of mauvaises) {
    const r = parseOutfit(texte, pieces)
    assert.equal(r.ok, false)
    assert.equal(typeof r.error, 'string')
    assert.ok(r.error.length > 0)
  }
})

test('les cartes viennent du dressing, pas de la réponse', () => {
  const reponse = '{"pieces":[{"id":"h1","nom":"inventé","categorie":"bas","raison":{"toString":1}}],"resume":{"toString":1}}'
  const r = parseOutfit(reponse, pieces)
  assert.equal(r.ok, true)
  assert.equal(r.cards[0].piece, pieces[0])
  assert.deepEqual(r.cards[0], { piece: pieces[0], raison: '' })
  assert.equal(r.resume, '')
})

test('bloc de code accepté', () => {
  const json = '{"pieces":[{"id":"h1","raison":"x"}],"resume":"z"}'
  for (const texte of ['```json\n' + json + '\n```', '```\n' + json + '\n```', '  ```JSON\r\n' + json + '\r\n```\n']) {
    assert.deepEqual(parseOutfit(texte, pieces), {
      ok: true,
      cards: [{ piece: pieces[0], raison: 'x' }],
      resume: 'z',
      missing: ['bas', 'chaussures']
    })
  }
})

test('catégorie manquante signalée', () => {
  const r = parseOutfit('{"pieces":[{"id":"h1","raison":"x"},{"id":"b1","raison":"y"}],"resume":"z"}', pieces)
  assert.deepEqual(r.missing, ['chaussures'])
})

test('une seule relance', async () => {
  let calls = 0
  const r = await askOutfit(async () => { calls += 1; return 'non' }, 'p', pieces)
  assert.equal(calls, 2)
  assert.equal(r.ok, false)
})

test('une bonne réponse ne relance pas', async () => {
  const demandes = []
  const r = await askOutfit(async (texte) => { demandes.push(texte); return '{"pieces":[{"id":"h1"}]}' }, 'p', pieces)
  assert.deepEqual(demandes, ['p'])
  assert.equal(r.ok, true)
})

test('la relance reprend la demande et peut réussir', async () => {
  const demandes = []
  const reponses = ['secret inventé', '{"pieces":[{"id":"h1"}]}']
  const r = await askOutfit(async (texte) => { demandes.push(texte); return reponses.shift() }, 'ma demande', pieces)
  assert.equal(r.ok, true)
  assert.equal(demandes.length, 2)
  assert.ok(demandes[1].startsWith('ma demande\n'))
  assert.ok(!demandes[1].includes('secret inventé'))
})

test('une erreur de Claude remonte sans relance', async () => {
  const limite = new Error('limite atteinte')
  for (const rang of [1, 2]) {
    let calls = 0
    const ask = async () => {
      calls += 1
      if (calls === rang) throw limite
      return 'non'
    }
    await assert.rejects(askOutfit(ask, 'p', pieces), (e) => e === limite)
    assert.equal(calls, rang)
  }
})
