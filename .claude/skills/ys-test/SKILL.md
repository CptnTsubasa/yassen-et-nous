---
name: ys-test
description: Lance les tests de Y&S (appli, service Cloudflare, service worker) et résume les échecs. À utiliser après tout changement de index.html, sw.js ou notifications/worker.js, et avant de publier.
---

# Tests de Y&S

1. Lancer les tests concernés par le changement, ou tous avant de publier :
   ```bash
   node tests/run.mjs                 # tout (≈ 5 min)
   node tests/run.mjs rescue backup   # seulement ces scénarios (noms de tests/scenarios et tests/worker)
   ```
   La commande dure plusieurs minutes : la lancer en arrière-plan si elle risque de dépasser 2 minutes.
2. Lire le bilan : chaque ligne `ÉCHEC` donne les vérifications ratées ou l'erreur.
3. Pour un échec, distinguer un vrai bug d'un test à mettre à jour (comportement volontairement changé) :
   relire le scénario dans `tests/scenarios/`, regarder ses captures dans `tests/.build/`.
   Ne jamais affaiblir une vérification juste pour la faire passer.
4. Un nouveau comportement mérite son scénario : copier un scénario proche (`tests/scenarios/*.mjs`),
   écrire des lignes `OK …` / `FAIL …` avec la petite fonction `ok(nom, condition)`, et finir par
   `console.log('errors', JSON.stringify(errs))`. Les fonctions de la page utilisées par un scénario doivent
   figurer dans la liste `EXPOSE` de `tests/run.mjs`.
5. Résumer à l'utilisateur, en français : ce qui passe, ce qui échoue et pourquoi.

Détails (ports, fausse base Firebase, service Cloudflare local) : `tests/README.md`.
