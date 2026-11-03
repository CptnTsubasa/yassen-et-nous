// « Tu me trouves plus… ou plus… ? » : pari secret, chrono (5 s par défaut), Yassen répond si c'est trop lent,
// accords selon Papa / Maman (et rien d'accordé sans ce réglage), portrait croisé, miroir, album, à distance.
import { chromium, LAUNCH } from '../lib/pw.mjs';
import fs from 'fs';
const fakeDb = fs.readFileSync('fbtest/fake-firebase.js', 'utf8'), fakeAi = fs.readFileSync('fake-ai.js', 'utf8');
const b = await chromium.launch(LAUNCH);
const errs = [], W = ms => new Promise(r => setTimeout(r, ms)), ok = (n, v) => console.log((v ? 'OK  ' : 'FAIL') + ' ' + n);
const C = 'PLUSOUPLUSOUPLUSOUPLUSOUPLZZ';
await fetch('http://localhost:8123/__fakedb', { method: 'POST', body: JSON.stringify({ couples: { [C]: { meta: { couple: { a: 'Yanis', b: 'Sarah', style: 'partage', pa: 'papa', pb: 'maman' }, avatars: { a: { self: true }, b: { self: true } } } } } }) });
async function phone(me) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: /12\.0\.0/.test(r.request().url()) ? fakeAi : fakeDb }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await ctx.addInitScript(([c, me]) => { try { localStorage.setItem('entre-nous:couple', c); localStorage.setItem('entre-nous:me', me); localStorage.setItem('entre-nous:sfx', '0'); localStorage.setItem('entre-nous:yj-daily-off', '1'); localStorage.setItem('entre-nous:hap', '9999'); } catch (e) {} }, [C, me]);
  const P = await ctx.newPage(); P.on('pageerror', e => errs.push(me + ': ' + e.message)); await P.goto('http://localhost:8123/'); await W(1500);
  await P.evaluate(() => { S.layer = null; S.obShown = true; render(true); }); await W(1200);
  return P;
}
const A = await phone('a');
const click = async (P, sel) => { await P.click(sel); await W(150); };
const idx = (x, y) => A.evaluate(([x, y]) => PO_PAIRS.findIndex(p => p[0] === x && p[1] === y), [x, y]);
await click(A, '[data-a="tab"][data-tab="play"]');
ok('appli publiée : l\'évasion reste cachée (pas de carte, aucune trace écrite)', !(await A.$('.esc-card')) && await A.evaluate(() => { Hap.check(); return !escOn() && !(Store.meta.escape || {}).since; }));
ok('le jeu est dans « Se découvrir »', await A.isVisible('[data-a="open-mode"][data-mode="plusou"]'));
await click(A, '[data-a="open-mode"][data-mode="plusou"]'); await A.screenshot({ path: 'plusou-1-accueil.png' });
ok('chrono de 5 secondes par défaut', await A.getAttribute('[data-a="po-chrono"][data-v="5"]', 'aria-pressed') === 'true');
await click(A, '[data-a="po-start"]');
const beau = await idx('{beau|belle}', '{intelligent|intelligente}'), soleil = await idx('soleil', 'lune');
await A.evaluate(([b1, s1]) => { S.po.deck = [b1, b1, s1, s1]; S.po.first = 'a'; render(true); }, [beau, soleil]);
// Question 1 : Yanis demande, accordé au masculin (réglage Papa)
await click(A, '[data-a="po-hid"]');
ok('Yanis : « plus beau ou plus intelligent »', /Tu me trouves plus beau ou plus intelligent/.test(await A.textContent('.po-q')));
await click(A, '[data-a="po-bet"][data-v="0"]');
ok('le pari est caché : Sarah ne voit que « lancer le chrono »', await A.isVisible('[data-a="po-go"]') && !(await A.$('[data-a="po-bet"]')));
await click(A, '[data-a="po-go"]'); await W(1200);
await A.screenshot({ path: 'plusou-2-chrono.png' });
const left = await A.textContent('#po-left');
ok(`le chrono tourne (${left} s restantes)`, +left >= 3 && +left <= 4);
await click(A, '[data-a="po-ans"][data-v="0"]');
ok('pari gagné', /Pari gagné/.test(await A.textContent('.layer')));
await click(A, '[data-a="po-why"]'); await click(A, '[data-a="po-contest"]');
await A.screenshot({ path: 'plusou-3-revelation.png' });
ok('« Pourquoi ? » et « Je conteste ! »', /explique-toi/.test(await A.textContent('.layer')) && /Contestation/.test(await A.textContent('.layer')));
await click(A, '[data-a="po-next"]');
// Question 2 : Sarah demande, accordé au féminin (réglage Maman), et personne ne répond à temps
await click(A, '[data-a="po-hid"]');
ok('Sarah : « plus belle ou plus intelligente »', /Tu me trouves plus belle ou plus intelligente/.test(await A.textContent('.po-q')));
await click(A, '[data-a="po-bet"][data-v="1"]'); await click(A, '[data-a="po-go"]'); await W(5600);
ok('trop lent : Yassen répond à la place', await A.evaluate(() => S.po.t1 === 1 && S.po.a1 != null) && /Trop lent/.test(await A.textContent('.layer')));
await click(A, '[data-a="po-next"]');
// Deux questions de plus, puis le portrait croisé
for (let i = 2; i < 4; i++) { await A.evaluate(i => { S.po['b' + i] = 0; S.po['a' + i] = i % 2; render(true); }, i); await click(A, '[data-a="po-next"]'); }
await A.screenshot({ path: 'plusou-4-portrait.png' });
const port = await A.textContent('.layer');
ok('portrait croisé : « Aux yeux de Sarah, Yanis est… plus beau qu\'intelligent »', /Aux yeux de Sarah, Yanis est/.test(port) && /plus beau qu'intelligent/.test(port) && /Aux yeux de Yanis, Sarah est/.test(port));
await click(A, '[data-a="po-album"]'); await W(400);
ok('portrait gardé dans l\'album, cœurs gagnés', await A.evaluate(() => Store.cols.capsule.some(x => /Comment on se voit/.test(x.question)) && Object.keys(Store.meta.game.earn || {}).some(k => k.startsWith('po_'))));
// Sans réglage Papa / Maman : aucune paire accordée pour cette personne
const neutral = await A.evaluate(() => { Store.meta.couple.pa = 'prenom'; Store.meta.space = { owner: '' }; let bad = 0; for (let n = 0; n < 50; n++) { const d = poDeck([], 'a'); d.forEach((x, i) => { if (i % 2 === 0 && /\{/.test(PO_PAIRS[x][0] + PO_PAIRS[x][1])) bad++; }); } Store.meta.couple.pa = 'papa'; return bad; });
ok('sans réglage Papa / Maman : que des paires sans accord pour cette personne', neutral === 0);
ok(`${await A.evaluate(() => PO_PAIRS.length)} paires, 10 questions par partie`, await A.evaluate(() => PO_PAIRS.length >= 100 && poDeck([], 'a').length === 10));
// Tour miroir, partie complète sur ce téléphone : pari + miroir en secret, réponse, révélation, jusqu'au portrait
await click(A, '[data-a="po-quit"]'); await click(A, '[data-a="po-miroir"][data-v="1"]'); await click(A, '[data-a="po-chrono"][data-v="0"]'); await click(A, '[data-a="po-start"]');
let seen = 0;
for (let q = 0; q < 10; q++) {
  if (!(await A.$('[data-a="po-hid"]'))) break;
  await click(A, '[data-a="po-hid"]'); await click(A, `[data-a="po-bet"][data-v="${q % 2}"]`);
  if (q === 0) { ok('miroir : demandé en secret juste après le pari, avant la réponse', await A.isVisible('[data-a="po-mir"]') && !(await A.$('[data-a="po-ans"]'))); await A.screenshot({ path: 'plusou-6-miroir.png' }); }
  await click(A, '[data-a="po-mir"][data-v="0"]');
  await click(A, `[data-a="po-ans"][data-v="${q % 3 ? 0 : 1}"]`);
  if (/Miroir\s*:/.test(await A.textContent('.layer'))) seen++;
  if (q === 0) { await click(A, '[data-a="po-why"]'); ok('« Pourquoi ? » : explication et 15 secondes', /explique-toi/.test(await A.textContent('.layer')) && !!(await A.$('.po-15'))); }
  { const nb = await A.$('[data-a="po-next"]'); if (q === 0) ok('« Question suivante » toujours disponible', !!nb && !(await nb.isDisabled())); }
  await click(A, '[data-a="po-next"]');
}
ok(`miroir : affiché à chaque révélation (${seen} sur 10)`, seen === 10);
const port2 = await A.textContent('.layer');
await A.screenshot({ path: 'plusou-7-portrait-miroir.png', fullPage: true });
ok('portrait avec le miroir (« se voit pareil » ou « se voit plutôt »)', /Votre portrait croisé/.test(port2) && /se voit (pareil|plutôt)/.test(port2));
ok('« Pourquoi ? » ne déborde pas sur la question suivante', await A.evaluate(() => !document.querySelector('.po-15')));
// À distance
const B = await phone('b');
await A.evaluate(([s1]) => { S.po = null; S.layer = null; startLivePlusou([], 5, true); Live.write({ deck: [s1, s1, s1, s1], first: 'a' }); }, [soleil]); await W(900);
await B.evaluate(() => { S.layer = { type: 'live' }; render(true); }); await W(500);
ok('à distance : Sarah attend le pari de Yanis', /parie en secret sur ta réponse/.test(await B.textContent('.layer')));
await click(A, '[data-a="po-bet"][data-v="1"]'); await W(600);
ok('à distance : Sarah attend encore pendant le miroir de Yanis', /parie en secret/.test(await B.textContent('.layer')));
await click(A, '[data-a="po-mir"][data-v="0"]'); await W(900);
await click(B, '[data-a="po-go"]'); await click(B, '[data-a="po-ans"][data-v="1"]'); await W(900);
await B.screenshot({ path: 'plusou-5-distance.png' });
ok('à distance : réponse vue sur les deux téléphones, pari gagné', /Pari gagné/.test(await A.textContent('.layer')) && /Pari gagné/.test(await B.textContent('.layer')));
await click(A, '[data-a="po-why"]'); await W(900);
ok('à distance : « Pourquoi ? » apparaît aussi chez Sarah', /explique-toi/.test(await B.textContent('.layer')) && /Miroir\s*:/.test(await B.textContent('.layer')));
await click(B, '[data-a="po-next"]'); await W(900);
ok('à distance : question suivante propre sur les deux téléphones (Sarah demande)', /Sarah demande à Yanis/.test(await A.textContent('.layer')) && !/explique-toi/.test(await A.textContent('.layer')) && /parie en secret sur ta réponse/.test(await A.textContent('.layer')));
console.log('errors', JSON.stringify(errs)); await b.close();
