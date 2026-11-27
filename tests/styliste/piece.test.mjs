import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toPiece } from '../../supabase/functions/omnidash-mcp/piece.js'

test('seuls les champs prévus sortent de la base', () => {
  const piece = toPiece({ id: 7, user_id: 'secret', created_at: 'x', name: 'Chino', category: 'Bas', color: 'marine', brand: null, quantity: null, link: 'http://exemple.com' })
  assert.deepEqual(piece, { id: '7', nom: 'Chino', categorie: 'bas', sousCategorie: null, couleur: 'marine', marque: null, quantite: 1, style: null, lien: null })
  assert.equal(toPiece({ id: 1, name: 'a', category: 'haut', link: 'https://exemple.com/a' }).lien, 'https://exemple.com/a')
})
