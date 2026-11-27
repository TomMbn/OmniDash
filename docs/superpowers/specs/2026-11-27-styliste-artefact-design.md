# Styliste IA dans un artefact Claude

Conception du 27 novembre 2026. À valider avant tout développement.

## Intention

Reprendre le styliste IA du Dressing dans un artefact, pour qu'il utilise l'abonnement Claude à la place de la clé Gemini. L'artefact lit le dressing d'OmniDash et compose des tenues avec les pièces qui s'y trouvent.

## Objectifs

- Proposer une tenue selon l'occasion et la météo, comme aujourd'hui.
- Afficher la tenue en cartes, une par pièce.
- Garder un historique des tenues portées, pour ne pas s'habiller pareil deux jours de suite.
- Analyser les manques du dressing.
- Se mettre à jour tout seul quand le dressing change dans OmniDash.
- Ne donner à Claude que le dressing, pas les autres données d'OmniDash.

## Hors périmètre

- Modifier le dressing depuis l'artefact.
- Photos des vêtements.
- Météo automatique.
- Lecture de la liste d'achats ou des finances.
- Partage de l'artefact : il reste privé.
- Modifier ou retirer le styliste actuel d'OmniDash.

Le projet est raté, même s'il fonctionne, si la connexion permet de lire ou de modifier autre chose que ce qui est prévu.

## Approches étudiées

| Approche | Avantage | Limite |
|---|---|---|
| Connecteur Supabase officiel | automatique, rapide | Claude pourrait lire tout le projet, dont les finances |
| Petit connecteur pour le dressing seul (retenu) | automatique, un seul outil en lecture | plus de travail, à sécuriser et à tester |
| Copier-coller du dressing | aucun accès à la base | à refaire à chaque changement |

Le connecteur dédié a été choisi pour garder la mise à jour automatique sans ouvrir le reste de la base. Le copier-coller reste la solution de repli.

## Étape 0 : test de faisabilité

Rien d'autre n'est construit tant que ces points ne sont pas confirmés :

1. claude.ai accepte le connecteur et la connexion OAuth aboutit.
2. Un artefact peut appeler ce connecteur personnalisé par son nom.
3. Avec le jeton remis à Claude, la lecture d'une autre table est refusée, ainsi que toute écriture.
4. Ce jeton ne permet pas de modifier le compte (e-mail, mot de passe) par l'API d'authentification. Les règles de la base ne couvrent pas cette API.
5. Le passage éventuel à des clés de signature asymétriques ne casse ni la connexion à OmniDash ni les fonctions existantes.

Si un point échoue et ne peut pas être corrigé, on désactive ce qui a été activé et on passe au copier-coller, après accord.

## Le connecteur

Une fonction Supabase Edge nommée `dressing-mcp`, qui sert un serveur MCP, avec un seul outil : `lire_dressing`, sans paramètre.

Il renvoie pour chaque pièce : identifiant, nom, catégorie, sous-catégorie si elle existe, couleur, marque, quantité, style et lien. Il n'existe aucun outil d'écriture. La fonction n'utilise jamais la clé secrète : elle lit la base avec le jeton de l'utilisateur, donc les règles de sécurité par ligne s'appliquent, et filtre en plus sur son identifiant.

### Connexion

- Serveur OAuth 2.1 de Supabase Auth, avec enregistrement dynamique des clients et clés de signature asymétriques.
- Une page de consentement dans OmniDash (`/oauth/consent`) : elle demande d'être connecté, affiche le nom du client et son adresse de retour, puis propose d'autoriser ou de refuser. Rien n'est autorisé sans clic. Si une connexion est nécessaire, elle ramène ensuite à cette demande, ce que la redirection actuelle ne fait pas.

### Limiter le jeton

Un jeton OAuth Supabase donne par défaut les mêmes droits qu'une connexion normale. Limiter l'outil ne suffit donc pas. Supabase ajoute au jeton une mention `client_id`, qui permet de le reconnaître.

- Règles restrictives sur toutes les autres tables et sur le stockage : refus de tout accès quand `client_id` est présent.
- Sur `wardrobe` : lecture seule quand `client_id` est présent.
- Les fonctions Edge existantes refusent ces jetons.
- Les fonctions de base et les vues qui contournent les règles par ligne sont recensées et vérifiées.
- La table `wardrobe` n'a pas de schéma dans le dépôt : vérifier d'abord que la sécurité par ligne y est active.

Toute nouvelle table devra recevoir la même règle restrictive.

Documentation : [serveur MCP sur Edge Functions](https://supabase.com/docs/guides/ai-tools/byo-mcp), [authentification MCP](https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication), [sécurité des jetons](https://supabase.com/docs/guides/auth/oauth-server/token-security).

## L'artefact

Il est privé et utilise trois capacités : `mcp` (le connecteur « Dressing OmniDash », outil `lire_dressing` seulement), `sample` (Claude) et `db` (historique et dernière copie du dressing, dans l'espace personnel). Il reprend les couleurs Aurore d'OmniDash, en thème clair et sombre, et reste lisible sur téléphone.

### Onglet Tenue

- Choix de l'occasion (travail, sport, soirée, détente) et de la météo (chaud, pluie, froid).
- Bouton « Proposer une tenue ».
- Résultat : une carte par pièce avec son nom, sa couleur, son rôle dans la tenue et son lien s'il commence par https, puis une courte explication de l'ensemble.
- Boutons « Je la porte aujourd'hui » et « Autre proposition ».

Claude répond avec les identifiants des pièces. La page rejette tout identifiant absent du dressing et refait une seule demande si la réponse est invalide. Les noms affichés viennent du dressing, pas du texte de Claude. S'il manque une catégorie, par exemple des chaussures, la tenue le dit.

### Onglet Historique

- Les tenues portées, par date, la plus récente en premier.
- Seul le bouton « Je la porte aujourd'hui » ajoute une tenue. Une proposition ignorée ne compte pas.
- Une tenue par jour : en choisir une autre remplace celle du jour, après confirmation.
- On peut supprimer une entrée.

### Règle des deux jours

Proposition à confirmer : le haut et le bas portés la veille ne sont pas reproposés. Les chaussures, le manteau et les accessoires peuvent revenir. « La veille » désigne le jour calendaire précédent, à l'heure de Paris. La page applique la règle elle-même, en retirant ces pièces avant la demande. Si le dressing ne permet pas de la respecter, la tenue indique la pièce répétée et pourquoi. Une pièce présente en plusieurs exemplaires suit la même règle.

### Onglet Manques

- Un bouton lance l'analyse de 5 à 7 pièces, affichées en cartes : pièce, coupe, matière, couleur, solution de repli et deux ou trois pièces du dressing à associer.
- Le profil donné à Claude, à confirmer : 1,90 m, 80 à 85 kg, coupes droites ou légèrement amples, tons terre et noir à parts égales, matières naturelles de préférence, pas de finitions côtelées sur un blouson.
- L'analyse ne connaît pas la liste d'achats : elle peut proposer une pièce déjà prévue.
- La dernière analyse est gardée avec sa date.

### Pannes

- Connecteur absent ou connexion expirée : message qui dit quoi faire, et utilisation de la dernière copie du dressing avec sa date. Si l'accès est refusé, la copie n'est pas utilisée.
- Dressing vide : message, aucune demande à Claude.
- Limite de l'abonnement atteinte ou réponse impossible : message, sans nouvelle tentative en boucle. L'historique reste consultable.

## Vérifications

- Les quatre refus de l'étape 0, rejoués après la mise en place des règles.
- OmniDash fonctionne toujours avec une connexion normale, module par module.
- La règle des deux jours et le rejet des identifiants inconnus sont testés, y compris avec un dressing trop petit.
- Un essai réel dans claude.ai : une tenue, un ajout à l'historique, une analyse.

## Qui fait quoi

L'assistant écrit le code et les scripts en local, sans se connecter à Supabase et sans lire le fichier `.env`.

Tom exécute ce qui touche à son compte : activer le serveur OAuth et les clés, lancer les scripts SQL, déployer la fonction, déployer OmniDash et ajouter le connecteur dans claude.ai. Rien n'est commité ni poussé sans demande.

Pour couper l'accès : retirer le connecteur dans claude.ai, révoquer l'autorisation côté Supabase et désactiver le serveur OAuth.

## Laissé au développement

- Bibliothèque utilisée pour le serveur MCP.
- Formulation des demandes envoyées à Claude.
- Structure des données de l'historique.
- Mise en page détaillée.
