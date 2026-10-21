# Y&S

Notre petit jeu à deux : questions complices, défis, histoires interactives, arcade et le puzzle de Yassen Jr.

Le site tient dans un seul fichier, `index.html`, publié avec GitHub Pages.
La progression de chaque personne est enregistrée sur son téléphone ; le code de transfert (dans les Réglages) permet de réunir deux progressions.

## Notifications (Cloudflare)

`notifications/worker.js` est le petit service qui envoie les notifications (Cloudflare Workers, offert,
sans carte) : petits mots, lettres scellées et lettres qui s'ouvrent, invitations à jouer à distance,
anniversaires, et (au choix) un rappel le soir. Il fabrique lui-même ses clés et les garde dans son stockage KV.

Mise en place, une seule fois, dans le tableau de bord Cloudflare :
1. **Workers & Pages** → Créer → Worker, nommé `ys-notif` → Déployer, puis **Modifier le code** :
   y coller tout `notifications/worker.js` → Déployer.
2. **Stockage et bases de données → KV** → créer un espace `ys-notif`. Dans le Worker → Paramètres →
   **Liaisons** → ajouter un espace KV, nom de variable `KV`, l'espace `ys-notif`.
3. Dans le Worker → Paramètres → **Déclencheurs** → Cron : `0 7,8 * * *` et `30 18,19 * * *`.
4. L'adresse du Worker (`https://ys-notif.<nom>.workers.dev`) va dans `NOTIF_URL` (index.html).
5. Sur chaque iPhone : installer Y&S sur l'écran d'accueil, puis Réglages → Notifications → Activer.
