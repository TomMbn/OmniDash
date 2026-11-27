import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isSafeReturnUrl, safeRedirect } from '../../src/utils/auth/redirect.js'

test('seul un chemin interne est accepté', () => {
  assert.equal(safeRedirect('/oauth/consent?authorization_id=abc'), '/oauth/consent?authorization_id=abc')
  for (const bad of [undefined, null, '', 'https://exemple.com', '//exemple.com', '/\\exemple.com', 'oauth', ['/a']]) {
    assert.equal(safeRedirect(bad), '/')
  }
})

test('un chemin avec un caractère de contrôle est refusé', () => {
  for (const bad of ['/\t/exemple.com', '/\n/exemple.com', '/\r\\exemple.com']) {
    assert.equal(safeRedirect(bad), '/')
  }
})

test('l’adresse de retour d’un client ne peut pas exécuter de code', () => {
  for (const good of ['https://claude.ai/api/mcp/auth_callback?code=a', 'http://localhost:3000/callback', 'cursor://retour?code=a']) {
    assert.equal(isSafeReturnUrl(good), true)
  }
  for (const bad of [undefined, '', '/interne', 'javascript:alert(1)', ' JavaScript:alert(1)', 'java\tscript:alert(1)', 'data:text/html,a', 'vbscript:a', 'blob:https://exemple.com/a', 'file:///etc/hosts']) {
    assert.equal(isSafeReturnUrl(bad), false)
  }
})
