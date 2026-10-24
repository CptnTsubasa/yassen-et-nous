import { chromium, LAUNCH } from '../lib/pw.mjs';
import fs from 'fs';
const fakeDb = fs.readFileSync('fbtest/fake-firebase.js', 'utf8');
const b = await chromium.launch(LAUNCH);
const errs = [], W = ms => new Promise(r => setTimeout(r, ms));
const C = 'SSSSSSSSSSSSSSSSSSSSSSSSSSSS';
await fetch('http://localhost:8123/__fakedb', { method: 'POST', body: JSON.stringify({ couples: { [C]: { meta: { couple: { a: 'Yanis', b: 'Sarah', style: 'partage' }, avatars: { a: { self: true }, b: { self: true } } } } } }) });
async function phone(me, width) {
  const ctx = await b.newContext({ viewport: { width, height: 844 } });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: fakeDb }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await ctx.addInitScript(([c, me]) => { try { localStorage.setItem('entre-nous:couple', c); localStorage.setItem('entre-nous:me', me); localStorage.setItem('entre-nous:sfx', '0'); } catch (e) {} }, [C, me]);
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(me + ': ' + e.message)); await p.goto('http://localhost:8123/'); return p;
}
const A = await phone('a', 390), B = await phone('b', 430);
await W(1500);
for (const P of [A, B]) await P.evaluate(() => { S.layer = null; S.obShown = true; render(true); window.__said = []; const f = Buddies.say.bind(Buddies); Buddies.say = (k, t, ms) => { window.__said.push(k + ': ' + t); return f(k, t, ms); }; const g = Buddies.yjSay.bind(Buddies); Buddies.yjSay = (t, ms) => { window.__said.push('Y: ' + t); return g(t, ms); }; });
await B.evaluate(() => { S.tab = 'capsule'; render(true); });
await W(50000);
const sa = await A.evaluate(() => window.__said), sb = await B.evaluate(() => window.__said);
console.log('A :', JSON.stringify(sa)); console.log('B :', JSON.stringify(sb));
const common = sa.filter(x => sb.includes(x)).length;
console.log(`répliques communes : ${common} / ${Math.max(sa.length, sb.length)}`);
console.log('errors', JSON.stringify(errs)); await b.close();
