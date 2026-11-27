import { test } from 'node:test'
import assert from 'node:assert/strict'
import { verdict, verdictDressing, verdictRafraichissement, tablesDuCode, tablesDuSchema } from '../../scripts/sonde-regles.mjs'

test('verdicts de la sonde', () => {
  assert.equal(verdict('compte', 403, {}), 'ok')
  assert.equal(verdict('compte', 200, { id: 'x' }), 'echec')
  assert.equal(verdict('lecture-autre', 200, []), 'ok')
  assert.equal(verdict('lecture-autre', 200, [{ id: 1 }]), 'echec')
  assert.equal(verdict('lecture-dressing', 200, [{ id: 1 }]), 'ok')
  assert.equal(verdict('lecture-dressing', 200, []), 'echec')
  assert.equal(verdict('ecriture', 200, []), 'ok')
  assert.equal(verdict('ecriture', 201, [{ id: 1 }]), 'echec')
  assert.equal(verdict('fonction', 403, {}), 'ok')
  assert.equal(verdict('fonction', 200, {}), 'echec')
  assert.equal(verdict('stockage', 200, []), 'ok')
  assert.equal(verdict('lecture-autre', 500, {}), 'echec')
})

test('rien de douteux ne passe pour ok', () => {
  for (const check of ['compte', 'lecture-autre', 'lecture-dressing', 'ecriture', 'fonction', 'stockage']) {
    for (const status of [undefined, 0, 204, 302, 400, 404, 429, 500]) {
      assert.equal(verdict(check, status, []), 'echec')
    }
  }
  assert.equal(verdict('lecture-autre', 200, {}), 'echec')
  assert.equal(verdict('stockage', 200, null), 'echec')
  assert.equal(verdict('inconnu', 403, {}), 'echec')
  assert.equal(verdict('lecture-dressing', 401, {}), 'echec')
})

test('les tables sont trouvées dans le code et le schéma', () => {
  const code = "supabase.from('trips')\n  .from(\"workouts\")\n storage.from('photos'); Array.from('abc'); Uint8Array.from([1])"
  assert.deepEqual(tablesDuCode(code), ['trips', 'workouts'])
  const sql = '-- alter table oubliee\ncreate table if not exists public.a_b (id int);\nCREATE TABLE c (id int);\nalter table if exists d add column e int;'
  assert.deepEqual(tablesDuSchema(sql), ['a_b', 'c', 'd'])
})

const jetonAvec = (claims) => `x.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.y`

test('le dressing lu ne contient que les lignes du compte du jeton', () => {
  const mienne = { id: 1, user_id: 'moi' }
  assert.equal(verdictDressing(200, [mienne, { id: 2, user_id: 'moi' }], 'moi'), 'ok')
  assert.equal(verdictDressing(200, [mienne, { id: 2, user_id: 'autre' }], 'moi'), 'echec')
  assert.equal(verdictDressing(200, [mienne, { id: 2 }], 'moi'), 'echec')
  assert.equal(verdictDressing(200, [{ id: 2, user_id: null }], null), 'echec')
  assert.equal(verdictDressing(200, [{ id: 2 }], undefined), 'echec')
  assert.equal(verdictDressing(200, [{ id: 2, user_id: '' }], ''), 'echec')
  assert.equal(verdictDressing(200, [null], 'moi'), 'echec')
  assert.equal(verdictDressing(200, [], 'moi'), 'echec')
  assert.equal(verdictDressing(403, [mienne], 'moi'), 'echec')
})

test('un rafraîchissement refusé avec une erreur reconnue vaut ok', () => {
  for (const status of [400, 401, 403]) {
    for (const body of [{ error: 'invalid_grant' }, { code: status, error_code: 'refresh_token_not_found' }]) {
      assert.deepEqual(verdictRafraichissement(status, body), { resultat: 'ok', motif: 'refus' })
    }
  }
})

test('un rafraîchissement qui garde client_id vaut ok, sans client_id il échoue', () => {
  const rendu = (claims) => verdictRafraichissement(200, { access_token: jetonAvec(claims) })
  assert.deepEqual(rendu({ sub: 'u', client_id: 'abc' }), { resultat: 'ok', motif: 'session-client' })
  for (const claims of [{ sub: 'u' }, { sub: 'u', client_id: '' }, { sub: 'u', client_id: null }, { sub: 'u', client_id: 1 }]) {
    assert.deepEqual(rendu(claims), { resultat: 'echec', motif: 'session-normale' })
  }
})

test('tout autre retour du rafraîchissement échoue', () => {
  const inattendu = { resultat: 'echec', motif: 'inattendu' }
  for (const status of [undefined, 0, 201, 204, 302, 404, 422, 429, 500]) {
    assert.deepEqual(verdictRafraichissement(status, { error: 'invalid_grant' }), inattendu)
  }
  for (const body of [null, {}, [], { message: 'Invalid API key' }, { error: 'Texte libre' }, { code: 401 }]) {
    assert.deepEqual(verdictRafraichissement(401, body), inattendu)
  }
  for (const body of [null, {}, { access_token: '' }, { access_token: 'illisible' }, { access_token: 'x.bm9u.y' }, { access_token: jetonAvec(null) }]) {
    assert.deepEqual(verdictRafraichissement(200, body), inattendu)
  }
})
