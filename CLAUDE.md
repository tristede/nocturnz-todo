# Nocturnz Todo — notes pour Claude

Appli web **Nocturnz/todo** (Todo + Wishlist + suivis de films/séries), en ligne sur https://nocturnz-todo.web.app.
Fait partie de la suite Nocturnz (accueil : nocturnz.xyz). Dépôt public `tristede/nocturnz-todo`.

## Règles de travail

- Parler à Adam en français, direct, sans caveats. Il décide sur retour visuel : montrer, puis ajuster.
- **Jamais de nom de famille ni d'email perso dans le dépôt** (il est public). Identité git : `tristede`.
- **Ne jamais toucher à TristeJeu** (`/Users/adam/Projects/tristejeu`) : autre projet, sans rapport.
- Tests silencieux : pas de son, pas de vidéo audible.
- Vérifier chaque changement visible dans le navigateur (émulateurs, vue mobile 375 px) avant de déployer.
- Après un déploiement, vérifier que `/version.json` en ligne = `dist/version.json`.

## Commandes

```bash
npm run emulators    # Auth 9199 + Firestore 8180 (projet demo-nocturnz-todo)
npm run dev:emu      # http://localhost:3200 sur les émulateurs
npm run test:rules   # tests des règles (ou : FIRESTORE_EMULATOR_HOST=127.0.0.1:8180 node tests/rules.test.mjs)
npx vite build && firebase deploy --only hosting --project nocturnz-todo          # site
firebase deploy --only firestore:rules --project nocturnz-todo                    # règles
```

Entrées `todo-emulators` et `todo` dans `workspace/.claude/launch.json`.
En émulateur : `window.__devSignIn('x@x.test','Nom')` ; donner l'accès via `config/club.admins` ou `access/{email}` (REST, `Authorization: Bearer owner`).
Compte CLI Firebase : le compte Google principal d'Adam, propriétaire du projet (détails dans la mémoire locale, jamais dans ce dépôt public).

## Architecture

- `src/main.js` : connexion Google, écran « Accès sur invitation », démarrage, mise à jour automatique (compare `__BUILD__` à `/version.json` au retour au premier plan et recharge quand rien n'est en cours).
- `src/store.js` : synchro Firestore. L'UI garde la forme `S = {sections, buy, focus}` et la modifie directement ; `commit(S)` compare avec la dernière version connue et n'écrit que les différences. Il ne supprime que ce qui était dans l'état affiché (`S.__ids` / `S.__cats`, non énumérables).
- `src/app.js` : toute l'UI (chaînes HTML, ES5). Feuilles : tâche, article, ✎ mise à jour, catégories, partage, cloche, profil, amis, suivis.
- `src/dnd.js` : glisser-déposer (souris + appui long), réordonner et changer de groupe/onglet.
- `src/templates.js` : modèle **MARVELVISION** (id `mcu-endgame`, alias des anciens noms).
- `firestore.rules` + `tests/rules.test.mjs` (93 tests).
- `public/sw.js` : réseau d'abord pour la page, cache pour les fichiers versionnés.

## Modèle de données (Firestore)

- `users/{uid}` : pseudo, photo (data URL 128 px), `prefs` (thème, tags, outils, notifs), ordre des catégories, focus.
- `cats/{id}` : kind `todo|buy`, `type:'watch'` pour un suivi, `tpl` (modèle), groupes (`side:true` = liste « Hors MCU »), membres.
- `tasks/{id}` : catId, groupId, champs de tâche ; `by`/`byName` (auteur), `eb` (dernier à avoir modifié), `tu`/`tn` (qui a posé le tag), `guests` (partage d'une tâche) ; suivis : `rel`, `dur`, `imp`, `goal`, `vh`, `fmt`, `cont`, `ph`, `lk`, `pre`.
- `access/{email}` + `quota/{uid}` : accès sur invitation, 2 invitations par membre ; admins dans `config/club.admins` (console seulement).
- `invites/{type}_{cible}__{email}` : types `cat`, `task`, `watch`, `friend` (limite connue : un seul invite par cible et par email, tous expéditeurs confondus).
- `friends/{tpl}__{uidA}_{uidB}` : `tpl:'ami'` = amitié générale ; sinon lien de suivi partagé. Non transitif.
- `progress/{uid}__{tpl}` : progression d'un suivi, lisible par soi et ses amis de ce suivi.
- `notifs/{id}` : `kind` `list|watch|social`, filtrées chez le destinataire selon ses réglages.

## Choix d'interface à respecter

- Profil : Apparence, Amis, Tags / Notifications / Outils en menus repliables (Outils ouvert par défaut).
- Partage : seulement avec des amis (photos, sélection multiple, « Inviter (n) », « Ajouter un ami »), pas de champ email.
- MARVELVISION : base grise, MCU en bleu, Hors MCU en mauve ; « À voir » / « À skip » ; non modifiable comme une catégorie (menu = couleurs, Partager, Supprimer).
- Chiffrement de bout en bout : en attente, ne pas relancer sans demande.
