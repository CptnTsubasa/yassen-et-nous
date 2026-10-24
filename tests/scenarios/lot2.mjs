import { chromium, LAUNCH } from '../lib/pw.mjs';
import fs from 'fs';
let fakeDb = fs.readFileSync('fbtest/fake-firebase.js', 'utf8'); const fakeAi = fs.readFileSync('fake-ai.js', 'utf8');
// Hors ligne simulé : les écritures restent en attente (comme la vraie base), rien n'arrive du serveur.
fakeDb = fakeDb.replace('async function pull() {', 'async function pull() { if (window.__offline) return;')
  .replace('subs.forEach(f => f()); return fetch(', 'subs.forEach(f => f()); if (window.__offline) return new Promise(() => {}); return fetch(');
const b = await chromium.launch(LAUNCH);
const errs = [], W = ms => new Promise(r => setTimeout(r, ms));
const ok = (name, v) => console.log((v ? 'OK  ' : 'FAIL') + ' ' + name);
const C = 'CCCCCCCCCCCCCCCCCCCCCCCCCCCC';
const dbGet = async () => (await (await fetch('http://localhost:8123/__fakedb')).json()).couples?.[C] || {};
async function phone(me, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  ctx.block = !!opts.block;
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => ctx.block ? r.abort() : r.fulfill({ status: 200, contentType: 'text/javascript', body: /12\.0\.0/.test(r.request().url()) ? fakeAi : fakeDb }));
  await ctx.addInitScript(([c, me]) => { try { if (!localStorage.getItem('entre-nous:couple')) { localStorage.setItem('entre-nous:couple', c); localStorage.setItem('entre-nous:me', me); } } catch (e) {} }, [C, me]);
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(me + ': ' + e.message)); p.ctx = ctx; return p;
}
await fetch('http://localhost:8123/__fakedb', { method: 'POST', body: JSON.stringify({ couples: { [C]: { meta: { couple: { a: 'Yanis', b: 'Sarah', style: 'partage' }, avatars: { a: { self: true }, b: { self: true } } } } } }) });
const A = await phone('a'), B = await phone('b');
await A.goto('http://localhost:8123/'); await B.goto('http://localhost:8123/'); await W(1500);
// 1. Écrit hors ligne, appli fermée, rouverte en ligne : rien n'est perdu.
await A.evaluate(() => { window.__offline = true; Store.add('capsule', { kind: 'mot', text: 'écrit hors ligne', from: 'a' }); });
await W(300);
ok('visible tout de suite', await A.evaluate(() => Store.cols.capsule.some(x => x.text === 'écrit hors ligne')));
ok('en attente dans la file', await A.evaluate(() => Store.outbox.some(o => o.p.startsWith('capsule/'))));
await A.goto('about:blank'); await W(200); await A.goto('http://localhost:8123/'); await W(2000);
ok('arrivé dans l\'espace commun après réouverture', Object.values((await dbGet()).capsule || {}).some(x => x.text === 'écrit hors ligne'));
ok('file vidée', await A.evaluate(() => Store.outbox.length === 0));
// 2. Démarrage sans réseau : on reste dans l'espace (copie), on écrit, puis le réseau revient.
const A2 = await phone('a', { block: true }); await A2.ctx.addInitScript(([c]) => { try { localStorage.setItem('entre-nous:couple', c); localStorage.setItem('entre-nous:me', 'a'); } catch (e) {} }, [C]);
await A.close();
await A2.goto('http://localhost:8123/'); await W(1500);
ok('hors ligne : reste relié à l\'espace', await A2.evaluate(() => Store.backend === 'shared' && !Store.db));
await A2.evaluate(() => Store.add('aventures', { title: 'Pique-nique hors ligne', statut: 'afaire' })); await W(200);
console.log('avant', await A2.evaluate(() => JSON.stringify({ layer: S.layer, lf: Store.loadFailed, ob: Store.outbox.length, act: document.activeElement && document.activeElement.tagName })));
await A2.evaluate(() => { S.layer = null; S.obShown = true; render(true); });
A2.ctx.block = false; await A2.evaluate(() => window.dispatchEvent(new Event('online'))); await W(2500);
console.log('après', await A2.evaluate(() => JSON.stringify({ db: !!Store.db, ob: Store.outbox.length, layer: S.layer })));
ok('envoyé au retour du réseau', Object.values((await dbGet()).aventures || {}).some(x => x.title === 'Pique-nique hors ligne'));
const P = A2;
// 3. Progression en même temps sur les deux téléphones.
await Promise.all([P.evaluate(() => flushSeen(['dec-1', 'dec-2'], true)), B.evaluate(() => flushSeen(['dec-3'], true))]); await W(1500);
ok('cartes vues des deux côtés gardées', await B.evaluate(() => ['dec-1', 'dec-2', 'dec-3'].every(x => seenSet().has(x)) && nParties() === 2));
// 4. Achats au même moment : le plus récent est remboursé.
await fetch('http://localhost:8123/__fakeops', { method: 'POST', body: JSON.stringify([[`couples/${C}/meta/game/earn/test`, 100]]) }); await W(1200);
const items = await P.evaluate(() => { const l = Object.values(SHOP_BY_ID).filter(i => i.price >= 60 && i.price <= 100).map(i => i.id); return l.slice(0, 2); });
await Promise.all([P.evaluate(id => Jeu.buy(id), items[0]), B.evaluate(id => Jeu.buy(id), items[1])]); await W(2500);
await P.evaluate(() => render(true)); await B.evaluate(() => render(true)); await W(1500);
ok('cagnotte jamais négative', await B.evaluate(() => Jeu.rawHearts() >= 0) && await P.evaluate(() => Jeu.rawHearts() >= 0));
ok('un seul des deux achats gardé', await B.evaluate(ids => ids.filter(id => Jeu.owns(id)).length === 1, items));
// 5. Qui est qui : B ne peut pas prendre « a » sans confirmer.
await P.evaluate(() => claimMe('a')); await W(1000);
await B.evaluate(() => { ACT['ob-me']({ v: 'a' }); render(true); }); await W(200);
ok('B doit confirmer', await B.evaluate(() => S.layer && S.layer.name === 'claim' && whoAmI() === 'b'));
await B.click('[data-a="claim-other"]'); await W(300);
ok('B reste Sarah', await B.evaluate(() => whoAmI() === 'b' && !S.layer));
// 6. Prénoms : un changement de l'un n'efface pas celui de l'autre.
await P.evaluate(() => { S.drafts = { nbda: '1999-05-04' }; ACT['save-names'](); }); await B.evaluate(() => { S.drafts = { nb: 'Sarah ♥' }; ACT['save-names'](); }); await W(1500);
ok('les deux réglages gardés', await B.evaluate(() => couple().bda === '1999-05-04' && couple().b === 'Sarah ♥' && couple().a === 'Yanis'));
// 7. Une histoire, deux téléphones : un seul écrit la suite.
await P.evaluate(() => Store.put('contes', 'h1', { title: 'À deux', pitch: 'p', genre: 'romance', length: 'courte', max: 5, mode: 'conte', steps: [], status: 'play', createdAt: Date.now(), seed: { l: 0, o: 0, al: 0, m: 0, r: 1 } })); await W(1200);
await P.evaluate(() => { window.__aiDelay = 3000; S.layer = { type: 'conte' }; ACT['cx-open']({ id: 'h1' }); render(true); }); await W(900);
await B.evaluate(() => { S.layer = { type: 'conte' }; ACT['cx-open']({ id: 'h1' }); render(true); }); await W(300);
ok('B voit « sur l\'autre téléphone »', await B.evaluate(() => /autre téléphone/.test(document.querySelector('.cx-loader')?.textContent || '')));
await W(6000);
const st = await B.evaluate(() => Store.cols.contes.find(x => x.id === 'h1'));
ok('une seule première étape, verrou levé', st.steps.length === 1 && !st.gen);
// 8. Un dé lancé ne se relance pas.
await P.evaluate(() => Store.put('contes', 'r1', { title: 'Dé', pitch: 'p', genre: 'fantasy', length: 'courte', max: 5, mode: 'rpg', status: 'play', createdAt: Date.now(), seed: { l: 0, o: 0, al: 0, m: 0, r: 1 },
  rpg: { heroes: { a: { cls: 'lame', stats: { force: 3, agilite: 4, esprit: 1, charme: 2 }, lvl: 1, xp: 0, pv: 30, pvMax: 30, pm: 6, pmMax: 6 }, b: { cls: 'mage', stats: { force: 1, agilite: 2, esprit: 5, charme: 2 }, lvl: 1, xp: 0, pv: 22, pvMax: 22, pm: 14, pmMax: 14 } }, items: [], gold: 0, wins: 0, bosses: 0 },
  steps: [{ text: 'Une falaise.', sc: 'foret', choices: [{ t: 'Grimper', stat: 'force', dc: 12 }, { t: 'Contourner' }] }] })); await W(1200);
await P.evaluate(() => { S.layer = { type: 'conte' }; ACT['cx-open']({ id: 'r1' }); ACT['cx-pick']({ i: 0 }); ACT['cx-roll']({ v: 'a' }); render(true); }); await W(1500);
const roll1 = await P.evaluate(() => S.cx.roll && S.cx.roll.v);
await P.evaluate(() => { ACT['cx-uncheck'](); ACT['cx-roll']({ v: 'b' }); render(true); });
ok('pas de relance', await P.evaluate(r => S.cx.roll.v === r && S.cx.roll.who === 'a', roll1));
await B.evaluate(() => { ACT['cx-open']({ id: 'r1' }); render(true); }); await W(200);
ok('l\'autre téléphone voit le même dé', await B.evaluate(r => !!document.querySelector('.cx-roll') && S.cx.roll.v === r, roll1));
// 9. Remise à zéro : un changement resté hors ligne sur B ne ressuscite pas.
await B.evaluate(() => { window.__offline = true; Store.add('capsule', { kind: 'mot', text: 'fantôme', from: 'b' }); }); await W(200);
await P.evaluate(() => { localStorage.setItem('entre-nous:owner', Shared.code()); Store.patchMeta('space', { owner: deviceId() }); }); await W(800);
await P.evaluate(() => ACT['reset-all']()); await W(2500);
await B.goto('about:blank'); await B.goto('http://localhost:8123/'); await W(2500);
ok('le changement d\'avant la remise à zéro est jeté', !Object.values((await dbGet()).capsule || {}).some(x => x.text === 'fantôme'));
console.log('errors', JSON.stringify(errs)); await b.close();
