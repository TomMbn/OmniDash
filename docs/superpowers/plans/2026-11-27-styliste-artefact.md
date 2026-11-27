# Plan de réalisation : styliste IA dans un artefact

> Pour l'agent qui exécute : utiliser superpowers:executing-plans (ou superpowers:subagent-driven-development), tâche par tâche. Les cases à cocher servent au suivi.

But : un artefact Claude privé qui compose des tenues à partir du dressing d'OmniDash, lu par un connecteur limité à cette seule table.

Architecture : une fonction Edge `omnidash-mcp` expose un outil de lecture, protégé par le serveur OAuth de Supabase. La base et les fonctions existantes refusent le reste aux jetons OAuth. L'artefact utilise `mcp`, `sample` et `db`.

Technique : Vue 3, Supabase (Postgres, Auth, Edge Functions Deno), `@supabase/supabase-js` 2.110.1 déjà installé, tests `node --test`.

Conception : `docs/superpowers/specs/2026-11-27-styliste-artefact-design.md`

## Contraintes générales

- Commits locaux sur la branche `feat/styliste-artefact`, avec l'accord de l'utilisateur : messages courts, sans ligne `Co-Authored-By`, adresse `tom.mauboussin@icloud.com`. Aucun push ni fusion sans demande.
- Ne jamais lire `.env`, ne jamais se connecter à Supabase ni exécuter de SQL. L'utilisateur le fait lui-même.
- Aucun marqueur d'écriture IA dans le code, les textes et les messages : pas de tiret cadratin, pas de flèche, pas de gras superflu.
- Interface et messages en français. Pas d'émoji.
- Le connecteur a un seul outil, `lire_dressing`, sans paramètre, en lecture seule. La clé secrète n'est jamais utilisée.
- Nom du connecteur dans claude.ai : `OmniDash`.
- Occasions : Travail, Sport, Soirée, Détente. Météo : Chaud, Pluie, Froid.
- Catégories de pièces : `haut`, `veste`, `bas`, `chaussures`, `accessoire`.
- « La veille » est le jour calendaire précédent à l'heure de Paris. Seules les tenues portées comptent.
- Profil d'analyse : 1,90 m, 80 à 85 kg, coupes droites ou légèrement amples, tons terre et noir à parts égales, vert sombre un peu éteint apprécié, matières naturelles de préférence, pas de finitions côtelées sur un blouson. Confirmé le 27 novembre.
- Trois barrières (A, B, C) arrêtent le travail. Si l'une échoue sans correction possible : suivre « Retour en arrière », puis proposer le copier-coller et attendre l'accord.

## Points à surveiller

1. Un seul bas disponible, porté la veille : la tenue le reprend et le dit (tâche 5).
2. Claude renvoie un identifiant inconnu ou un texte qui n'est pas du JSON : rejet, une seule relance, puis message (tâche 5).
3. Dernière tenue portée avant-hier : aucune pièce n'est bloquée (tâche 5).
4. Autour de minuit et au changement d'heure : la date suit Paris, pas l'heure universelle (tâche 5).
5. Une adresse de retour externe après connexion, comme `//exemple.com` : retour à l'accueil (tâche 1).

## Fichiers

| Fichier | Rôle |
|---|---|
| `src/utils/auth/redirect.js` | adresse de retour sûre |
| `src/views/OAuthConsentView.vue` | page d'autorisation |
| `src/router/index.js`, `src/views/LoginView.vue` | route et retour après connexion |
| `scripts/sonde-oauth.mjs`, `scripts/sonde-regles.mjs` | test d'un vrai jeton et verdicts |
| `supabase/schema/dressing_mcp.sql`, `dressing_mcp_retrait.sql` | restrictions et leur retrait |
| `supabase/functions/_shared/oauth.js` | refus des jetons OAuth |
| `supabase/functions/omnidash-mcp/index.ts`, `piece.js` | connecteur |
| `artifacts/styliste/index.html`, `logic.js` | artefact |
| `tests/styliste/*.test.mjs` | tests |

---

### Task 1: page d'autorisation et retour après connexion

Fichiers : créer `src/utils/auth/redirect.js`, `src/views/OAuthConsentView.vue`, `tests/styliste/redirect.test.mjs` ; modifier `src/router/index.js` et `src/views/LoginView.vue`.

Produit : `safeRedirect(value: unknown): string`, route `/oauth/consent` (nom `OAuthConsent`, `requiresAuth: true`).

- [ ] Écrire le test.

```js
test('seul un chemin interne est accepté', () => {
  assert.equal(safeRedirect('/oauth/consent?authorization_id=abc'), '/oauth/consent?authorization_id=abc')
  for (const bad of [undefined, null, '', 'https://exemple.com', '//exemple.com', '/\\exemple.com', 'oauth', ['/a']]) {
    assert.equal(safeRedirect(bad), '/')
  }
})
```

- [ ] `npm test` : échec attendu, module absent.
- [ ] Écrire `safeRedirect`. `npm test` : tout passe.
- [ ] Garde de navigation : sans session, aller vers `Login` avec `query: { redirect: to.fullPath }`. Sur `Login` avec session, aller vers `safeRedirect(to.query.redirect)`.
- [ ] `LoginView` : après `login`, `router.push(safeRedirect(route.query.redirect))`.
- [ ] `OAuthConsentView` : lire `authorization_id` ; appeler `supabase.auth.oauth.getAuthorizationDetails(id)`. Si la réponse ne contient pas `authorization_id`, l'accès a déjà été accordé : suivre son `redirect_url`. Sinon afficher le nom du client, l'adresse de retour complète et la phrase « Ce client agira avec les droits que la base accorde aux connexions externes. » Boutons « Autoriser » et « Refuser », qui appellent `approveAuthorization(id)` ou `denyAuthorization(id)` puis suivent `data.redirect_url`. États : chargement, demande absente ou expirée, erreur. Reprendre les styles Aurore de `LoginView`.
- [ ] `npm test` et `npm run build` réussissent. Vérifier en local que `/oauth/consent` sans identifiant affiche le message prévu, si une session est disponible. Sinon le signaler.
- [ ] Point de contrôle.

### Task 2: sonde d'un vrai jeton

Fichiers : créer `scripts/sonde-regles.mjs`, `scripts/sonde-oauth.mjs`, `tests/styliste/sonde.test.mjs`.

Produit : `verdict(check, status, body): 'ok' | 'echec'`, avec `check` parmi `compte`, `lecture-autre`, `lecture-dressing`, `ecriture`, `fonction`, `stockage`. Commande :

```bash
node --env-file=.env scripts/sonde-oauth.mjs compte
```

Elle accepte `compte` ou `donnees`. L'utilisateur la lance lui-même ; elle lit `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (vérifier ces noms dans `src/supabase.js`).

- [ ] Écrire le test.

```js
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
```

Un statut 401 ou 403 vaut `ok` partout sauf pour `lecture-dressing`. Tout statut inattendu vaut `echec`.

- [ ] Le voir échouer, écrire `verdict`, le voir passer.
- [ ] Écrire la sonde : lire la découverte à `/.well-known/oauth-authorization-server/auth/v1`, enregistrer un client public nommé `Sonde OmniDash` avec le retour `http://127.0.0.1:8787/callback`, utiliser PKCE S256, écouter sur ce port, vérifier `state`, échanger le code. Afficher l'adresse d'autorisation. Ne jamais afficher ni écrire un jeton.
- [ ] Mode `compte` : `PUT /auth/v1/user` avec `{ "data": { "sonde_oauth": true } }`. Si c'est accepté, remettre aussitôt `sonde_oauth` à `null` et conclure à l'échec. Ne jamais tenter de changer l'e-mail ou le mot de passe.
- [ ] Mode `donnees` : lecture du dressing ; lecture de chaque table trouvée dans `src`, `supabase/functions` et `supabase/schema`, sauf `wardrobe` ; ajout d'une ligne `sonde` dans `wardrobe` (supprimée aussitôt si elle passe) ; réécriture du même nom sur une pièce existante avec `Prefer: return=representation` ; liste des espaces de stockage ; appel de chaque fonction de la tâche 3 avec un corps `{}`. Afficher un verdict par contrôle et le nombre d'échecs. Une table vide ne prouve rien : le signaler dans la sortie.
- [ ] Point de contrôle.

### Barrière A : le jeton peut-il modifier le compte ?

À faire par l'utilisateur, guidé pas à pas :

1. Dans Supabase, vérifier les clés de signature. Passer à une clé asymétrique (ES256) si ce n'est pas le cas.
2. Se déconnecter puis se reconnecter à OmniDash et tester Sommeil, Fenêtres, Nutrition, Voyages, Finance et Dressing. Cela couvre les fonctions existantes.
3. Désactiver les inscriptions publiques si elles ne servent plus (à décider par l'utilisateur).
4. Activer Authentication, OAuth Server, l'enregistrement dynamique et le chemin `/oauth/consent`.
5. Lancer `npm run dev`, puis la sonde en mode `compte`. La page d'autorisation s'ouvre sur l'adresse du site configurée dans Supabase : tant qu'OmniDash n'est pas déployé, remplacer le début de l'adresse par `http://localhost:5173`.
6. Révoquer ensuite le client de la sonde et désactiver l'enregistrement dynamique.

Réussite : « compte : ok ». Sinon, arrêt. Chercher dans la documentation s'il existe une protection officielle avant de conclure ; ne rien improviser.

### Task 3: restrictions dans la base et les fonctions

Fichiers : créer les deux scripts SQL, `supabase/functions/_shared/oauth.js`, `tests/styliste/oauth.test.mjs` ; modifier les fonctions `ai-stylist`, `analyze-nutrition`, `categorize-transactions`, `generate-travel`, `netatmo-sync`, `save-push-subscription`, `smart-add-item`, `withings-sync`. `check-windows` exige déjà son propre secret et ne change pas.

Produit : `isOAuthClientToken(authorization: string | null): boolean` et `refuseOAuthClient(req: Request, headers: object): Response | null` (403, corps `{ "error": "Accès refusé" }`). La signature du jeton est vérifiée en amont par la passerelle ; ces fonctions lisent seulement la mention `client_id`.

- [ ] Écrire le test.

```js
const jwt = (claims) => `Bearer x.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.y`

test('reconnaît un jeton de client externe', () => {
  assert.equal(isOAuthClientToken(jwt({ sub: 'u', client_id: 'abc' })), true)
  assert.equal(isOAuthClientToken(jwt({ sub: 'u' })), false)
  assert.equal(isOAuthClientToken(null), false)
})

test('un jeton illisible est refusé', () => {
  assert.equal(isOAuthClientToken('Bearer n-importe-quoi'), true)
})
```

- [ ] Le voir échouer, écrire les deux fonctions, le voir passer.
- [ ] Dans chacune des huit fonctions, appeler `refuseOAuthClient` juste après le traitement de `OPTIONS`. Vérifier avec `grep -L refuseOAuthClient supabase/functions/*/index.ts` : seul `check-windows` doit sortir.
- [ ] Écrire `dressing_mcp.sql`, rejouable :

```sql
do $$
declare t record; ouverte text;
begin
  select string_agg(c.relname, ', ') into ouverte
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity;
  if ouverte is not null then
    raise exception 'Sécurité par ligne inactive sur : %. Rien n''a été modifié.', ouverte;
  end if;

  for t in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r', 'p')
  loop
    execute format('drop policy if exists oauth_interdit on public.%I', t.relname);
    if t.relname <> 'wardrobe' then
      execute format($p$create policy oauth_interdit on public.%I as restrictive for all to authenticated
        using ((auth.jwt() ->> 'client_id') is null) with check ((auth.jwt() ->> 'client_id') is null)$p$, t.relname);
    end if;
  end loop;
end $$;
```

Ajouter sur `wardrobe` trois règles restrictives, `oauth_sans_ajout` (insert, `with check`), `oauth_sans_modif` (update, `using` et `with check`) et `oauth_sans_suppression` (delete, `using`), toutes avec la condition `client_id is null` ; la même règle `oauth_interdit` sur `storage.objects` et `storage.buckets`. Terminer par une requête qui liste les fonctions `security definer` et les vues du schéma `public`, avec les droits d'exécution ou de lecture du rôle `authenticated`. Toute ligne renvoyée est examinée avant la barrière B. Vérifier aussi les règles ouvertes au rôle `anon`.

- [ ] Écrire `dressing_mcp_retrait.sql`, qui supprime exactement ces règles et aucune autre.
- [ ] `npm test`. Point de contrôle.

### Task 7: vérification de connexion dans les fonctions

À réaliser avant le déploiement de la barrière B. Constat du 27 novembre : « Verify JWT with legacy secret » est désactivé en ligne, et `ai-stylist`, `generate-travel` et `smart-add-item` ne vérifient pas l'utilisateur. Elles sont donc ouvertes à tous.

Fichiers : créer `supabase/functions/_shared/session.js` et `tests/styliste/session.test.mjs` ; modifier les trois fonctions et `supabase/config.toml`.

Produit : `requireUser(req: Request, headers: object, getUser: (authorization: string) => Promise<object | null>): Promise<Response | null>`. Renvoie `null` si un utilisateur est reconnu, sinon une réponse 401 avec le corps `{ "error": "Connexion requise" }` et les en-têtes CORS de la fonction. Sans en-tête `Authorization`, `getUser` n'est pas appelé. Si `getUser` échoue ou lève une erreur, la réponse est 401.

- [ ] Écrire le test.

```js
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
```

- [ ] Le voir échouer, écrire `requireUser`, le voir passer.
- [ ] Dans les trois fonctions, après `OPTIONS` et `refuseOAuthClient`, appeler `requireUser` avec un `getUser` construit comme dans les autres fonctions : client Supabase avec la clé `SUPABASE_ANON_KEY` et l'en-tête `Authorization` reçu, puis `auth.getUser(jeton)`. Aucune clé secrète.
- [ ] Vérifier que `analyze-nutrition`, `categorize-transactions`, `netatmo-sync`, `save-push-subscription` et `withings-sync` refusent bien l'absence d'utilisateur avant tout effet. Corriger sinon et le signaler.
- [ ] `config.toml` : `verify_jwt = false` pour les neuf fonctions du dépôt, avec un commentaire qui dit que chacune vérifie elle-même l'appelant, car la vérification de la passerelle ne reconnaît que l'ancien secret. `check-windows` garde son secret.
- [ ] `npm test` et `npm run build`. Point de contrôle.

### Barrière B : le jeton ne lit-il que le dressing ?

L'utilisateur lance le SQL dans le SQL Editor, avec la commande de copie fournie :

```bash
LC_CTYPE=en_US.UTF-8 pbcopy < supabase/schema/dressing_mcp.sql
```

Il déploie les fonctions protégées sans activer la vérification de l'ancien secret (`--no-verify-jwt`), réactive brièvement l'enregistrement dynamique, lance la sonde en mode `donnees`, puis le désactive et révoque la sonde.

Réussite : zéro échec, résultat de l'audit examiné, et chaque module d'OmniDash fonctionne toujours avec une connexion normale.

### Task 4: le connecteur

Fichiers : créer `supabase/functions/omnidash-mcp/index.ts`, `piece.js`, `tests/styliste/piece.test.mjs` ; modifier `supabase/config.toml`.

Produit : outil `lire_dressing`, résultat texte JSON `{ "pieces": Piece[] }`, avec `Piece = { id: string, nom: string, categorie: string, sousCategorie: string|null, couleur: string|null, marque: string|null, quantite: number, style: string|null, lien: string|null }`. `toPiece(row): Piece`.

- [ ] Écrire le test.

```js
test('seuls les champs prévus sortent de la base', () => {
  const piece = toPiece({ id: 7, user_id: 'secret', created_at: 'x', name: 'Chino', category: 'Bas', color: 'marine', brand: null, quantity: null, link: 'http://exemple.com' })
  assert.deepEqual(piece, { id: '7', nom: 'Chino', categorie: 'bas', sousCategorie: null, couleur: 'marine', marque: null, quantite: 1, style: null, lien: null })
  assert.equal(toPiece({ id: 1, name: 'a', category: 'haut', link: 'https://exemple.com/a' }).lien, 'https://exemple.com/a')
})
```

- [ ] Le voir échouer, écrire `toPiece`, le voir passer.
- [ ] Écrire `index.ts` sur le modèle officiel : `pipeline([withOAuthProtectedResource(), withSupabase({ auth: 'user' })], handler)` avec `npm:@supabase/server@1` (1.6.0 au minimum), `npm:@supabase/middleware@1` et `createMcpHandler`, `McpServer` de `npm:@modelcontextprotocol/server@^2.0.0`. Lire d'abord l'[exemple officiel](https://github.com/supabase/supabase/tree/master/examples/edge-functions/supabase/functions/mcp/authenticated-mcp-server) et la [documentation](https://supabase.com/docs/guides/ai-tools/byo-mcp), et suivre leurs signatures si elles diffèrent. Outil annoté en lecture seule. Requête `wardrobe.select('*').eq('user_id', <sub du jeton vérifié>)`, puis `toPiece`. Aucune journalisation des données.
- [ ] `config.toml` : section `[functions.omnidash-mcp]` avec `verify_jwt = false`, car la fonction vérifie elle-même le jeton.
- [ ] Point de contrôle.

### Barrière C : claude.ai et un artefact atteignent-ils le connecteur ?

- [ ] L'utilisateur déploie OmniDash (page d'autorisation) et `omnidash-mcp`, sans clé secrète. Un appel sans jeton répond 401.
- [ ] Il réactive l'enregistrement dynamique, ajoute dans claude.ai un connecteur personnalisé nommé `OmniDash` à l'adresse `https://<référence>.supabase.co/functions/v1/omnidash-mcp`, autorise, puis le désactive.
- [ ] Publier un artefact d'essai privé avec `{ mcp: { servers: [{ server: 'OmniDash', tools: ['lire_dressing'] }] } }`. Il affiche seulement le nombre de pièces et les noms des champs. Lire `mcp.d.ts` avant d'écrire l'appel et noter la forme réelle du résultat pour la tâche 6.

Réussite : l'artefact affiche le bon nombre de pièces.

### Task 5: logique du styliste

Fichiers : créer `artifacts/styliste/logic.js` et `tests/styliste/logic.test.mjs`. Module sans accès à la page ni au réseau.

Produit :

- `todayParis(now: Date): string` et `previousDay(iso: string): string`, au format `AAAA-MM-JJ`.
- `availableFor(pieces: Piece[], history: Record<string, { ids: string[] }>, today: string): { pieces: Piece[], repeats: string[] }`. Retire les hauts et bas portés la veille. Si une de ces catégories se retrouve vide, y remettre les pièces de la veille et lister leurs identifiants dans `repeats`.
- `parseOutfit(text: string, allowed: Piece[]): { ok: true, cards: { piece: Piece, raison: string }[], resume: string, missing: string[] } | { ok: false, error: string }`. JSON attendu : `{ "pieces": [{ "id": "", "raison": "" }], "resume": "" }`. Accepte un bloc de code autour du JSON. Refuse une liste vide, un identifiant inconnu ou répété, deux bas ou deux paires de chaussures. Plusieurs hauts ou vestes sont permis pour superposer. `missing` liste parmi `haut`, `bas`, `chaussures` les catégories absentes de la tenue.
- `askOutfit(ask: (prompt: string) => Promise<string>, prompt: string, allowed: Piece[])` : une relance au plus.

- [ ] Écrire les tests.

```js
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

test('réponses refusées', () => {
  for (const bad of ['bonjour', '{"pieces":[{"id":"zz"}]}', '{"pieces":[{"id":"b1"},{"id":"b1"}]}', '{"pieces":[]}']) {
    assert.equal(parseOutfit(bad, pieces).ok, false)
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
```

- [ ] Les voir échouer, écrire le module, les voir passer. Dates avec `Intl.DateTimeFormat` et le fuseau `Europe/Paris`.
- [ ] Point de contrôle.

### Task 6: l'artefact

Fichiers : créer `artifacts/styliste/index.html`.

Consomme : `logic.js`, la forme du résultat notée à la barrière C, et les définitions `claude.d.ts`, `mcp.d.ts`, `sample.d.ts`, `db.d.ts` (à lire avant d'écrire, après avoir chargé les compétences artifact-capabilities et artifact-design).

Capacités : `mcp` (comme à la barrière C), `sample: {}`, `db: {}`, `user: {}`. Données privées sous `data/users/<id>` : documents `data/users/<id>/dressing` (pièces et date de lecture) et `data/users/<id>/manques` (analyse et date) ; historique dans la collection `data/users/<id>/tenues/jours`, un document par date : `{ ids, noms, occasion, meteo, resume }`.

- [ ] Faire confirmer le profil d'analyse.
- [ ] Onglets Tenue, Historique et Manques, avec les contenus de la conception, les couleurs Aurore reprises du CSS d'OmniDash, thèmes clair et sombre, lisible à 375 px. Toute valeur venue du connecteur ou de Claude passe par `textContent`. Un lien n'est créé que s'il commence par `https://`.
- [ ] « Je la porte aujourd'hui » demande confirmation si une tenue existe déjà pour la date. La suppression d'une entrée aussi.
- [ ] La demande à Claude ne contient que les pièces de `availableFor`, sans les liens. Les raisons de répétition sont affichées par la page.
- [ ] Manques : réponse JSON de 5 à 7 éléments `{ piece, coupe, matiere, couleur, repli, associer: string[] }`, `associer` contenant des identifiants du dressing. Rejet et une relance comme pour une tenue ; tester cette validation dans `logic.test.mjs` avec les cas 4 éléments, 8 éléments et identifiant inconnu.
- [ ] Pannes : connecteur absent ou connexion expirée, message avec l'action à faire et dernière copie datée ; accès refusé, copie ignorée ; dressing vide, aucune demande ; limite atteinte ou capacité absente, message sans boucle.
- [ ] Publier en privé avec `files` pour `logic.js`. Lire une fois chaque collection avec ArtifactData.
- [ ] Essai de l'utilisateur dans claude.ai : une tenue, un ajout à l'historique, une analyse, puis une nouvelle tenue le lendemain pour vérifier la règle de la veille.
- [ ] Rejouer la sonde en mode `donnees`, zéro échec. Point de contrôle final.

## Retour en arrière

1. Retirer le connecteur dans claude.ai.
2. Révoquer les autorisations et désactiver le serveur OAuth.
3. Supprimer la fonction `omnidash-mcp`.
4. Lancer `dressing_mcp_retrait.sql` une fois le serveur OAuth désactivé et tout jeton expiré.

Les gardes des fonctions et la page d'autorisation sont sans effet sur une connexion normale et peuvent rester.

## Après la mise en service

Toute nouvelle table doit recevoir la règle `oauth_interdit` : relancer `dressing_mcp.sql` après chaque ajout de schéma, et le noter dans la mémoire du projet. Toute nouvelle fonction Edge doit appeler `refuseOAuthClient`.
