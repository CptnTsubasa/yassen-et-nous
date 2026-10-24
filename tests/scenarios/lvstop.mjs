import { chromium, LAUNCH } from '../lib/pw.mjs';
import fs from 'fs';
const fakeDb = fs.readFileSync('fbtest/fake-firebase.js', 'utf8');
const b = await chromium.launch(LAUNCH);
const errs = [], W = ms => new Promise(r => setTimeout(r, ms)), ok = (n, v) => console.log((v ? 'OK  ' : 'FAIL') + ' ' + n);
const C = 'QQQQQQQQQQQQQQQQQQQQQQQQQQQQ';
await fetch('http://localhost:8123/__fakedb', { method: 'POST', body: JSON.stringify({ couples: { [C]: { meta: { couple: { a: 'Yanis', b: 'Sarah', style: 'partage' }, avatars: { a: { self: true }, b: { self: true } } } } } }) });
async function phone(me) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: fakeDb }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await ctx.addInitScript(([c, me]) => { try { localStorage.setItem('entre-nous:couple', c); localStorage.setItem('entre-nous:me', me); localStorage.setItem('entre-nous:sfx', '0'); } catch (e) {} }, [C, me]);
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(me + ': ' + e.message)); await p.goto('http://localhost:8123/'); return p;
}
const A = await phone('a'), B = await phone('b'); await W(1500);
for (const P of [A, B]) await P.evaluate(() => { S.layer = null; S.obShown = true; render(true); });
await A.evaluate(() => { S.setup = { mode: 'questions', cat: 'qui', mood: 'surpris', dur: 5, style: 'distance' }; ACT.start(); render(true); }); await W(1200);
await B.evaluate(() => { ACT['lv-join'](); render(true); }); await W(400);
for (const P of [A, B]) { const r = await P.$('[data-a="lv-rules-ok"]'); if (r) { await r.click(); await W(150); } }
ok('plus de bouton « arrêter » direct', !(await A.$('[data-a="lv-end"]')) && !!(await A.$('[data-a="lv-stop-ask"]')));
await A.click('[data-a="lv-stop-ask"]'); await W(1200);
ok('Yanis attend la réponse, sans pouvoir valider seul', !!(await A.$('[data-a="lv-stop-cancel"]')) && !(await A.$('[data-a="lv-stop-yes"]')));
ok('Sarah reçoit la proposition', !!(await B.$('[data-a="lv-stop-yes"]')));
await B.screenshot({ path: 'stop-b.png' });
await B.click('[data-a="lv-stop-cancel"]'); await W(1200);
ok('« On continue » : la partie continue', await A.evaluate(() => !Live.state.ended && !Live.state.stopReq && S.layer && S.layer.type === 'live'));
await A.click('[data-a="lv-stop-ask"]'); await W(1200); await B.click('[data-a="lv-stop-yes"]'); await W(1500);
ok('accord des deux : partie arrêtée chez les deux', await A.evaluate(() => Live.state.ended && Live.state.aborted && !S.layer) && await B.evaluate(() => !S.layer));
console.log('errors', JSON.stringify(errs)); await b.close();
