# Y&S

Notre petit jeu à deux : questions complices, défis, histoires interactives, arcade et le puzzle de Yassen Jr.

Le site tient dans un seul fichier, `index.html`, publié avec GitHub Pages.
La progression de chaque personne est enregistrée sur son téléphone ; le code de transfert (dans les Réglages) permet de réunir deux progressions.

## Notifications (Firebase)

Le dossier `functions/` contient le petit service qui envoie les notifications : petits mots, lettres scellées
et lettres qui s'ouvrent, invitations à jouer à distance, anniversaires, et (au choix) un rappel le soir.

Mise en place, une seule fois :
1. Console Firebase → passer le projet en formule **Blaze** (et poser une alerte de budget).
2. Paramètres du projet → **Cloud Messaging** → Certificats push web → **Générer une paire de clés** :
   la clé publique va dans `PUSH_VAPID` (index.html).
3. Déployer le service, par exemple depuis Google Cloud Shell :
   ```
   git clone https://github.com/CptnTsubasa/yassen-et-nous && cd yassen-et-nous
   (cd functions && npm install)
   firebase login --no-localhost
   firebase deploy --only functions --project y-s-14d43
   ```
4. Sur chaque iPhone : installer Y&S sur l'écran d'accueil, puis Réglages → Notifications → Activer.
