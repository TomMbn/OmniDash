import { test } from 'node:test'
import assert from 'node:assert/strict'
import { verdict, tablesDuCode, tablesDuSchema } from '../../scripts/sonde-regles.mjs'

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
