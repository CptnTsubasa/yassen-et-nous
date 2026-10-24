import { chromium, LAUNCH } from '../lib/pw.mjs';
import fs from 'fs';
const fakeDb = fs.readFileSync('fbtest/fake-firebase.js', 'utf8');
const b = await chromium.launch(LAUNCH);
const errs = [], W = ms => new Promise(r => setTimeout(r, ms));
const ok = (name, v) => console.log((v ? 'OK  ' : 'FAIL') + ' ' + name);
const C = 'EEEEEEEEEEEEEEEEEEEEEEEEEEEE';
await fetch('http://localhost:8123/__fakedb', { method: 'POST', body: JSON.stringify({ couples: { [C]: { meta: { couple: { a: 'Yanis', b: 'Sarah', style: 'partage' }, avatars: { a: { self: true }, b: { self: true } } } } } }) });
const ctx = await b.newContext({ viewport: { width: 375, height: 667 } });
await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: fakeDb }));
await ctx.addInitScript(([c]) => { try { localStorage.setItem('entre-nous:couple', c); localStorage.setItem('entre-nous:me', 'a'); } catch (e) {} }, [C]);
const P = await ctx.newPage(); P.on('pageerror', e => errs.push(e.message));
await P.goto('http://localhost:8123/'); await W(1800);
await P.screenshot({ path: 'l4-home.png' });
await P.evaluate(() => toast('Un petit message de test'));
await W(80);
const box = await P.evaluate(() => { const r = document.querySelector('.toast').getBoundingClientRect(); return [r.left + r.width / 2, innerWidth / 2, getComputedStyle(document.querySelector('.toast')).pointerEvents]; });
ok('message centré dès son apparition, sans bloquer les touches', Math.abs(box[0] - box[1]) < 2 && box[2] === 'none');
await W(400);
const box2 = await P.evaluate(() => { const r = document.querySelector('.toast').getBoundingClientRect(); return Math.abs(r.left + r.width / 2 - innerWidth / 2); });
ok('message toujours centré après l\'animation', box2 < 2);
// Bouton retour
await P.click('.appbar [data-name="names"]'); await W(300);
ok('le réglage prend le focus', await P.evaluate(() => document.activeElement && document.activeElement.classList.contains('layer')));
await P.goBack(); await W(400);
ok('retour ferme l\'écran sans quitter l\'appli', await P.evaluate(() => !S.layer && location.href.startsWith('http://localhost:8123/')));
// Brouillons
await P.evaluate(() => { ACT.sheet({ name: 'mot' }); render(true); }); await W(200);
const fid = await P.evaluate(() => (document.querySelector('#layer textarea[data-d]') || {}).id);
await P.fill('#' + fid, 'Mon brouillon tout doux'); await W(700);
await P.reload(); await W(1800);
ok('brouillon retrouvé après fermeture', await P.evaluate(id => S.drafts[id] === 'Mon brouillon tout doux', fid));
// Chibis cachés : la boucle s'arrête
await P.evaluate(() => { localStorage.setItem('entre-nous:buddies', '0'); render(true); }); await W(300);
ok('animation des chibis arrêtée quand ils sont masqués', await P.evaluate(() => Buddies.running === false));
await P.evaluate(() => { localStorage.setItem('entre-nous:buddies', '1'); render(true); }); await W(300);
ok('et repart quand ils reviennent', await P.evaluate(() => Buddies.running === true));
// Écran secours de jeu : le retour pendant une partie demande confirmation
await P.evaluate(() => { ACT['open-mode']({ mode: 'questions' }); render(true); ACT.start(); render(true); }); await W(400);
await P.goBack(); await W(400);
ok('retour pendant une partie : confirmation', await P.evaluate(() => S.layer && S.layer.type === 'game' && !!document.querySelector('[data-a="g-stay"]')));
await P.screenshot({ path: 'l4-quit.png' });
console.log('errors', JSON.stringify(errs)); await b.close();
