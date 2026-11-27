// Teste ce qu'un vrai jeton OAuth permet de faire sur le projet Supabase.
// Usage : node --env-file=.env scripts/sonde-oauth.mjs compte|donnees
// Aucun jeton, code ou vérificateur ne doit être affiché ni écrit : les corps de
// réponse et les messages d'erreur de fetch ne sont donc jamais recopiés.
import { createHash, randomBytes } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { verdict, tablesDuCode, tablesDuSchema } from './sonde-regles.mjs'

const PORT = 8787
const RETOUR = `http://127.0.0.1:${PORT}/callback`
const ATTENTE_MS = 5 * 60 * 1000
const RACINE = fileURLToPath(new URL('..', import.meta.url))
const FONCTIONS = [
  'ai-stylist', 'analyze-nutrition', 'categorize-transactions', 'generate-travel',
  'netatmo-sync', 'save-push-subscription', 'smart-add-item', 'withings-sync'
]

class SondeError extends Error {}

const mode = process.argv[2]
const base = (process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '')
const cle = process.env.VITE_SUPABASE_ANON_KEY || ''

let echecs = 0
const alertes = []

const codeErreur = (err) => {
  const code = String(err?.cause?.code || err?.name || '')
  return /^\w{1,40}$/.test(code) ? code : 'inconnue'
}

const codeServeur = (body) =>
  [body?.error_code, body?.error].find((v) => typeof v === 'string' && /^[a-z_]{1,60}$/.test(v))

const reponse = (r) => (r.status ? `HTTP ${r.status}` : `aucune réponse, erreur ${r.erreur}`)
const detail = (r) => reponse(r) + (codeServeur(r.body) ? `, ${codeServeur(r.body)}` : '')
const accepte = (r) => r.status >= 200 && r.status < 300
// Un refus 4xx garantit que rien n'a été écrit ; tout le reste demande un nettoyage.
const rienEcrit = (r) => r.status >= 400 && r.status < 500

async function appel(url, { method = 'GET', headers = {}, body } = {}) {
  try {
    const res = await fetch(url, { method, headers, body, redirect: 'manual', signal: AbortSignal.timeout(30000) })
    const texte = await res.text()
    let corps = null
    try { corps = JSON.parse(texte) } catch {}
    return { status: res.status, body: corps }
  } catch (err) {
    return { status: 0, body: null, erreur: codeErreur(err) }
  }
}

function noter(nom, resultat, precision) {
  if (resultat !== 'ok') echecs += 1
  console.log(`${nom} : ${resultat} (${precision})`)
}

function controler(nom, check, r, remarque = '') {
  const resultat = verdict(check, r.status, r.body)
  noter(nom, resultat, reponse(r) + (resultat === 'ok' && remarque ? `, ${remarque}` : ''))
}

function alerter(message) {
  alertes.push(message)
  console.log(`\nALERTE : ${message}\n`)
}

async function decouvrir() {
  const r = await appel(`${base}/.well-known/oauth-authorization-server/auth/v1`, { headers: { apikey: cle } })
  if (r.status !== 200) {
    throw new SondeError(`Découverte impossible (${detail(r)}). Le serveur OAuth est-il activé ?`)
  }
  const adresses = {}
  for (const champ of ['authorization_endpoint', 'token_endpoint', 'registration_endpoint']) {
    const valeur = r.body?.[champ]
    if (!valeur) {
      throw new SondeError(`Découverte incomplète : ${champ} absent. L'enregistrement dynamique est-il activé ?`)
    }
    if (new URL(valeur).origin !== new URL(base).origin) {
      throw new SondeError(`Découverte suspecte : ${champ} ne pointe pas vers VITE_SUPABASE_URL. Arrêt.`)
    }
    adresses[champ] = valeur
  }
  return adresses
}

async function enregistrer(adresse) {
  const r = await appel(adresse, {
    method: 'POST',
    headers: { apikey: cle, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_name: 'Sonde OmniDash',
      redirect_uris: [RETOUR],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none'
    })
  })
  const id = r.body?.client_id
  if (!accepte(r) || typeof id !== 'string') {
    throw new SondeError(`Enregistrement du client refusé (${detail(r)}).`)
  }
  return id
}

async function ouvrirRetour(state) {
  let recevoir, abandonner
  const code = new Promise((resolve, reject) => { recevoir = resolve; abandonner = reject })
  code.catch(() => {})

  const serveur = createServer((req, res) => {
    const url = new URL(req.url, RETOUR)
    const repondre = (status, message, ensuite) => {
      res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', Connection: 'close' })
      res.end(message, ensuite)
    }
    if (url.pathname !== '/callback') return repondre(404, 'Page inconnue.')
    if (url.searchParams.get('state') !== state) {
      console.log('Retour ignoré : la valeur state ne correspond pas.')
      return repondre(400, 'Retour refusé.')
    }
    const recu = url.searchParams.get('code')
    if (!recu) {
      const motif = codeServeur({ error: url.searchParams.get('error') }) || 'code absent'
      return repondre(400, 'Autorisation non accordée.', () =>
        abandonner(new SondeError(`Autorisation non accordée (${motif}).`)))
    }
    repondre(200, 'Retour reçu. Tu peux fermer cette page et revenir au terminal.', () => recevoir(recu))
  })

  await new Promise((resolve, reject) => {
    serveur.once('error', (err) => reject(new SondeError(`Impossible d'écouter sur le port ${PORT} (${codeErreur({ cause: err })}).`)))
    serveur.listen(PORT, '127.0.0.1', resolve)
  })

  const attendre = async () => {
    const minuteur = setTimeout(() => abandonner(new SondeError('Aucun retour après 5 minutes. Arrêt.')), ATTENTE_MS)
    try { return await code } finally { clearTimeout(minuteur) }
  }
  return { attendre, fermer: () => { serveur.close(); serveur.closeAllConnections() } }
}

async function obtenirJeton() {
  const adresses = await decouvrir()
  const verificateur = randomBytes(32).toString('base64url')
  const state = randomBytes(16).toString('base64url')
  const retour = await ouvrirRetour(state)
  try {
    const client = await enregistrer(adresses.registration_endpoint)
    console.log(`Client « Sonde OmniDash » enregistré, à révoquer ensuite. Identifiant : ${/^[\w-]{1,100}$/.test(client) ? client : 'illisible'}`)

    const autorisation = new URL(adresses.authorization_endpoint)
    for (const [nom, valeur] of Object.entries({
      response_type: 'code',
      client_id: client,
      redirect_uri: RETOUR,
      state,
      code_challenge: createHash('sha256').update(verificateur).digest('base64url'),
      code_challenge_method: 'S256'
    })) autorisation.searchParams.set(nom, valeur)

    console.log(`\nOuvre cette adresse dans le navigateur :\n${autorisation.href}\n`)
    console.log("La page d'autorisation s'ouvre ensuite sur l'adresse du site configurée dans Supabase.")
    console.log("Si OmniDash n'y est pas déployé, lance npm run dev et remplace le début de l'adresse affichée par le navigateur (avant /oauth/consent) par http://localhost:5173\n")

    const code = await retour.attendre()
    const r = await appel(adresses.token_endpoint, {
      method: 'POST',
      headers: { apikey: cle, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: RETOUR,
        client_id: client,
        code_verifier: verificateur
      }).toString()
    })
    const jeton = r.body?.access_token
    if (r.status !== 200 || typeof jeton !== 'string' || !/^[\w.-]+$/.test(jeton)) {
      throw new SondeError(`Échange du code refusé (${detail(r)}).`)
    }
    console.log('Jeton obtenu (non affiché).\n')
    return jeton
  } finally {
    retour.fermer()
  }
}

async function sonderCompte(entetes) {
  const url = `${base}/auth/v1/user`
  // Sans jeton valide, un refus à l'écriture passerait à tort pour une protection.
  const lecture = await appel(url, { headers: entetes })
  if (lecture.status !== 200 || !lecture.body?.id) {
    throw new SondeError(`Contrôle préalable impossible : lecture du compte (${detail(lecture)}). Un refus à l'écriture ne prouverait rien. Aucun verdict.`)
  }

  // Seules les métadonnées sont touchées : jamais l'e-mail ni le mot de passe.
  const ecrire = (valeur) => appel(url, {
    method: 'PUT',
    headers: { ...entetes, 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { sonde_oauth: valeur } })
  })

  const essai = await ecrire(true)
  if (!rienEcrit(essai)) {
    const retrait = await ecrire(null)
    if (retrait.status === 200 && retrait.body?.id && retrait.body.user_metadata?.sonde_oauth == null) {
      console.log(`Nettoyage : sonde_oauth remise à null (${reponse(retrait)}).`)
    } else {
      alerter(`la métadonnée sonde_oauth ${accepte(essai) ? 'a été écrite' : 'a peut-être été écrite'} sur ton compte et son retrait a échoué (${detail(retrait)}). À retirer à la main dans Supabase, SQL Editor :\nupdate auth.users set raw_user_meta_data = raw_user_meta_data - 'sonde_oauth' where raw_user_meta_data ? 'sonde_oauth';`)
    }
  }
  controler('compte', 'compte', essai)
}

function listerTables() {
  const lire = (dossier, motif, extraire) =>
    readdirSync(join(RACINE, dossier), { recursive: true })
      .filter((fichier) => motif.test(fichier))
      .flatMap((fichier) => extraire(readFileSync(join(RACINE, dossier, fichier), 'utf8')))
  const tables = new Set([
    ...lire('src', /\.(js|ts|vue)$/, tablesDuCode),
    ...lire('supabase/functions', /\.(js|ts)$/, tablesDuCode),
    ...lire('supabase/schema', /\.sql$/, tablesDuSchema)
  ])
  tables.delete('wardrobe')
  if (!tables.size) throw new SondeError('Aucune table trouvée dans les sources. Arrêt.')
  return [...tables].sort()
}

async function essayerAjout(entetes, utilisateur, lectureOk) {
  const nom = 'ajout dans wardrobe'
  if (!utilisateur) return noter(nom, 'echec', 'non effectué, identifiant du compte introuvable')

  // Le marqueur unique garantit que le nettoyage ne vise que la ligne créée ici.
  const marqueur = `sonde-oauth-${randomBytes(6).toString('hex')}`
  const filtre = `${base}/rest/v1/wardrobe?name=eq.sonde&description=eq.${marqueur}`
  const representation = { ...entetes, Prefer: 'return=representation' }
  const ajout = await appel(`${base}/rest/v1/wardrobe`, {
    method: 'POST',
    headers: { ...representation, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: utilisateur, name: 'sonde', category: 'accessoire', sub_category: 'sonde', color: 'sonde',
      quantity: 1, style: 'casual', season: 'toutes', brand: null, description: marqueur, link: ''
    })
  })
  controler(nom, 'ecriture', ajout)
  if (rienEcrit(ajout)) return

  const ecrite = ajout.status === 201 || (accepte(ajout) && Array.isArray(ajout.body) && ajout.body.length > 0)
  const retrait = await appel(filtre, { method: 'DELETE', headers: representation })
  let propre = accepte(retrait) && Array.isArray(retrait.body) && retrait.body.length > 0
  if (!propre && !ecrite && lectureOk && accepte(retrait)) {
    const reste = await appel(filtre, { headers: entetes })
    propre = reste.status === 200 && Array.isArray(reste.body) && reste.body.length === 0
  }
  if (propre) {
    console.log(`Nettoyage : aucune ligne de test ne reste (${reponse(retrait)}).`)
  } else {
    alerter(`la ligne de test ${ecrite ? 'a été ajoutée' : 'a peut-être été ajoutée'} dans wardrobe et sa suppression n'est pas confirmée (${detail(retrait)}). À supprimer à la main dans Supabase, Table Editor, table wardrobe : la ligne dont name vaut sonde et description vaut ${marqueur}`)
  }
}

async function sonderDonnees(entetes, utilisateur, tables) {
  const dressing = await appel(`${base}/rest/v1/wardrobe?select=id,name,user_id&limit=1`, { headers: entetes })
  const lectureOk = verdict('lecture-dressing', dressing.status, dressing.body) === 'ok'
  controler('lecture du dressing', 'lecture-dressing', dressing)
  if (!lectureOk) {
    console.log("Attention : sans lecture du dressing, les refus qui suivent ne prouvent rien (le jeton n'est peut-être pas accepté).")
  }
  const piece = lectureOk ? dressing.body[0] : null

  console.log(`\nLecture des autres tables (${tables.length}) :`)
  const sansLigne = []
  for (const table of tables) {
    const r = await appel(`${base}/rest/v1/${table}?select=*&limit=1`, { headers: entetes })
    if (r.status === 200 && Array.isArray(r.body) && !r.body.length) sansLigne.push(table)
    controler(`lecture de ${table}`, 'lecture-autre', r, 'aucune ligne : ne prouve rien si la table est vide')
  }

  console.log('\nÉcritures dans le dressing :')
  await essayerAjout(entetes, utilisateur, lectureOk)

  // Le nom est réécrit à l'identique : même acceptée, cette écriture ne change rien.
  if (piece?.id != null && typeof piece.name === 'string') {
    const r = await appel(`${base}/rest/v1/wardrobe?id=eq.${encodeURIComponent(piece.id)}`, {
      method: 'PATCH',
      headers: { ...entetes, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ name: piece.name })
    })
    controler("modification d'une pièce", 'ecriture', r)
  } else {
    noter("modification d'une pièce", 'echec', 'non effectuée, aucune pièce lisible')
  }

  console.log('\nStockage :')
  const stockage = await appel(`${base}/storage/v1/bucket`, { headers: entetes })
  controler('liste des espaces de stockage', 'stockage', stockage, "liste vide : ne prouve rien si aucun espace n'existe")

  console.log('\nFonctions :')
  for (const fonction of FONCTIONS) {
    const r = await appel(`${base}/functions/v1/${fonction}`, {
      method: 'POST',
      headers: { ...entetes, 'Content-Type': 'application/json' },
      body: '{}'
    })
    controler(`fonction ${fonction}`, 'fonction', r)
  }

  if (sansLigne.length) {
    console.log(`\nUne table vide ne prouve rien. Vérifie dans Supabase que ces tables contiennent des lignes : ${sansLigne.join(', ')}`)
  }
}

const lireUtilisateur = (jeton) => {
  try {
    const { sub } = JSON.parse(Buffer.from(jeton.split('.')[1], 'base64url').toString())
    return typeof sub === 'string' ? sub : null
  } catch {
    return null
  }
}

async function principal() {
  if (mode !== 'compte' && mode !== 'donnees') {
    throw new SondeError('Usage : node --env-file=.env scripts/sonde-oauth.mjs compte|donnees')
  }
  if (!base || !cle) {
    throw new SondeError('VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY manquante.')
  }
  const tables = mode === 'donnees' ? listerTables() : []

  console.log(`Sonde OmniDash, mode ${mode}`)
  const jeton = await obtenirJeton()
  const entetes = { apikey: cle, Authorization: `Bearer ${jeton}` }

  if (mode === 'compte') await sonderCompte(entetes)
  else await sonderDonnees(entetes, lireUtilisateur(jeton), tables)

  console.log(`\nNombre d'échecs : ${echecs}`)
  for (const alerte of alertes) console.log(`\nALERTE, nettoyage à faire : ${alerte}`)
  console.log('\nPense à révoquer le client « Sonde OmniDash » et à désactiver son enregistrement dynamique.')
  if (echecs || alertes.length) process.exitCode = 1
}

principal().catch((err) => {
  console.error(err instanceof SondeError ? err.message : `Erreur inattendue (${codeErreur(err)}).`)
  process.exitCode = 1
})
