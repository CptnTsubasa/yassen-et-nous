// L'évasion de Yassen Jr. : une partie complète du grenier sur deux téléphones (panier, cartons, horloge, morse,
// coffre, roue, loquet, final à deux), puis la victoire, l'album et les cœurs. Captures dans tests/.build/esc-*.png.
import { chromium, LAUNCH } from '../lib/pw.mjs';
import fs from 'fs';
const fakeDb = fs.readFileSync('fbtest/fake-firebase.js', 'utf8'), fakeAi = fs.readFileSync('fake-ai.js', 'utf8');
const b = await chromium.launch(LAUNCH);
const errs = [], W = ms => new Promise(r => setTimeout(r, ms)), ok = (n, v) => console.log((v ? 'OK  ' : 'FAIL') + ' ' + n);
const C = 'ESCAPEESCAPEESCAPEESCAPEESCZ';
await fetch('http://localhost:8123/__fakedb', { method: 'POST', body: JSON.stringify({ couples: { [C]: { meta: { couple: { a: 'Yanis', b: 'Sarah', style: 'partage', since: '2024-02-14' }, avatars: { a: { self: true }, b: { self: true } }, game: { days: { '2026-10-20': true } } }, aventures: { av1: { title: 'Amsterdam', statut: 'realisee', createdAt: 1 } } } } }) });
async function phone(me) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: /12\.0\.0/.test(r.request().url()) ? fakeAi : fakeDb }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await ctx.addInitScript(([c, me]) => { try { localStorage.setItem('entre-nous:couple', c); localStorage.setItem('entre-nous:me', me); localStorage.setItem('entre-nous:sfx', '0'); localStorage.setItem('entre-nous:yj-daily-off', '1'); localStorage.setItem('entre-nous:hap', '9999'); } catch (e) {} }, [C, me]);
  const P = await ctx.newPage(); P.on('pageerror', e => errs.push(me + ': ' + e.message)); await P.goto('http://localhost:8123/'); await W(1500);
  await P.evaluate(() => { S.layer = null; S.obShown = true; render(true); }); await W(1500);
  return P;
}
const A = await phone('a'), B = await phone('b');
const shot = async (P, n) => { await W(250); await P.screenshot({ path: `esc-${n}.png` }); };
const click = async (P, sel) => { await P.click(sel); await W(180); };
const pick = async (P, k) => { if (await P.evaluate(k => S.esc.sel !== k, k)) await click(P, `[data-a="esc-item"][data-k="${k}"]`); };
const zone = async (P, z) => { await P.evaluate(z => ACT['esc-z']({ z }), z); await P.evaluate(() => render(true)); await W(150); };
// Le générateur de cartons : toujours une solution unique, indices partagés
const gen = await A.evaluate(() => { let okN = 0; for (let s = 1; s <= 300; s++) { const c = escCartons((() => { let x = s; return () => { x = (x * 16807) % 2147483647; return x / 2147483647; }; })(), ['Noël', 'Vacances', 'Bébé Yassen', 'Lettres']); if (c.ok && c.a.length === 3 && c.b.length === 3) okN++; } return okN; });
ok(`grille des cartons : solution unique et indices coupés en deux (${gen}/300 tirages)`, gen >= 295);
// Lancement depuis l'onglet Jouer
await click(A, '[data-a="tab"][data-tab="play"]');
ok('carte « L\'évasion de Yassen Jr. » dans Jouer', await A.isVisible('.esc-card'));
await click(A, '.esc-card'); await shot(A, '01-accueil');
ok('Malin choisi par défaut', await A.getAttribute('[data-a="esc-level"][data-v="malin"]', 'aria-pressed') === 'true');
await click(A, '[data-a="esc-who"][data-v="a"]'); await click(A, '[data-a="esc-start"]'); await W(800);
const run0 = await A.evaluate(() => Esc.state);
ok('partie lancée : Yanis au grenier, vos vraies données utilisées', run0.who.haut === 'a' && run0.pd.date === '02-14' && run0.pd.lab === 'Amsterdam');
await W(600);
ok('l\'autre téléphone voit la partie', await B.evaluate(() => Esc.active()));
await click(B, '[data-a="tab"][data-tab="home"]');
ok('accueil de Sarah : carte « Évasion en cours »', await B.isVisible('.esc-card'));
await click(B, '.esc-card'); await W(300);
const P = await A.evaluate(() => escGen(Esc.state)), P2 = await B.evaluate(() => escGen(Esc.state));
ok('même tirage sur les deux téléphones', JSON.stringify(P) === JSON.stringify(P2));
await shot(A, '02-grenier-noir'); await shot(B, '03-couloir');
ok('grenier dans le noir, couloir éclairé', await A.isVisible('.esc-scene') && !(await A.evaluate(() => Esc.state.f.light)));
// Acte 1 : les vitres de la trappe → le tiroir de la commode
await zone(A, 'trappe'); await shot(A, '04-trappe-vitres');
await zone(B, 'commode');
const want = P.colors.map(c => ['rouge', 'bleu', 'vert', 'jaune', 'violet'].indexOf(c));
await click(B, '[data-a="esc-tir-try"]');
ok('mauvais code → faux pas compté', await A.waitForFunction(() => Esc.state.sl === 1, null, { timeout: 3000 }).then(() => true, () => false));
for (let i = 0; i < 3; i++) for (let n = 0; n < want[i]; n++) await B.click(`[data-a="esc-tir"][data-i="${i}"]`);
await shot(B, '05-commode'); await click(B, '[data-a="esc-tir-try"]'); await W(400);
ok('tiroir ouvert : Sarah a l\'ampoule', await B.evaluate(() => Esc.state.it.ampoule === 'b'));
// Le panier : l'ampoule monte
await click(B, '[data-a="esc-send"][data-k="ampoule"]'); await W(500);
await zone(A, 'trappe'); await shot(A, '06-panier');
await click(A, '[data-a="esc-take"][data-k="ampoule"]'); await W(300);
await zone(A, 'lampe'); await click(A, '[data-a="esc-use"][data-x="lampe"]'); await W(500);
ok('l\'ampoule est montée et vissée : lumière !', await B.evaluate(() => !!Esc.state.f.light && Esc.state.it.ampoule === 'x'));
await A.evaluate(() => { S.esc.z = ''; render(true); }); await shot(A, '07-grenier-eclaire');
// Acte 2 : les cartons (un mauvais d'abord)
await zone(A, 'postits'); await shot(A, '08-postits'); await zone(B, 'carnet'); await shot(B, '09-carnet');
await zone(A, 'cartons');
const bad = P.cart.sol.findIndex(x => x === 'chaussettes' || x === 'boule');
await click(A, `[data-a="esc-carton"][data-i="${bad}"]`); await click(A, '[data-a="esc-carton-ok"]');
ok('mauvais carton → raté, faux pas', await A.waitForFunction(() => Esc.state.sl === 2, null, { timeout: 3000 }).then(() => true, () => false));
for (const x of ['cle', 'lettre']) { await click(A, `[data-a="esc-carton"][data-i="${P.cart.sol.indexOf(x)}"]`); await click(A, '[data-a="esc-carton-ok"]'); await W(250); }
await shot(A, '10-cartons');
ok('clé et lettre trouvées au grenier', await A.evaluate(() => Esc.state.it.cle === 'a' && Esc.state.it.lettre === 'a'));
// La clé descend, l'horloge à la date de rencontre (14 février → 2 h 14)
await pick(A, 'cle'); await click(A, '.esc-itemacts [data-a="esc-send"]'); await W(500);
await zone(B, 'trappe'); await click(B, '[data-a="esc-take"][data-k="cle"]'); await zone(B, 'horloge');
await click(B, '[data-a="esc-use"][data-x="horloge"]');
for (let n = 0; n < 2; n++) await B.click('[data-a="esc-clk"][data-k="h"][data-v="1"]');
for (let n = 0; n < 14; n++) await B.click('[data-a="esc-clk"][data-k="m"][data-v="1"]');
await shot(B, '11-horloge'); await click(B, '[data-a="esc-clk-try"]'); await W(400);
ok('horloge à 2 h 14 (14 février) → la carte', P.date.m === 2 && P.date.d === 14 && await B.evaluate(() => !!Esc.state.f.p3 && Esc.state.it.carte === 'b'));
// Le morse : Yassen clignote au grenier, l'ardoise est dans le couloir
await zone(A, 'fenetre'); await W(600);
const blinks = await A.evaluate(async () => { let n = 0, last = false; for (let i = 0; i < 90; i++) { await new Promise(r => setTimeout(r, 60)); const on = document.getElementById('esc-morse').classList.contains('on'); if (on && !last) n++; last = on; } return n; });
await shot(A, '12-fenetre-morse');
ok(`la fenêtre clignote en morse (${blinks} éclats en 5 s)`, blinks >= 3);
await zone(B, 'etagere'); await B.fill('#esc-ard', 'FAUX'); await click(B, '[data-a="esc-ardoise"]');
await B.fill('#esc-ard', P.word.toLowerCase()); await shot(B, '13-morse-table'); await click(B, '[data-a="esc-ardoise"]'); await W(300);
ok(`mot du morse (${P.word}) accepté, en minuscules aussi`, await A.evaluate(() => !!Esc.state.f.p4));
// Le coffre : les symboles des poutres dans l'ordre de la carte
await pick(B, 'carte'); await click(B, '[data-a="esc-ex"][data-k="carte"]'); await shot(B, '14-carte');
await zone(A, 'poutres'); await shot(A, '15-poutres');
await zone(B, 'coffre');
const ks = await B.evaluate(() => Object.keys(ESC_SYMS));
for (let i = 0; i < 4; i++) for (let n = 0; n < ks.indexOf(P.code[i]); n++) await B.click(`[data-a="esc-sym"][data-i="${i}"]`);
await shot(B, '16-coffre'); await click(B, '[data-a="esc-sym-try"]'); await W(300);
ok('coffre ouvert : la roue', await B.evaluate(() => Esc.state.it.roue === 'b'));
// La lettre codée et la roue
await pick(A, 'lettre'); await click(A, '[data-a="esc-ex"][data-k="lettre"]'); await shot(A, '17-lettre');
await pick(B, 'roue'); await click(B, '[data-a="esc-ex"][data-k="roue"]');
for (let n = 0; n < P.shift; n++) await B.click('[data-a="esc-rot"][data-v="1"]');
await shot(B, '18-roue');
const dec = P.coded.replace(/[A-Z]/g, c => String.fromCharCode((c.charCodeAt(0) - 65 - P.shift + 26) % 26 + 65));
ok(`la lettre se déchiffre avec la roue : « ${dec} »`, dec === P.plain && dec.endsWith(P.latch));
// Un indice de Yassen
await click(A, '[data-a="esc-hint"]'); await W(300);
ok('indice visible sur les deux téléphones', await B.evaluate(() => /Indice 1/.test(document.querySelector('.esc-yj').textContent)));
await zone(A, 'fenetre'); await A.fill('#esc-loq', P.latch); await click(A, '[data-a="esc-loquet"]'); await W(500);
ok('loquet ouvert → le final', await B.evaluate(() => !!Esc.state.f.p6 && !!document.querySelector('[data-hold="b"]')));
await shot(B, '19-final');
// Le final : les deux doigts en même temps, 3 souffles en Malin (1,5 s, 2,5 s, 3,5 s)
const hold = async (P, k, on) => {
  if (!on) { await P.mouse.up(); return; }
  const c = await P.evaluate(k => { const e = document.querySelector(`[data-hold="${k}"]`); e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, k);
  await P.mouse.move(c.x, c.y); await P.mouse.down();
};
await hold(A, 'a', true); await W(1200);
ok('un seul doigt : rien ne se passe', await A.evaluate(() => Esc.state.fn.r === 0));
await hold(A, 'a', false);
for (let r = 0; r < 3; r++) {
  await hold(A, 'a', true); await hold(B, 'b', true);
  await A.waitForFunction(r => Esc.state.fn.r > r, r, { timeout: 9000 }).catch(() => {});
  if (r === 1) await shot(B, '20-souffle');
  await hold(A, 'a', false); await hold(B, 'b', false); await W(300);
}
await W(1500);
const end = await B.evaluate(() => ({ win: Esc.state.f.win, ended: Esc.state.ended, sc: Esc.state.sc }));
ok('trois souffles ensemble → Yassen Jr. est libre !', !!end.win && end.ended);
await shot(A, '21-victoire'); await shot(B, '22-victoire-b');
const after = await A.evaluate(() => ({ cap: Store.cols.capsule.find(x => /grenier aux souvenirs/.test(x.question)), earn: Object.entries(Store.meta.game.earn || {}).filter(([k]) => k.startsWith('esc_')), done: Store.meta.escape.done.grenier }));
ok('page du journal rangée dans l\'album', !!after.cap && /journal/.test(after.cap.entries[0].label));
ok(`cœurs gagnés (${after.earn.map(x => x[1])})`, after.earn.length === 1 && after.earn[0][1] >= 30);
ok(`salle notée réussie (${after.done && after.done.st} étoiles)`, after.done && after.done.st >= 1);
ok('une seule page dans l\'album (pas de doublon)', await B.evaluate(() => Store.cols.capsule.filter(x => /grenier aux souvenirs/.test(x.question)).length === 1));
console.log('errors', JSON.stringify(errs)); await b.close();
