# Nocturnz Todo — guide de travail pour Claude Code

## Périmètre strict

- Ce dépôt est **uniquement** l’application Nocturnz Todo : Todo, Wishlist, amis, suivis MARVELVISION et Firebase `nocturnz-todo`.
- Ne jamais ouvrir, rechercher, modifier, lancer, déployer ou commenter **TristeJeu**, **Nocturnz Review** ou un autre projet depuis cette tâche. Ne pas parcourir les dossiers parents à la recherche d’autres dépôts. Ne jamais réutiliser leurs fichiers, comptes, règles Firebase ou commandes.
- Travailler depuis la racine de ce dépôt uniquement. Toute commande Firebase doit préciser `--project nocturnz-todo`. Vérifier `.firebaserc` et le projet avant un déploiement.
- Ne pas toucher à un autre projet parce qu’il apparaît dans l’historique de conversation, une mémoire, un terminal ou un dépôt voisin. Si une demande semble concerner un autre projet, s’arrêter à ce dépôt et demander une clarification.

## Sécurité du dépôt et de la production

- Le dépôt GitHub est public. Ne jamais ajouter de nom légal, d’email personnel, de secret, de token ou de donnée client dans les fichiers, commentaires, commits ou logs.
- Préserver le travail existant. Avant toute modification, lire `git status --short --branch` et les diffs concernés. Ne jamais lancer `git reset`, `git clean`, checkout destructif, ni écraser des changements locaux.
- Ne pas committer, pousser, fusionner ou déployer sans demande explicite d’Adam. Une demande de changement de code n’autorise pas à elle seule une publication.
- Un déploiement de règles Firestore n’est nécessaire que si `firestore.rules` change. Un déploiement Hosting ne publie pas automatiquement les règles.
- Après un déploiement explicitement demandé, vérifier HTTP 200 sur le site et comparer `/version.json` avec la version produite. Rapporter clairement ce qui a été publié.

## État connu du dépôt

- Dépôt : `tristede/nocturnz-todo`, branche `main`, projet Firebase `nocturnz-todo`, site `https://nocturnz-todo.web.app`.
- Dernier état vérifié le 24 octobre 2026 : branche locale `main` avec un commit en avance sur `origin/main`, plus des modifications locales non commitées dans `firestore.rules`, `src/app.js`, `src/main.js`, `src/store.js`, `src/styles.css` et `src/templates.js`. Préserver ces modifications et les inspecter avant de les modifier.
- Dernière publication vérifiée le 24 octobre 2026 (Hosting + règles) : HTTP 200, `/version.json` = `1792877653479` (Ibilaw 2026, thème Noir / rouge, retrait des One-Shots ; règles publiées au déploiement précédent).
- Le build peut afficher l’avertissement Vite indiquant que le bundle JavaScript minifié dépasse 500 kB ; le build peut néanmoins réussir.

## Commandes

À exécuter depuis la racine du dépôt :

```bash
npm install
npm run dev
npm run emulators
npm run dev:emu             # Vite sur le port 3200, branché sur Auth 9199 / Firestore 8180
npm run test:rules          # tests Firestore avec l’émulateur
npm run build -- --configLoader runner
npx firebase-tools projects:list
```

Après une autorisation explicite de déployer :

```bash
npm run build -- --configLoader runner
npx firebase-tools deploy --only hosting --project nocturnz-todo
npx firebase-tools deploy --only firestore:rules --project nocturnz-todo
```

Si les règles et le site doivent tous deux être publiés, les deux cibles peuvent être déployées ensemble avec `--only hosting,firestore:rules`. Ne pas lancer ces commandes sans demande explicite de publication.

## Architecture

- `src/main.js` : connexion Google, contrôle d’accès, initialisation de l’application.
- `src/store.js` : synchronisation Firestore, invitations, amis, progression partagée et notifications.
- `src/app.js` : interface Todo, Wishlist, profil, amis, catégories, suivis, notifications et modales.
- `src/styles.css` : styles et thèmes.
- `src/templates.js` : modèles de suivis, dont MARVELVISION (`id: mcu-endgame`).
- `src/dnd.js` : glisser-déposer des tâches et catégories.
- `firestore.rules` : autorisations Firestore. Toujours vérifier les changements de règles séparément du code UI.
- `public/sw.js` : service worker et cache de l’application.

## Comportements actuels à préserver

- Les sections `type: 'watch'` ne comptent pas dans les totaux de tâches Todo.
- Les modèles de suivi s’activent individuellement dans Profil → Suivis. Désactiver un modèle le masque sans supprimer sa progression. Les suivis personnalisés restent distincts des modèles.
- Dans MARVELVISION, un clic marque un titre comme vu, le clic suivant le marque « skip », puis le suivant le remet sans statut. Un skip n’est pas un visionnage ; les compteurs de skip sont partagés avec les amis.
- Le bouton **Skip** de la carte « Prochain film » doit marquer le titre ignoré sans l’ajouter à l’historique des vues.
- Les notifications de visionnage sont regroupées par ami et par modèle.
- Profil → Amis et Profil → Catégories restent dans leur modale. La poignée de la modale Profil et celle de gestion des catégories permettent de glisser vers le bas pour fermer.
- Thèmes actuels : Auto, Clair, Rose, Marine / noir, Sombre et Noir. Garder les thèmes indépendants et ne pas changer la palette sans demande.
- Si une photo personnalisée est utilisée, le clic sur la photo propose de la réinitialiser vers la photo Google ; sinon il ouvre le sélecteur d’image.
- Les demandes d’amitié utilisent un ID unique par expéditeur et destinataire (`friend_ami__<email>__<uid>`). La règle Firestore accepte aussi l’ancien format pour compatibilité. Ne pas réintroduire un ID partagé entre expéditeurs.
- Dans le modèle MARVELVISION, les cinq Marvel One-Shots sont retirés. Pour un suivi existant, le bouton « Mettre à jour » supprime les entrées retirées du modèle.
- Modèle **Ibilaw 2026** (`ibilaw-2026`, `live` dans `templates.js`) : suivi « en direct » d’une journée à Walibi. L’heure de Bruxelles remplace le pourcentage ; « Bientôt » liste les 3 prochains débuts ; un anneau compte à rebours par activité ; ce qui est passé se grise. Onglets Ibilaw / Attractions / Plan (Plan en retrait, bord gauche sous Attractions) ; attractions par zone du parc, filtres Frissons (par défaut) / Famille / Enfants, actifs = contour épaissi sans remplissage. Pas de mention Speedy ni de lunes. Le plan s’ouvre dans un lecteur interne (pincer, glisser, double-tap), jamais dans un nouvel onglet. L’image `public/maps/ibilaw-2026.jpg` est sous droits : ignorée par git, elle doit exister localement pour être publiée.
- Le terme visible choisi par Adam est « parrainage » ; les mots internes des API et noms de collections Firebase ne doivent pas être renommés sans migration coordonnée.

## Façon de travailler

- Répondre en français, directement et avec des changements concrets.
- Garder l’interface mobile-first et sobre. Éviter les indications évidentes et les textes explicatifs ajoutés sans demande.
- Préserver les changements non liés et les états locaux. Ne jamais remplacer une base Firestore ni supprimer des données pour simplifier un test.
- Pour une validation demandée, distinguer build local, test via émulateur et production réellement vérifiée. Ne pas prétendre qu’un build confirme un déploiement.
- Pour toute question d’interface, rester dans l’application Todo et ses fichiers. Ne pas étendre spontanément la tâche à d’autres applications Nocturnz.
