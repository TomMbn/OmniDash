import { test } from 'node:test'
import assert from 'node:assert/strict'
import { logoFor } from '../../src/utils/finance/logos.js'

test('un service connu reçoit son logo', () => {
  const logo = logoFor('Netflix', 'NETFLIX COM')
  assert.equal(logo.type, 'svg')
  assert.equal(logo.title, 'Netflix')
  assert.match(logo.color, /^#[0-9A-F]{6}$/i)
  assert.ok(logo.path.length > 10)
})

test('le motif suffit quand le nom est générique', () => {
  assert.equal(logoFor('Musique', 'CB SPOTIFYP2A1B').title, 'Spotify')
  assert.equal(logoFor('Apple Music', '').title, 'Apple Music')
})

test('un nom proche d\'une marque ne la déclenche pas à tort', () => {
  assert.equal(logoFor("L'Orange Bleue", 'PRLV ORANGE BLEUE').type, 'initial')
})

test('repli sur l\'initiale avec une couleur stable', () => {
  const a = logoFor('Club de lecture Martin', 'PRLV CLUB LECTURE')
  const b = logoFor('Club de lecture Martin', 'PRLV CLUB LECTURE')
  assert.equal(a.type, 'initial')
  assert.equal(a.letter, 'C')
  assert.equal(a.color, b.color)
  assert.match(a.color, /^var\(--module-[a-z]+\)$/)
  assert.match(a.background, /^var\(--module-[a-z]+-dim\)$/)
})

test('les couleurs de repli varient selon le nom', () => {
  const names = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel']
  const colors = new Set(names.map((n) => logoFor(n, '').color))
  assert.ok(colors.size >= 3)
})
