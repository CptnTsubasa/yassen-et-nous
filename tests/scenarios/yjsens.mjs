import { chromium, LAUNCH } from '../lib/pw.mjs';
import fs from 'fs';
const fakeDb = fs.readFileSync('fbtest/fake-firebase.js', 'utf8'), fakeAi = fs.readFileSync('fake-ai.js', 'utf8');
const b = await chromium.launch(LAUNCH);
const errs = [], W = ms => new Promise(r => setTimeout(r, ms)), ok = (n, v) => console.log((v ? 'OK  ' : 'FAIL') + ' ' + n);
async function run(withAi, C) {
  await fetch('http://localhost:8123/__fakedb', { method: 'POST', body: JSON.stringify({ couples: { [C]: { meta: { couple: { a: 'Yanis', b: 'Sarah', style: 'partage' }, avatars: { a: { self: true }, b: { self: true } } } } } }) });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: /12\.0\.0/.test(r.request().url()) ? (withAi ? fakeAi : 'throw new Error("Firebase AI: api-not-enabled (403)")') : fakeDb }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await ctx.addInitScript(([c]) => { try { localStorage.setItem('entre-nous:couple', c); localStorage.setItem('entre-nous:me', 'a'); localStorage.setItem('entre-nous:sfx', '0'); } catch (e) {} }, [C]);
  const P = await ctx.newPage(); P.on('pageerror', e => errs.push(e.message)); await P.goto('http://localhost:8123/'); await W(1500);
  await P.evaluate(() => { S.layer = { type: 'sheet', name: 'yassen' }; S.obShown = true; render(true); }); await W(500);
  return P;
}
// Sans IA
const P = await run(false, 'NOAINOAINOAINOAINOAINOAINOAI');
const msgs = ['Coucou mon petit !', 'Comment tu vas aujourd\'hui ?', 'Raconte-nous une blague', 'Une idée pour ce soir ?', 'Tu nous aimes ?', "Qu'est-ce qui te rend heureux ?", 'Je suis triste aujourd\'hui', 'Tu préfères les chats ou les chiens ?'];
for (const m of msgs) { await P.evaluate(t => YJ.send(t), m); await W(150); }
const log = await P.evaluate(() => yjLog());
for (let i = 0; i < log.length; i += 2) console.log(`  ${log[i].x}  →  ${log[i + 1].x}${log[i + 1].local ? '  [sans IA]' : ''}`);
ok('chaque réponse sans IA est notée comme telle dans les données', log.filter(e => e.w === 'y').every(e => e.local));
await P.evaluate(() => render(true)); await W(300);
const foot = await P.evaluate(() => [...document.querySelectorAll('#layer .small.muted')].map(x => x.textContent).join(' | '));
ok('aucune mention de l\'IA sous la discussion', !/\bIA\b/.test(foot));
await P.screenshot({ path: 'yj-local.png' });
// Avec IA
const Q = await run(true, 'WITHAIWITHAIWITHAIWITHAIWITH');
await Q.evaluate(() => YJ.send('Tu préfères les chats ou les chiens ?')); await W(300);
const pr = await Q.evaluate(() => window.__yjPrompt), last = await Q.evaluate(() => yjLog().slice(-1)[0]);
ok('consigne « réponds directement » dans la demande', /vient de te dire : « Tu préfères les chats ou les chiens \? »/.test(pr) && /Réponds directement et logiquement/.test(pr));
ok('réponse IA non marquée « sans IA »', last.w === 'y' && !last.local);
console.log('errors', JSON.stringify(errs)); await b.close();
