import { chromium, LAUNCH } from '../lib/pw.mjs';
import fs from 'fs';
const fakeDb = fs.readFileSync('fbtest/fake-firebase.js', 'utf8'), fakeAi = fs.readFileSync('fake-ai.js', 'utf8');
const b = await chromium.launch(LAUNCH);
const errs = [], W = ms => new Promise(r => setTimeout(r, ms)), ok = (n, v) => console.log((v ? 'OK  ' : 'FAIL') + ' ' + n);
async function phone(me, C, ai) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: /12\.0\.0/.test(r.request().url()) ? (ai ? fakeAi : 'throw new Error("api-not-enabled")') : fakeDb }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await ctx.addInitScript(([c, me]) => { try { localStorage.setItem('entre-nous:couple', c); localStorage.setItem('entre-nous:me', me); localStorage.setItem('entre-nous:sfx', '0'); } catch (e) {} }, [C, me]);
  const P = await ctx.newPage(); P.on('pageerror', e => errs.push(e.message)); await P.goto('http://localhost:8123/'); await W(1500);
  await P.evaluate(() => { S.layer = null; S.obShown = true; render(true); }); return P;
}
const C1 = 'PAPAPAPAPAPAPAPAPAPAPAPAPAPA';
// Yanis (a) a créé l'espace : son appareil est le propriétaire
await fetch('http://localhost:8123/__fakedb', { method: 'POST', body: JSON.stringify({ couples: { [C1]: { meta: { couple: { a: 'Yanis', b: 'Sarah', style: 'partage' }, space: { owner: 'DEV-YANIS', who: { a: 'DEV-YANIS', b: 'DEV-SARAH' } }, avatars: { a: { self: true }, b: { self: true } } } } } }) });
const A = await phone('a', C1, false), B = await phone('b', C1, false);
ok('par défaut : Yanis = Papa, Sarah = Maman', await A.evaluate(() => parentOf('a') === 'Papa' && parentOf('b') === 'Maman'));
await A.evaluate(() => YJ.send('Coucou mon petit !')); await B.evaluate(() => YJ.send('Comment tu vas ?')); await W(800);
const log = await A.evaluate(() => yjLog().filter(e => e.w === 'y').map(e => e.x));
console.log('  ', JSON.stringify(log));
ok('il dit « Papa » à Yanis et « Maman » à Sarah', /Coucou Papa/.test(log[0]) && /Maman|ça va/.test(log[1]));
await A.evaluate(() => { S.layer = { type: 'sheet', name: 'yassen' }; render(true); }); await W(300);
ok('plus aucune mention « IA » dans la discussion', await A.evaluate(() => !/IA|sans IA/.test(document.getElementById('layer').textContent)));
// Réglages : passer Sarah en « Son prénom »
await A.evaluate(() => { S.layer = { type: 'sheet', name: 'names' }; render(true); }); await W(300);
await A.screenshot({ path: 'papa-reglages.png', fullPage: false });
await A.click('[data-a="set-draft"][data-k="npb"][data-v="prenom"]'); await A.click('[data-a="save-names"]'); await W(800);
ok('réglage partagé : Sarah = son prénom sur les deux téléphones', await B.evaluate(() => parentOf('b') === 'Sarah' && parentOf('a') === 'Papa'));
await A.click('[data-a="sheet"][data-name="names"]').catch(() => {}); 
// Avec l'IA : la demande dit comment l'appeler
const C2 = 'MAMAMAMAMAMAMAMAMAMAMAMAMAMA';
await fetch('http://localhost:8123/__fakedb', { method: 'POST', body: JSON.stringify({ couples: { [C2]: { meta: { couple: { a: 'Yanis', b: 'Sarah', style: 'partage' }, space: { owner: 'DEV-YANIS', who: { a: 'DEV-YANIS', b: 'DEV-SARAH' } }, avatars: { a: { self: true }, b: { self: true } } } } } }) });
const Q = await phone('b', C2, true); await Q.evaluate(() => YJ.send('Tu nous aimes ?')); await W(300);
const pr = await Q.evaluate(() => window.__yjPrompt);
ok('IA : « Sarah (que tu appelles « Maman ») » et « Yanis « Papa »', /Sarah \(que tu appelles « Maman »\)/.test(pr) && /Tu appelles Yanis « Papa » et Sarah « Maman »/.test(pr));
console.log('errors', JSON.stringify(errs)); await b.close();
