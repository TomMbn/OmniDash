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

// Tâche 6 : historique absent, dressing, pannes, demandes, manques.

import {
  normalizePieces, connectorFailure, buildOutfitPrompt, buildManquesPrompt,
  parseManques, askManques, manquesForStorage, storedManques,
  historyFromDocs, historyRows, makeEntry, repeatNotes
} from '../../artifacts/styliste/logic.js'

test('historique absent ou ids invalides ne lèvent rien', () => {
  const cas = [
    undefined, null, 42, 'texte', [],
    { '2026-11-26': { ids: 'h1' } }, { '2026-11-26': { ids: { length: 1 } } },
    { '2026-11-26': { ids: null } }, { '2026-11-26': 'h1' }
  ]
  for (const history of cas) {
    assert.deepEqual(availableFor(pieces, history, '2026-11-27'), { pieces, repeats: [] })
  }
})

test('ids non textuels ignorés dans la veille', () => {
  const r = availableFor(pieces, { '2026-11-26': { ids: [null, 3, 'h1'] } }, '2026-11-27')
  assert.deepEqual(r.pieces.map((x) => x.id), ['h2', 'b1', 'c1'])
})

test('le dressing du connecteur est nettoyé', () => {
  const r = normalizePieces({
    pieces: [
      { id: 'a', nom: 'Chemise', categorie: 'haut', couleur: 'noir', marque: 'X', quantite: 2, style: 'sobre', lien: 'https://x.fr', autre: 'secret' },
      { id: 'b', nom: 'Jean', categorie: 'bas', couleur: { toString: 1 }, lien: 3 },
      { id: 'a', nom: 'Doublon', categorie: 'haut' },
      { id: '', nom: 'Vide', categorie: 'haut' },
      { nom: 'Sans id', categorie: 'haut' },
      { id: 'c', nom: 4, categorie: 'haut' },
      null, 'x', 7
    ]
  })
  assert.deepEqual(r, [
    { id: 'a', nom: 'Chemise', categorie: 'haut', sousCategorie: '', couleur: 'noir', marque: 'X', quantite: 2, style: 'sobre', lien: 'https://x.fr' },
    { id: 'b', nom: 'Jean', categorie: 'bas', sousCategorie: '', couleur: '', marque: '', quantite: 1, style: '', lien: '' }
  ])
})

test('un dressing mal formé est refusé, un vide est accepté', () => {
  for (const bad of [undefined, null, 'x', [], {}, { pieces: 'x' }, { pieces: { length: 0 } }]) {
    assert.equal(normalizePieces(bad), null)
  }
  assert.deepEqual(normalizePieces({ pieces: [] }), [])
})

test('accès refusé : la copie n’est pas utilisée', () => {
  for (const code of ['blocked_by_policy', 'approval_required', 'not_in_manifest', 'not_granted', 'consent_required']) {
    const r = connectorFailure(code)
    assert.equal(r.useCache, false, code)
    assert.equal(r.stop, false, code)
    assert.ok(r.message.length > 0)
  }
})

test('connecteur absent ou connexion expirée : la copie datée est utilisée', () => {
  const messages = new Set()
  for (const code of ['needs_reauth', 'server_not_connected', 'selection_required', 'server_not_found', 'absent', 'capability_disabled', 'capability_removed']) {
    const r = connectorFailure(code)
    assert.equal(r.useCache, true, code)
    assert.equal(r.stop, false, code)
    messages.add(r.message)
  }
  assert.ok(connectorFailure('needs_reauth').message.includes('Reconnectez'))
  assert.ok(connectorFailure('server_not_connected').message.includes('Ajoutez'))
  assert.ok(messages.size >= 4)
})

test('panne passagère ou code inconnu : la copie est utilisée', () => {
  for (const code of ['server_unavailable', 'upstream_error', 'tool_error', 'rate_limited', 'code_inconnu', undefined]) {
    const r = connectorFailure(code)
    assert.equal(r.useCache, true, String(code))
    assert.equal(r.stop, false)
    assert.ok(r.message.length > 0)
  }
})

test('compte changé : rien de la copie et plus aucun appel', () => {
  const r = connectorFailure('user_changed')
  assert.equal(r.useCache, false)
  assert.equal(r.stop, true)
  assert.ok(r.message.length > 0)
})

test('la demande de tenue ne contient ni liens ni pièces absentes', () => {
  const avecLien = [{ ...pieces[0], lien: 'https://boutique.fr/h1', couleur: 'noir' }, pieces[2]]
  const prompt = buildOutfitPrompt(avecLien, 'Travail', 'Froid')
  assert.ok(!prompt.includes('https://'))
  assert.ok(!prompt.includes('lien'))
  assert.ok(prompt.includes('"h1"') && prompt.includes('"b1"'))
  assert.ok(!prompt.includes('"h2"'))
  assert.ok(prompt.includes('Travail') && prompt.includes('Froid'))
  assert.match(prompt, /uniquement avec un objet JSON/)
})

test('le vert est une contrainte, jamais une préférence', () => {
  for (const prompt of [buildOutfitPrompt(pieces, 'Détente', 'Chaud'), buildManquesPrompt(pieces)]) {
    assert.match(prompt, /vert n’est pas une couleur préférée/)
    assert.match(prompt, /sombre et éteint/)
    assert.match(prompt, /jamais vif/)
    const couleurs = prompt.split('\n').find((ligne) => ligne.includes('tons terre et noir'))
    assert.ok(couleurs && !couleurs.includes('vert'))
  }
})

test('la demande des manques donne le profil sans liens', () => {
  const prompt = buildManquesPrompt([{ ...pieces[0], lien: 'https://boutique.fr/h1' }])
  assert.ok(!prompt.includes('https://'))
  assert.match(prompt, /1,90 m/)
  assert.match(prompt, /80 à 85 kg/)
  assert.match(prompt, /côtel/)
  assert.match(prompt, /de 5 à 7/)
  assert.match(prompt, /uniquement avec un objet JSON/)
})

const manque = (associer = ['h1', 'b1']) => ({ piece: 'Pull', coupe: 'droite', matiere: 'laine', couleur: 'brun', repli: 'gilet', associer })
const reponseManques = (n, associer) => JSON.stringify({ manques: Array.from({ length: n }, () => manque(associer)) })

test('manques : 5 à 7 éléments acceptés, associer tiré du dressing', () => {
  for (const n of [5, 7]) {
    const r = parseManques(reponseManques(n), pieces)
    assert.equal(r.ok, true)
    assert.equal(r.items.length, n)
    assert.deepEqual(r.items[0].associer, [pieces[0], pieces[2]])
    assert.equal(r.items[0].matiere, 'laine')
  }
})

test('manques : 4 éléments refusés', () => {
  assert.equal(parseManques(reponseManques(4), pieces).ok, false)
})

test('manques : 8 éléments refusés', () => {
  assert.equal(parseManques(reponseManques(8), pieces).ok, false)
})

test('manques : identifiant inconnu refusé', () => {
  assert.equal(parseManques(reponseManques(5, ['h1', 'inconnu']), pieces).ok, false)
  assert.equal(parseManques(reponseManques(5, ['h1', '__proto__']), pieces).ok, false)
})

test('manques : champs et associer mal formés refusés', () => {
  const casse = (champ, valeur) => JSON.stringify({ manques: Array.from({ length: 5 }, () => ({ ...manque(), [champ]: valeur })) })
  for (const [champ, valeur] of [
    ['piece', ''], ['coupe', 3], ['matiere', null], ['couleur', { toString: 1 }], ['repli', '  '],
    ['associer', 'h1'], ['associer', []], ['associer', ['h1']], ['associer', ['h1', 'h2', 'b1', 'c1']], ['associer', ['h1', 'h1']]
  ]) {
    assert.equal(parseManques(casse(champ, valeur), pieces).ok, false, `${champ} ${JSON.stringify(valeur)}`)
  }
})

test('manques : un dressing d’une pièce permet un seul associé', () => {
  const seul = [pieces[0]]
  assert.equal(parseManques(reponseManques(5, ['h1']), seul).ok, true)
})

test('manques : aucune réponse ne fait lever une erreur', () => {
  for (const texte of [undefined, null, 4, '', 'non', '[]', '{}', '{"manques":null}', '{"manques":[null,1,"x",[],{}]}', '['.repeat(100000)]) {
    const r = parseManques(texte, pieces)
    assert.equal(r.ok, false)
    assert.ok(r.error.length > 0)
  }
})

test('manques : une seule relance, erreur remontée', async () => {
  let calls = 0
  assert.equal((await askManques(async () => { calls += 1; return 'non' }, 'p', pieces)).ok, false)
  assert.equal(calls, 2)
  const demandes = []
  const reponses = ['x', reponseManques(6)]
  const r = await askManques(async (t) => { demandes.push(t); return reponses.shift() }, 'p', pieces)
  assert.equal(r.ok, true)
  assert.ok(demandes[1].startsWith('p\n'))
  const limite = new Error('limite')
  await assert.rejects(askManques(async () => { throw limite }, 'p', pieces), (e) => e === limite)
})

test('manques gardés : stockage par identifiants et relecture tolérante', () => {
  const items = parseManques(reponseManques(5), pieces).items
  const stock = manquesForStorage(items)
  assert.deepEqual(stock[0], manque())
  const relu = storedManques({ date: '2026-11-27', items: stock }, [pieces[0]])
  assert.equal(relu.date, '2026-11-27')
  assert.deepEqual(relu.items[0].associer, [pieces[0]])
  for (const bad of [undefined, null, {}, { items: 'x' }, { date: 3, items: [] }]) assert.equal(storedManques(bad, pieces), null)
  assert.equal(storedManques({ date: '2026-11-27', items: [null, { piece: 1 }] }, pieces).items.length, 0)
})

test('historique lu depuis la base', () => {
  const h = historyFromDocs([
    { id: '2026-11-26', data: { ids: ['h1', 3], noms: ['H1', null], occasion: 'Travail', meteo: 'Froid', resume: 'ok' } },
    { id: '2026-11-27', data: { ids: ['b1'] } },
    { id: 'pas-une-date', data: { ids: ['h1'] } },
    { id: '2026-11-25', data: { ids: 'h1' } },
    { id: '2026-11-24', data: null }
  ])
  assert.deepEqual(h, {
    '2026-11-26': { ids: ['h1'], noms: ['H1'], occasion: 'Travail', meteo: 'Froid', resume: 'ok' },
    '2026-11-27': { ids: ['b1'], noms: [], occasion: '', meteo: '', resume: '' }
  })
  assert.deepEqual(historyRows(h).map((x) => x.date), ['2026-11-27', '2026-11-26'])
  assert.deepEqual(historyFromDocs(null), {})
})

test('entrée d’historique depuis une tenue', () => {
  const r = parseOutfit('{"pieces":[{"id":"h1"},{"id":"b1"}],"resume":"bien"}', pieces)
  assert.deepEqual(makeEntry(r, 'Soirée', 'Pluie'), { ids: ['h1', 'b1'], noms: ['h1', 'b1'], occasion: 'Soirée', meteo: 'Pluie', resume: 'bien' })
})

test('répétitions expliquées pour les pièces retenues seulement', () => {
  const r = parseOutfit('{"pieces":[{"id":"h1"},{"id":"b1"}]}', pieces)
  const notes = repeatNotes(r.cards, ['b1', 'h2'])
  assert.equal(notes.length, 1)
  assert.equal(notes[0].piece, pieces[2])
  assert.match(notes[0].message, /hier/)
  assert.match(notes[0].message, /aucun autre bas/)
})
