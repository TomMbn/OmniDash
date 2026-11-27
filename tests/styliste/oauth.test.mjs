import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isOAuthClientToken, refuseOAuthClient } from '../../supabase/functions/_shared/oauth.js'

const jwt = (claims) => `Bearer x.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.y`

const requete = (authorization) =>
  new Request('http://localhost/fonction', {
    method: 'POST',
    headers: authorization === undefined ? {} : { Authorization: authorization }
  })

test('reconnaît un jeton de client externe', () => {
  assert.equal(isOAuthClientToken(jwt({ sub: 'u', client_id: 'abc' })), true)
  assert.equal(isOAuthClientToken(jwt({ sub: 'u' })), false)
  assert.equal(isOAuthClientToken(null), false)
})

test('un jeton illisible est refusé', () => {
  assert.equal(isOAuthClientToken('Bearer n-importe-quoi'), true)
  for (const authorization of [
    '',
    'Bearer ',
    'Basic abc',
    'Bearer x.@@@.y',
    'Bearer x.bm9uLWpzb24.y',
    jwt(null),
    jwt('texte'),
    jwt(['liste']),
    `${jwt({ sub: 'u' })}.z`,
    `${jwt({ sub: 'u' })}, ${jwt({ sub: 'u', client_id: 'abc' })}`
  ]) {
    assert.equal(isOAuthClientToken(authorization), true, authorization)
  }
})

test('la mention client_id suit la condition de la base', () => {
  // En SQL, seule l'absence ou la valeur null laisse passer.
  assert.equal(isOAuthClientToken(jwt({ sub: 'u', client_id: '' })), true)
  assert.equal(isOAuthClientToken(jwt({ sub: 'u', client_id: null })), false)
})

test('le décodage accepte le base64url et les accents', () => {
  const claims = { sub: 'u', nom: 'Zoé ÿ>?~~~', client_id: 'abc' }
  assert.match(jwt(claims), /[-_]/)
  assert.equal(isOAuthClientToken(jwt(claims)), true)
  assert.equal(isOAuthClientToken(jwt({ sub: 'u', nom: 'Zoé ÿ>?~~~' })), false)
  assert.equal(isOAuthClientToken(jwt({ sub: 'u' }).replace('Bearer', 'bearer')), false)
})

test('refuse un client externe avec un 403 et les en-têtes de la fonction', async () => {
  const cors = { 'Access-Control-Allow-Origin': '*' }
  const refus = refuseOAuthClient(requete(jwt({ sub: 'u', client_id: 'abc' })), cors)
  assert.equal(refus.status, 403)
  assert.equal(refus.headers.get('access-control-allow-origin'), '*')
  assert.equal(refus.headers.get('content-type'), 'application/json')
  assert.deepEqual(await refus.json(), { error: 'Accès refusé' })
})

test('laisse passer une connexion normale', () => {
  assert.equal(refuseOAuthClient(requete(jwt({ sub: 'u' })), {}), null)
  assert.equal(refuseOAuthClient(requete(undefined), {}), null)
})
