# Nocturnz Todo

Todo & Wishlist — fait partie de la suite d'outils [Nocturnz](https://nocturnz.xyz).
Appli web installable (PWA), connexion Google, données Firestore synchronisées entre appareils.

- Glisser-déposer une tâche vers une autre sous-catégorie ou un onglet de catégorie (souris, ou appui long au doigt)
- Partager une catégorie ou une seule tâche par email (invitation dans la cloche 🔔 du destinataire)
- Notifications : invitations, ajouts, tâches terminées dans les listes partagées
- Import de l'ancienne version (fichier `Todo & Wishlist.html`) depuis « Mon compte »

## Développement

```bash
npm install
npm run emulators   # Auth + Firestore locaux (ports 9199 / 8180)
npm run dev:emu     # http://localhost:3200, branché sur les émulateurs
npm run test:rules  # tests des règles Firestore
```

En mode émulateur, `window.__devSignIn('email@x.test', 'Nom')` connecte un compte de test sans fenêtre Google.

## Mise en ligne

Projet Firebase `nocturnz-todo` (à créer), config publique dans `src/firebaseConfig.js`, puis `npm run deploy`.
