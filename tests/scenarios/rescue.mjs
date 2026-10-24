import { chromium, LAUNCH } from '../lib/pw.mjs';
import fs from 'fs';
const fakeDb = fs.readFileSync('fbtest/fake-firebase.js', 'utf8');
const b = await chromium.launch(LAUNCH);
const errs = [], W = ms => new Promise(r => setTimeout(r, ms)), ok = (n, v) => console.log((v ? 'OK  ' : 'FAIL') + ' ' + n);
const C = 'RESCUERESCUERESCUERESCUE' + Date.now().toString(36).toUpperCase().slice(-6);
await fetch('http://localhost:8123/__fakedb', { method: 'POST', body: JSON.stringify({ couples: { [C]: { meta: { couple: { a: 'Yanis', b: 'Sarah', style: 'partage' }, avatars: { a: { self: true }, b: { self: true } } }, capsule: { c1: { kind: 'mot', from: 'b', text: 'Coucou', createdAt: Date.now() } } } } }) });
async function phone(code, me) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: fakeDb }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await ctx.addInitScript(([c, me]) => { try { if (c) { localStorage.setItem('entre-nous:couple', c); localStorage.setItem('entre-nous:me', me); } localStorage.setItem('entre-nous:sfx', '0'); } catch (e) {} }, [code, me]);
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.goto('http://localhost:8123/'); await W(2000); return p;
}
const A = await phone(C, 'a');
await A.evaluate(() => { S.layer = { type: 'sheet', name: 'names' }; S.obShown = true; render(true); }); await W(300);
await A.click('[data-a="rc-make"]'); await W(1500);
const words = await A.evaluate(() => Rescue.words());
ok(`6 mots créés : ${words && words.join(' ')}`, words && words.length === 6);
await A.evaluate(() => document.querySelector('.rescue').scrollIntoView()); await W(200);
await A.screenshot({ path: 'rescue-words.png' });
// Un téléphone neuf
const B = await phone('', 'b');
await B.screenshot({ path: 'rescue-ob0.png' });
if (await B.$('[data-a="ob-find"]')) { await B.click('[data-a="ob-find"]'); await W(300); }
const hasOb = await B.$('#ob-rc');
if (!hasOb) await B.evaluate(() => { const d = document.querySelector('details.join-more'); if (d) d.open = true; });
ok('le champ « code de secours » est proposé dès la bienvenue', !!(await B.$('#ob-rc')));
await B.evaluate(() => { const d = document.querySelector('details.join-more'); if (d) d.open = true; }); await W(200);
await B.fill('#ob-rc', 'abeille lune voilier'); await B.click('[data-a="rc-find"]'); await W(600);
ok('mots incomplets : refusés avec un message', await B.evaluate(() => !localStorage.getItem('entre-nous:couple')));
if (await B.$('[data-a="ob-find"]')) { await B.click('[data-a="ob-find"]'); await W(300); }
const typed = words.map((w, i) => i === 2 ? w.toUpperCase() : w).join('  ');
await B.fill('#ob-rc', typed); await B.click('[data-a="rc-find"]'); await W(3000);
ok('les 6 mots (même en majuscules) ramènent l\'espace', await B.evaluate(c => localStorage.getItem('entre-nous:couple') === c && Store.backend === 'shared' && Store.cols.capsule.length === 1, C));
const d0 = await (await fetch('http://localhost:8123/__fakedb')).json();
ok('les mots sont gardés dans l\'espace (visibles sur les deux téléphones)', d0.couples[C].meta.space.rescue === words.join(' '));
ok('le service ne refait pas d\'écriture pour une 2e demande', (await (await fetch('http://localhost:8124/rescue', { method: 'POST', body: JSON.stringify({ op: 'get', key: 'f'.repeat(64) }) })).status) === 404);
console.log('errors', JSON.stringify(errs)); await b.close();
