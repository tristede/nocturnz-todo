# Nocturnz/todo

Todo, Wishlist et suivis de films/séries — fait partie de la suite d'outils [Nocturnz](https://nocturnz.xyz).
Appli web installable (PWA) sur https://nocturnz-todo.web.app : connexion Google, accès sur invitation, données synchronisées entre appareils.

- **Todo & Wishlist** : catégories et groupes, tags personnalisables, glisser-déposer (réordonner, changer de groupe ou d'onglet), menu clic droit / appui long sur un onglet, dates, focus du jour, historique.
- **Partage** entre amis : une liste entière ou une seule tâche, avec la photo de l'ami qui a ajouté ou modifié une tâche.
- **Amis** : demandes d'ami par email, acceptées dans la cloche 🔔 ; gestion dans le Profil.
- **Suivis** activables modèle par modèle dans le Profil : progression vers un objectif, temps restant, historique, statuts vu et skip, compteurs partagés avec les amis. Modèle **MARVELVISION** : tout le MCU par phase jusqu'à *Avengers : Doomsday*, et une liste parallèle « Hors MCU » (Sony, Fox, Netflix…) avec liens entre titres. Les Marvel One-Shots sont exclus.
- **Notifications** réglables et regroupées pour les visionnages, thèmes (Auto, Clair, Rose, Marine / noir, Sombre, Noir), pseudo et photo de profil.
- Mise à jour automatique de la webapp installée (iPhone compris).

## Développement

```bash
npm install
npm run emulators   # Auth + Firestore locaux (ports 9199 / 8180)
npm run dev:emu     # http://localhost:3200, branché sur les émulateurs
npm run test:rules  # tests des règles Firestore
```

En mode émulateur, `window.__devSignIn('email@x.test', 'Nom')` connecte un compte de test sans fenêtre Google.

## Mise en ligne

Projet Firebase `nocturnz-todo` (config publique dans `src/firebaseConfig.js`) :

```bash
npm run build -- --configLoader runner
npx firebase-tools deploy --only hosting,firestore:rules --project nocturnz-todo
```
