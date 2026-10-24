import { chromium, LAUNCH } from '../lib/pw.mjs';
import fs from 'fs';
const fakeDb = fs.readFileSync('fbtest/fake-firebase.js', 'utf8');
const b = await chromium.launch(LAUNCH);
const errs = [], W = ms => new Promise(r => setTimeout(r, ms)), ok = (n, v) => console.log((v ? 'OK  ' : 'FAIL') + ' ' + n);
const now = Date.now(), d = n => new Date(now + n * 864e5).toISOString().slice(0, 10);
const C = 'COUNTDOWNCOUNTDOWNCOUNTDOWN';
await fetch('http://localhost:8123/__fakedb', { method: 'POST', body: JSON.stringify({ couples: { [C]: {
  meta: { couple: { a: 'Yanis', b: 'Sarah', style: 'partage', since: '2023-' + d(9).slice(5), bdb: '1999-' + d(20).slice(5) }, avatars: { a: { self: true }, b: { self: true } } },
  aventures: { v1: { title: 'Week-end à Amsterdam', statut: 'planifiee', date: d(12), createdAt: now } },
  lettres: { l1: { from: 'b', title: 'x', message: 'y', openOn: d(3), createdAt: now } } } } }) });
for (const scheme of ['light', 'dark']) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: fakeDb }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await ctx.addInitScript(([c]) => { try { localStorage.setItem('entre-nous:couple', c); localStorage.setItem('entre-nous:me', 'a'); localStorage.setItem('entre-nous:sfx', '0'); } catch (e) {} }, [C]);
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.goto('http://localhost:8123/'); await W(2000);
  await p.evaluate(() => { S.layer = null; S.obShown = true; render(true); }); await W(500);
  if (scheme === 'light') { const l = await p.evaluate(() => countdowns().map(x => `${x.n} ${x.label}`)); console.log(l); ok('lettre 3 j, anniversaire 9 j, aventure 12 j, anniversaire de Sarah 20 j', l[0] === '3 La lettre de Sarah s\'ouvre' && /^9 Vos 3 ans/.test(l[1]) && l.some(x => x === '12 Week-end à Amsterdam') && l.some(x => x === '20 L\'anniversaire de Sarah')); }
  await p.evaluate(() => document.getElementById('h-soon').scrollIntoView({ block: 'center' })); await W(300);
  await p.screenshot({ path: `cd-${scheme}.png` });
  await ctx.close();
}
console.log('errors', JSON.stringify(errs)); await b.close();
