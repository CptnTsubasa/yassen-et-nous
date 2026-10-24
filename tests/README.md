# Tests de Y&S

```bash
node tests/run.mjs                # tous les tests
node tests/run.mjs rescue backup  # seulement certains (nom du fichier, sans .mjs)
```

Il faut Node 18+ et Playwright avec Chromium (déjà présents dans l'environnement cloud de Claude Code ;
ailleurs : `npm i -D playwright && npx playwright install chromium`, ou la variable `CHROME` vers un Chromium).

## Comment ça marche

`run.mjs` vérifie d'abord que les scripts de `index.html` se compilent, puis prépare `tests/.build/`
(ignoré par git) :

- **`fbtest/`** : l'appli avec ses fonctions exposées (`window.Store`, `window.render`…) et une **fausse base
  Firebase** (`lib/fake-firebase.js`) qui imite la vraie, y compris la transformation des clés 0, 1, 2… en liste.
  Servie sur le port 8123 ; `POST /__fakedb` remplit la base, `GET /__fakedb` la lit.
- **`wk/`** : le vrai `notifications/worker.js`, exécuté localement sur le port 8124 (`lib/worker-server.mjs`).
  Les notifications vers Apple sont interceptées (`GET /__pushes`) et déchiffrées par les tests.
  Les écritures KV y sont **refusées** (sauf la clé VAPID et le code de secours), comme quand la limite gratuite
  est atteinte : le service doit continuer à marcher sans.
- **`site/`** : le site tel que publié, servi sur le port 8130 comme GitHub Pages (pour le service worker).
- `fake-ai.js` : une fausse IA Gemini (réponses écrites d'avance, en continu).

Chaque scénario pilote un ou deux téléphones simulés (390 × 844) et écrit des lignes `OK …` / `FAIL …`.
Un `FAIL`, une erreur de page (`errors [...]`) ou un plantage font échouer le scénario.

## Les scénarios

| Fichier | Ce qui est vérifié |
|---|---|
| `worker/notifications` | Service Cloudflare : clés VAPID, chiffrement, petit mot, lettres et anniversaires du matin |
| `worker/gestes` | Un câlin = une notification, étiquettes uniques, réessai sur échec passager, aucune écriture KV |
| `e2e` | De bout en bout : abonnement, mot, câlin, pensée, centre de notifications, notification de test |
| `gestes-e2e` | 10 câlins → 10 notifications, appli fermée tout de suite, pas de doublon |
| `notif` | Centre de notifications (« Rejoindre » une partie, tout vu après consultation) |
| `push` | Activation des notifications, préférences, mise à jour de l'appli au retour |
| `lvcards`, `lvother`, `live3`, `lvstop` | Jeux à distance sur deux téléphones, arrêt d'un commun accord |
| `lot1` … `lot4` | Vérifications générales (synchro, jeux, interface, hors ligne) |
| `yjchat`, `yjfast`, `yjsens`, `yjmem` | Yassen Jr. : discussion, réponse en continu, sans IA, mémoire et actualités |
| `papa` | Papa / Maman et le réglage correspondant |
| `duo` | Phrases à deux voix des chibis |
| `backup` | Fichier « nos souvenirs », restauration sans doublon, copies automatiques |
| `rescue` | Code de secours en 6 mots |
| `cd` | Comptes à rebours « Bientôt » |
| `ob2` | Page de bienvenue et « Retrouver notre espace » |
| `anim2` | Animations (onglets, fenêtres, cœurs qui s'envolent) |
| `scheme` | Bouton clair / sombre |
| `sync` | Scènes des chibis identiques sur les deux téléphones |
| `perf` | Démarrage depuis la copie du téléphone, et détection d'une nouvelle version |
| `tap`, `snd` | Sons et retours au toucher |

Les captures d'écran prises par les scénarios atterrissent dans `tests/.build/`.
