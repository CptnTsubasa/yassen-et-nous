# Y&S — notes pour Claude

Appli de couple (PWA installée sur deux iPhone) autour de la mémoire de Yassen Jr., une petite flamme jaune.
Publiée par GitHub Pages : https://cptntsubasa.github.io/yassen-et-nous/

## Où est quoi

- `index.html` : **toute l'appli** (HTML, CSS, JavaScript), sans framework ni étape de compilation.
  Rendu par `render()` / `renderNow()` ; les boutons portent `data-a="…"`, traités dans l'objet `ACT`.
  État de l'écran dans `S` ; données dans `Store` (`Store.cols` : capsule, aventures, lettres… ;
  `Store.meta` : couple, game, yj, space…). Toute donnée lue est nettoyée (`cleanItem`, `cleanMeta`, `cleanLive`) :
  un nouveau champ doit y être autorisé, sinon il disparaît.
- `sw.js` : service worker. La page gardée s'affiche d'abord, la version en ligne est vérifiée en arrière-plan.
- `notifications/worker.js` : service Cloudflare (notifications Web Push, code de secours, IA gratuite Groq et
  Workers AI, happening de la semaine). Sa version est dans la réponse de `GET /` (`version`) ; l'appli vérifie
  un minimum dans l'action `push-test`.
- `logo/` : kit du logo « Petite flamme » (voir `logo/GUIDE.md`).
- `tests/` : les tests (voir plus bas).

## Données et services

- Firebase Realtime Database (projet `y-s-14d43`), tout sous `couples/<code>` ; le code de l'espace sert de clé.
  Firebase transforme un objet aux clés 0, 1, 2… en liste : utiliser des clés comme `r0`, `r1`.
- IA : Gemini par Firebase AI (App Check, reCAPTCHA v3, clé de site publique), puis Groq et Workers AI par le
  service Cloudflare (clé `GROQ_KEY` en secret, liaison `AI`). Chaque modèle a son quota gratuit : l'appli passe au
  suivant quand l'un est épuisé (`AI_ORDER`, `AI.out`). Ne jamais mettre une clé secrète dans `index.html`.
- Cloudflare Worker `ys-notif` + KV, déclencheurs « 0 7,8 * * * », « 30 18,19 * * * » et « 5 10-20 * * * ». **L'offre gratuite de KV n'autorise que 1 000 écritures par jour** :
  ne jamais écrire dans KV à chaque notification (les traces « déjà envoyé » vont dans `couples/<code>/notifsent`).
- Pas de carte bancaire, nulle part : rester sur les offres gratuites (Firebase Spark, Cloudflare Free).

## Règles

- Tout ce que voit l'utilisateur est en **français**, avec une écriture **épicène** (pas d'accord masculin
  ou féminin quand on parle de l'un ou l'autre des partenaires ; Yassen Jr. est « il »).
- Yassen Jr. appelle ses parents « Papa » et « Maman » (`parentOf(k)`), pas par leur prénom.
- Écriture manuscrite (police Caveat) : réservée à la dédicace et à ce que les partenaires écrivent eux-mêmes.
- Commentaires du code en français, dans le style existant ; respecter le ton tendre de l'appli.
- Dans une chaîne JavaScript de `index.html`, ne jamais écrire `</script>` tel quel (écrire `<\/script>`).
- **Après un changement de `notifications/worker.js`** : augmenter `version` dans la réponse de `GET /`,
  et dire à l'utilisateur de recoller le fichier dans Cloudflare (`ys-notif` → Modifier le code → Déployer).
- **Si la liste des fichiers mis en cache change dans `sw.js`** : augmenter `V` (« ys-vN »).
- Avant de supprimer l'appli de l'écran d'accueil, l'iPhone perd le lien avec l'espace : l'utilisateur doit
  avoir son lien d'invitation ou son code de secours (6 mots, Réglages → Notre progression commune).

## L'évasion de Yassen Jr.

Escape game à deux (`Esc`, `escGen`, `ESC_ROOMS`) : la partie vit dans `escape/run`, les salles réussies et les
happenings vus dans `meta/escape`. Le tirage du happening (`hapOf`) existe en double, dans l'appli et dans le
service : les deux doivent rester identiques (le test `hap` le vérifie).

## Tests

```bash
node tests/run.mjs              # tout (≈ 5 min)
node tests/run.mjs backup yjmem # seulement ces scénarios
```

Voir `tests/README.md`. Lancer les tests concernés après chaque changement, et tous avant de publier.

## Git

- Branche `main`, publiée telle quelle par GitHub Pages ; `git push -u origin main`.
- La branche `avant-relooking` garde la version d'avant le relooking (24 octobre 2026).
