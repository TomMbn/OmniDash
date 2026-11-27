import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const config = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'))

test('aucune page ne peut être affichée dans un cadre', () => {
  const headers = (config.headers ?? [])
    .filter((rule) => rule.source === '/(.*)')
    .flatMap((rule) => rule.headers)
  const valueOf = (key) => headers.find((header) => header.key === key)?.value
  assert.equal(valueOf('X-Frame-Options'), 'DENY')
  assert.equal(valueOf('Content-Security-Policy'), "frame-ancestors 'none'")
})

test('toutes les adresses mènent toujours à l’application', () => {
  assert.deepEqual(config.rewrites, [{ source: '/(.*)', destination: '/index.html' }])
})
