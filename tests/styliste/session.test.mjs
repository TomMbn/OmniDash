import { test } from 'node:test'
import assert from 'node:assert/strict'
import { requireUser } from '../../supabase/functions/_shared/session.js'

const req = (authorization) => new Request('http://local', { method: 'POST', headers: authorization ? { Authorization: authorization } : {} })

test('sans en-tête, refus sans interroger le serveur', async () => {
  let calls = 0
  const res = await requireUser(req(), {}, async () => { calls += 1; return { id: 'u' } })
  assert.equal(res.status, 401)
  assert.equal(calls, 0)
})

test('seul un utilisateur reconnu passe', async () => {
  assert.equal(await requireUser(req('Bearer a'), {}, async () => ({ id: 'u' })), null)
  assert.equal((await requireUser(req('Bearer a'), {}, async () => null)).status, 401)
  assert.equal((await requireUser(req('Bearer a'), {}, async () => { throw new Error('x') })).status, 401)
})

test('transmet l\'en-tête reçu et répond avec les en-têtes de la fonction', async () => {
  let recu
  const cors = { 'Access-Control-Allow-Origin': '*' }
  const res = await requireUser(req('Bearer a'), cors, async (authorization) => { recu = authorization; return undefined })
  assert.equal(recu, 'Bearer a')
  assert.equal(res.status, 401)
  assert.equal(res.headers.get('access-control-allow-origin'), '*')
  assert.equal(res.headers.get('content-type'), 'application/json')
  assert.deepEqual(await res.json(), { error: 'Connexion requise' })
})
