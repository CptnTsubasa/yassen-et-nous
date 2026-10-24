import { chromium, LAUNCH } from '../lib/pw.mjs';
const b = await chromium.launch(LAUNCH);
const errs = [], W = ms => new Promise(r => setTimeout(r, ms)), ok = (n, v) => console.log((v ? 'OK  ' : 'FAIL') + ' ' + n);
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
await ctx.addInitScript(() => { try { localStorage.setItem('entre-nous:sfx', '0'); } catch (e) {} });
const P = await ctx.newPage(); P.on('pageerror', e => errs.push(e.message));
await P.goto('http://localhost:8123/?local'); await W(1500);
await P.evaluate(() => { Store.meta.couple = { a: 'Yanis', b: 'Sarah', style: 'partage' }; S.layer = null; S.obShown = true; render(true); Buddies.act = () => { Buddies.busy = true; }; window.scrollTo(0, 0); });
await W(800);
const said = [];
await P.exposeFunction('__log', (k, t) => said.push([k, t]));
await P.evaluate(() => { const g = Buddies.say.bind(Buddies); Buddies.say = (k, t, ms) => { window.__log(k, t); return g(k, t, ms); }; });
const box = await P.evaluate(() => { const r = document.getElementById('buddies').getBoundingClientRect(); return { x: 0, y: Math.max(0, r.bottom - 170), width: 390, height: 170 }; });
for (let i = 0; i < 3; i++) {
  await P.evaluate(() => Buddies.cancel()); await W(300); said.length = 0;
  await P.evaluate(() => { const A = Buddies.b.a, B = Buddies.b.b, w = Buddies.W(); A.x = w * 0.28; B.x = w * 0.68; Buddies.cancel(); Buddies.busy = true; Buddies.finishSentence(); });
  for (const t of [1200, 3600, 6200]) { await W(t - (t === 1200 ? 0 : t === 3600 ? 1200 : 3600)); await P.screenshot({ path: `duo-${i}-${t}.png`, clip: box }); }
  await W(2200);
  console.log('  phrase à deux voix :', said.map(([k, t]) => k + ': ' + t).join('  |  '));
  ok('trois répliques, alternées', said.length >= 3 && said[0][0] !== said[1][0] && said[0][0] === said[2][0]);
}
for (let i = 0; i < 4; i++) {
  said.length = 0;
  await P.evaluate(() => { Buddies.busy = true; Buddies.faceTalk(); }); await W(6000);
  console.log('  conversation :', said.map(([k, t]) => k + ': ' + t).join('  |  '));
}
ok('plus aucune réponse tirée au hasard', await P.evaluate(() => typeof REPLIES === 'undefined'));
console.log('errors', JSON.stringify(errs)); await b.close();
