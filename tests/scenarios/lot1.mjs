import { chromium, LAUNCH } from '../lib/pw.mjs';
import fs from 'fs';
const fakeDb = fs.readFileSync('fbtest/fake-firebase.js', 'utf8'), fakeAi = fs.readFileSync('fake-ai.js', 'utf8');
const b = await chromium.launch(LAUNCH);
const errs = [], W = ms => new Promise(r => setTimeout(r, ms));
const ok = (name, v) => console.log((v ? 'OK  ' : 'FAIL') + ' ' + name);
async function phone(init) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: /12\.0\.0/.test(r.request().url()) ? fakeAi : fakeDb }));
  if (init) await ctx.addInitScript(init);
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); return p;
}
const X = 'XXXXXXXXXXXXXXXXXXXXXXXXXXXX', Y = 'YYYYYYYYYYYYYYYYYYYYYYYYYYYY';
const evil = '"><img src=x onerror="window.__xss=1">';
// 1. Espace commun piégé : l'appli doit s'afficher, sans exécuter quoi que ce soit.
const poison = { couples: { [X]: {
  capsule: { c1: { id: evil, kind: 'souvenir', question: 'Q', entries: 'pas une liste', createdAt: evil }, c2: 'texte brut', c3: { kind: 'mot', text: { a: 1 }, from: evil } },
  lettres: { l1: { title: 'sans date', message: 'm' }, l2: { title: 'ok', message: 'm', openOn: '2020-01-01', from: 'b' } },
  cartes: { k1: { cat: '__proto__', text: 'x' }, k2: { cat: 'constructor', text: 'x' }, k3: { cat: 'dec', text: 'Ma carte', tone: evil } },
  aventures: { a1: { title: 42, statut: evil, budget: null, doneAt: evil } },
  contes: { s1: { title: evil, genre: 'constructor', length: 'toString', max: 'abc', mode: 'rpg', status: 'play', seed: { l: 1e99, r: -5 },
    steps: [{ text: 'Il était une fois', sc: evil, choices: [{ t: 'A', stat: 'constructor', dc: evil }, 'B'], event: { type: 'combat', enemy: { nom: evil, pv: evil, atk: 'x' } } }],
    rpg: { heroes: { a: { cls: 'constructor', pv: evil }, b: { cls: 'mage', stats: { force: evil }, pv: evil, pvMax: evil } }, items: [{ type: '__proto__' }, { type: 'potion', valeur: evil }], gold: evil } } },
  meta: { couple: { a: { x: 1 }, b: ['Sarah'], style: evil, since: evil }, progress: { seen: 'oops', parties: evil, endings: 3 }, avatars: 'x', game: { owned: { constructor: 1, __proto__: 1 }, chroma: { constructor: { a: 1 } }, equip: { a: { outfit: 'constructor' } } }, signal: { a: { kind: 'constructor', from: 'b', id: 'z', t: Date.now() } } },
  live: { game: { kind: 'arcade', game: 'onde', deck: [0, 1, 999, evil], i: 99, score: evil, target: evil, by: 'b', startAt: Date.now(), updatedAt: Date.now(), ans: { a: evil } } }
} } };
await fetch('http://localhost:8123/__fakedb', { method: 'POST', body: JSON.stringify(poison) });
const A = await phone(`localStorage.setItem('entre-nous:couple', '${X}'); localStorage.setItem('entre-nous:me', 'a');`);
await A.goto('http://localhost:8123/'); await W(2500);
ok('A relié à X', await A.evaluate(() => Store.backend === 'shared'));
ok('pas d\'écran de secours', await A.evaluate(() => !document.querySelector('.crash')));
for (const tab of ['capsule', 'aventures', 'lettres', 'play']) { await A.evaluate(t => { S.layer = null; S.tab = t; render(true); }, tab); await W(200); }
await A.evaluate(() => { S.capSeg = 'mots'; S.tab = 'capsule'; render(true); });
await A.evaluate(() => { ACT['open-mode']({ mode: 'conte' }); render(true); }); await W(300);
await A.evaluate(() => { ACT['cx-open']({ id: 's1' }); render(true); }); await W(1500);
await A.evaluate(() => { ACT['lv-join'](); render(true); }); await W(300);
await A.screenshot({ path: 'lot1-poison.png' });
ok('aucun script injecté', await A.evaluate(() => !window.__xss && !document.querySelector('img[src="x"]')));
ok('histoire piégée normalisée', await A.evaluate(() => { const s = Store.cols.contes[0]; return s.genre === 'romance' && s.max >= 3 && s.rpg.heroes.a.cls === 'sentinelle' && Number.isFinite(s.rpg.heroes.b.pv) && s.rpg.items.length === 1; }));
ok('lettre sans date écartée, cartes piégées écartées', await A.evaluate(() => Store.cols.lettres.length === 1 && Store.cols.cartes.length === 1));
ok('id du document conservé', await A.evaluate(() => Store.cols.capsule.some(x => x.id === 'c1')));
ok('partie à distance nettoyée', await A.evaluate(() => Live.state && Live.state.deck.length === 2 && Live.state.i === 1 && !('score' in Live.state && typeof Live.state.score !== 'number')));
ok('prénoms illisibles remplacés', await A.evaluate(() => nm('a') === 'Partenaire 1'));
// 2. Une donnée qui fait planter l'affichage : écran de secours, puis réparation.
await A.evaluate(() => { window.__boom = true; const f = Jeu.watch; Jeu.watch = function () { if (window.__boom) throw new Error('boom'); return f.apply(this, arguments); }; render(true); });
ok('écran de secours affiché', await A.evaluate(() => !!document.querySelector('.crash [data-a="crash-repair"]')));
await A.evaluate(() => { window.__boom = false; }); await A.click('[data-a="crash-retry"]'); await W(300);
ok('réessayer revient à l\'appli', await A.evaluate(() => !document.querySelector('.crash') && !!document.querySelector('.nav')));
// 3. iPhone : coller le lien d'invitation pendant la première visite.
await fetch('http://localhost:8123/__fakeops', { method: 'POST', body: JSON.stringify([[`couples/${Y}/meta/couple`, { a: 'Yanis', b: 'Sarah', style: 'partage' }]]) });
const B = await phone(); await B.goto('http://localhost:8123/'); await W(1200);
ok('B commence par les prénoms', await B.evaluate(() => onboardStep() === 'noms'));
await B.click('.join-more summary'); await B.fill('#ob-inv', `Viens ! http://localhost:8123/#c-${Y}`); await B.click('[data-a="sh-join"]'); await W(2000);
ok('B a rejoint Y', await B.evaluate(Y => Shared.code() === Y && Store.backend === 'shared', Y));
ok('B voit les prénoms de Y', await B.evaluate(() => nm('a') === 'Yanis' && onboardStep() === 'moi'));
// 4. Un lien vers un autre espace demande confirmation, et l'on peut revenir.
await A.evaluate(Y => { location.hash = '#c-' + Y; }, Y); await W(800);
ok('A demande confirmation', await A.evaluate(X => S.layer && S.layer.name === 'invite' && Shared.code() === X, X));
await A.click('[data-a="inv-no"]'); await W(300);
ok('A reste sur X', await A.evaluate(X => Shared.code() === X && Store.backend === 'shared', X));
await A.evaluate(Y => { location.hash = '#c-' + Y; }, Y); await W(800);
await A.click('[data-a="inv-yes"]'); await W(2000);
ok('A passe sur Y, sans fusion', await A.evaluate(Y => Shared.code() === Y && nm('a') === 'Yanis' && Store.cols.contes.length === 0, Y));
const dbY = await (await fetch('http://localhost:8123/__fakedb')).json();
ok('rien de X recopié dans Y', !dbY.couples[Y].contes && !dbY.couples[Y].lettres);
await A.evaluate(() => { S.layer = { type: 'sheet', name: 'names' }; render(true); }); await W(200);
await A.click('[data-a="sh-back"]'); await W(2000);
ok('A revient sur X', await A.evaluate(X => Shared.code() === X && Store.cols.contes.length === 1, X));
// 5. Histoire mélangée : on ouvre une autre histoire pendant que la suite s'écrit.
await A.evaluate(() => { window.__aiDelay = 2500; const mk = (id, t) => Store.put('contes', id, { title: t, pitch: 'p', genre: 'romance', length: 'courte', max: 5, mode: 'conte', steps: [], status: 'play', createdAt: Date.now(), seed: { l: 0, o: 0, al: 0, m: 0, r: 1 } }); mk('h1', 'Histoire 1'); mk('h2', 'Histoire 2'); });
await W(500);
await A.evaluate(() => { S.layer = { type: 'conte' }; S.cx.view = 'lib'; ACT['cx-open']({ id: 'h1' }); render(true); }); await W(500);
ok('h1 en cours d\'écriture', await A.evaluate(() => cxStory().id === 'h1' && !!document.querySelector('.cx-loader')));
await A.evaluate(() => { ACT['cx-view']({ v: 'lib' }); render(true); }); await W(100);
await A.evaluate(() => { const st = Store.cols.contes.find(x => x.id === 'h2'); const { id, ...d } = st; Store.put('contes', 'h2', { ...d, steps: [{ text: 'déjà là', sc: 'foret', choices: [{ t: 'ok' }] }] }); }); await W(300);
await A.evaluate(() => { ACT['cx-open']({ id: 'h2' }); render(true); }); await W(200);
ok('h2 ne montre pas l\'attente de h1', await A.evaluate(() => !document.querySelector('.cx-loader')));
await W(5000);
ok('l\'étape est allée dans h1, pas dans h2', await A.evaluate(() => { const h1 = Store.cols.contes.find(x => x.id === 'h1'), h2 = Store.cols.contes.find(x => x.id === 'h2'); console.log(JSON.stringify([h1.steps.map(x => x.text.slice(0, 20)), h2.steps.map(x => x.text.slice(0, 20)), S.cx.id])); return h1.steps.length === 1 && h2.steps.length === 1 && h2.steps[0].text === 'déjà là'; }));
console.log('errors', JSON.stringify(errs)); await b.close();
