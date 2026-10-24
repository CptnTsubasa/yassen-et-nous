import { chromium, LAUNCH } from '../lib/pw.mjs';
import fs from 'fs';
const fakeDb = fs.readFileSync('fbtest/fake-firebase.js', 'utf8');
const b = await chromium.launch(LAUNCH);
const errs = [], W = ms => new Promise(r => setTimeout(r, ms));
const C = 'LLLLLLLLLLLLLLLLLLLLLLLLLLLL', cat = process.argv[2] || 'qui', mode = process.argv[3] || 'questions';
await fetch('http://localhost:8123/__fakedb', { method: 'POST', body: JSON.stringify({ couples: { [C]: { meta: { couple: { a: 'Yanis', b: 'Sarah', style: 'partage' }, avatars: { a: { self: true }, b: { self: true } } } } } }) });
async function phone(me) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: fakeDb }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await ctx.addInitScript(([c, me]) => { try { localStorage.setItem('entre-nous:couple', c); localStorage.setItem('entre-nous:me', me); localStorage.setItem('entre-nous:sfx', '0'); } catch (e) {} }, [C, me]);
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(me + ': ' + e.message)); await p.goto('http://localhost:8123/'); return p;
}
const A = await phone('a'), B = await phone('b'); await W(1500);
for (const P of [A, B]) await P.evaluate(() => { S.layer = null; S.obShown = true; render(true); });
await A.evaluate(([cat, mode]) => { S.setup = { mode, cat, mood: 'surpris', dur: 5, style: 'distance' }; ACT.start(); render(true); }, [cat, mode]); await W(1200);
await B.evaluate(() => { ACT['lv-join'](); render(true); }); await W(500);
for (const P of [A, B]) { const r = await P.$('[data-a="lv-rules-ok"]'); if (r) { await r.click(); await W(200); } }
const state = P => P.evaluate(() => ({ i: Live.state && Live.state.i, ans: Live.state && JSON.stringify(Live.state.ans), btns: [...document.querySelectorAll('#layer [data-a]')].map(x => x.dataset.a).filter(a => /^lv-|close/.test(a)).join(',') }));
for (let round = 0; round < 3; round++) {
  for (const [P, n] of [[B, 'B'], [A, 'A']]) {
    const pick = await P.$('[data-a="lv-pick"]'), sub = await P.$('[data-a="lv-submit"]');
    if (pick) { await pick.click(); }
    else if (sub) { const id = await P.evaluate(() => document.querySelector('#layer textarea[data-d]').id); await P.fill('#' + id, 'réponse de ' + n); await P.click('[data-a="lv-submit"]'); }
    await W(900);
    console.log(`manche ${round} après ${n} :`, JSON.stringify(await state(A)), '|', JSON.stringify(await state(B)));
  }
  const nx = await A.$('[data-a="lv-next"]:not(.link)') || await A.$('[data-a="lv-next"]');
  if (nx) { await nx.click(); await W(1000); }
}
console.log('errors', JSON.stringify(errs)); await b.close();
