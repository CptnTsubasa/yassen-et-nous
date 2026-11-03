// Contact : Yassen Jr. garde un mot, coupe un indice trop facile, lâche une lettre après un contact réussi,
// se fait deviner son mot ; mode soirée (un·e ami·e garde le mot) ; partie à distance. Captures tests/.build/contact-*.png.
import { chromium, LAUNCH } from '../lib/pw.mjs';
import fs from 'fs';
const fakeDb = fs.readFileSync('fbtest/fake-firebase.js', 'utf8'), fakeAi = fs.readFileSync('fake-ai.js', 'utf8');
const b = await chromium.launch(LAUNCH);
const errs = [], W = ms => new Promise(r => setTimeout(r, ms)), ok = (n, v) => console.log((v ? 'OK  ' : 'FAIL') + ' ' + n);
const C = 'CONTACTCONTACTCONTACTCONTACZ';
await fetch('http://localhost:8123/__fakedb', { method: 'POST', body: JSON.stringify({ couples: { [C]: { meta: { couple: { a: 'Yanis', b: 'Sarah', style: 'partage' }, avatars: { a: { self: true }, b: { self: true } } } } } }) });
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
// Une manche sur ce téléphone : mot et indice tapés, « Contact ! », compte à rebours, révélation
async function round(P, w, clue) {
  if (await P.$('[data-a="ct-hide"]')) await click(P, '[data-a="ct-hide"]');
  await P.fill('#ct-w', w); await P.fill('#ct-c', clue); await click(P, '[data-a="ct-clue"]'); await W(700);
  await click(P, '[data-a="ct-contact"]'); await W(3400);
}
await click(A, '[data-a="tab"][data-tab="play"]');
ok('Contact dans l\'onglet Jouer', await A.isVisible('[data-a="open-mode"][data-mode="contact"]'));
await click(A, '[data-a="open-mode"][data-mode="contact"]'); await A.screenshot({ path: 'contact-1-accueil.png' });
ok('Yassen « Malin » par défaut', await A.getAttribute('[data-a="ct-opt"][data-k="level"][data-v="malin"]', 'aria-pressed') === 'true');
await click(A, '[data-a="ct-start"]');
await A.evaluate(() => { S.ct.secret = 'MARMOTTE'; S.ct.turn = 'a'; render(true); }); await W(200);
ok('le mot commence par M, la suite est cachée', await A.evaluate(() => [...document.querySelectorAll('.ct-word span')].map(s => s.textContent).join('') === 'M…'));
// Mot qui ne commence pas par le bon début : refusé
await click(A, '[data-a="ct-hide"]'); await A.fill('#ct-w', 'chocolat'); await A.fill('#ct-c', 'miam'); await click(A, '[data-a="ct-clue"]');
ok('un mot qui ne commence pas par M est refusé', await A.evaluate(() => S.ct.phase === 'word'));
// Manche 1 : indice trop facile, Yassen coupe
await A.evaluate(() => { window.__ctMot = 'montagne'; window.__ctConf = 95; });
await round(A, 'montagne', 'ça se monte et ça se descend');
await A.screenshot({ path: 'contact-2-coupe.png' });
ok('indice trop facile : Yassen coupe (« montagne »)', await A.evaluate(() => !!S.ct.yj && S.ct.yj.cut === true) && /Coupé/.test(await A.textContent('.layer')));
ok('l\'IA reçoit le début du mot et l\'indice, pas le mot secret', await A.evaluate(() => /« M »/.test(window.__ctPrompt) && /monte/.test(window.__ctPrompt) && !/MARMOTTE/i.test(window.__ctPrompt)));
await click(A, '[data-a="ct-next"]');
ok('manche suivante : à Sarah de donner l\'indice, aucune lettre gagnée', await A.evaluate(() => S.ct.round === 2 && S.ct.turn === 'b' && S.ct.shown === 1 && S.ct.cuts === 1));
// Manche 2 : indice subtil, Yassen se trompe, contact réussi → une lettre de plus
await A.evaluate(() => { window.__ctMot = 'maison'; window.__ctConf = 40; });
await round(A, 'marionnette', 'Pinocchio en était une');
await A.screenshot({ path: 'contact-3-revelation.png' });
ok('Yassen se trompe et le dit (« maison »)', await A.evaluate(() => S.ct.yj.cut === false) && /maison/.test(await A.textContent('.layer')));
await click(A, '[data-a="ct-next"][data-v="ok"]');
ok('contact réussi : Yassen dévoile une lettre (MA…)', await A.evaluate(() => S.ct.shown === 2 && [...document.querySelectorAll('.ct-word span')].map(s => s.textContent).join('') === 'MA…'));
await A.screenshot({ path: 'contact-4-lettre.png' });
// Contact sur le mot secret lui-même : Yassen ne peut pas couper, et c'est gagné
const save = await A.evaluate(() => JSON.stringify(S.ct));
await A.evaluate(() => { window.__ctMot = 'marmotte'; window.__ctConf = 99; });
await round(A, 'marmotte', 'elle siffle dans la montagne');
ok('contact sur son propre mot : pas de coupure', await A.evaluate(() => S.ct.yj && S.ct.yj.cut === false && S.ct.yj.own === true) && /C'est le mot de Yassen/.test(await A.textContent('.layer')));
await click(A, '[data-a="ct-next"][data-v="ok"]');
ok('… et la partie est gagnée', await A.evaluate(() => S.ct.phase === 'end' && S.ct.won && S.ct.how === 'contact'));
await A.evaluate(s => { S.ct = JSON.parse(s); render(true); }, save); await W(200);
// Tenter directement le mot : raté, puis trouvé
await click(A, '[data-a="ct-guess-box"]'); await A.fill('#ct-sec', 'mardi'); await click(A, '[data-a="ct-guess"]');
ok('mot tenté au hasard : raté', await A.evaluate(() => S.ct.tries === 1 && S.ct.phase !== 'end'));
await click(A, '[data-a="ct-guess-box"]'); await A.fill('#ct-sec', 'Marmotte'); await click(A, '[data-a="ct-guess"]'); await W(400);
await A.screenshot({ path: 'contact-5-gagne.png' });
ok('mot trouvé : victoire, étoiles et cœurs', await A.evaluate(() => S.ct.phase === 'end' && S.ct.won) && /Trouvé/.test(await A.textContent('.layer')) && await A.evaluate(() => Object.keys(Store.meta.game.earn || {}).some(k => k.startsWith('ct_'))));
// Sans IA : Yassen devine parmi ses propres mots
const off = await A.evaluate(async () => { AI.state = 'off'; const r = await ctThink('PAP', 'il vole', 'redoutable'); AI.state = ''; return r; });
ok(`sans IA, Yassen devine quand même (« ${off.m} »)`, /^PAP/.test(off.m));
// Mode soirée : le gardien est un·e ami·e
await click(A, '[data-a="ct-quit"]'); await click(A, '[data-a="ct-opt"][data-k="keeper"][data-v="soiree"]');
await click(A, '[data-a="ct-start"]');
ok('soirée : il faut un mot secret pour le gardien', await A.evaluate(() => !S.ct));
await A.fill('#ct-keep', 'Bougie'); await click(A, '[data-a="ct-start"]');
await A.evaluate(() => {}); await click(A, '[data-a="ct-hide"]'); await A.fill('#ct-w', 'ballon'); await click(A, '[data-a="ct-clue"]'); await click(A, '[data-a="ct-contact"]'); await W(3300);
ok('soirée : bouton « Le gardien a coupé »', await A.isVisible('[data-a="ct-next"][data-v="cut"]'));
await click(A, '[data-a="ct-next"][data-v="ok"]');
ok('soirée : contact réussi, BO…', await A.evaluate(() => S.ct.secret === 'BOUGIE' && S.ct.shown === 2));
// À distance : Yanis donne l'indice, Sarah fait contact sur son téléphone
const B = await phone('b');
await A.evaluate(() => { S.ct = null; S.layer = null; window.__ctMot = 'mouton'; window.__ctConf = 10; startLiveContact('malin'); }); await W(500);
await A.evaluate(() => { Live.write({ secret: 'MARMOTTE', turn: 'a' }); }); await W(900);
await B.evaluate(() => { S.layer = { type: 'live' }; render(true); }); await W(500);
ok('à distance : Sarah attend l\'indice de Yanis', /Yanis cherche un mot qui commence par M/.test(await B.textContent('.layer')));
await A.fill('#ct-w', 'Mélodie'); await A.fill('#ct-c', 'une suite de notes'); await click(A, '[data-a="ct-clue"]'); await W(1200);
ok('à distance : l\'indice arrive chez Sarah', /une suite de notes/.test(await B.textContent('.layer')));
await B.fill('#ct-g', 'melodie'); await click(B, '[data-a="ct-contact"]'); await W(4200);
await B.screenshot({ path: 'contact-6-distance.png' });
ok('à distance : contact réussi (accents ignorés)', /Contact !/.test(await B.textContent('.layer')) && /Contact !/.test(await A.textContent('.layer')));
await click(B, '[data-a="ct-next"][data-v="ok"]'); await W(900);
ok('à distance : la lettre arrive sur les deux téléphones', await A.evaluate(() => Live.state.shown === 2 && Live.state.turn === 'b') && await B.evaluate(() => Live.state.shown === 2));
console.log('errors', JSON.stringify(errs)); await b.close();
