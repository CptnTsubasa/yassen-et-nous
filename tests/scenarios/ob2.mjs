import { chromium, LAUNCH } from '../lib/pw.mjs';
import fs from 'fs';
const fakeDb = fs.readFileSync('fbtest/fake-firebase.js', 'utf8');
const b = await chromium.launch(LAUNCH);
const errs = [], W = ms => new Promise(r => setTimeout(r, ms)), ok = (n, v) => console.log((v ? 'OK  ' : 'FAIL') + ' ' + n);
for (const scheme of ['light', 'dark']) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: fakeDb }));
  await ctx.addInitScript(() => { try { localStorage.setItem('entre-nous:sfx', '0'); sessionStorage.setItem('ys-splash', '1'); } catch (e) {} });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.goto('http://localhost:8123/'); await W(2500);
  await p.screenshot({ path: `ob2-${scheme}-1.png` });
  if (scheme === 'dark') { await ctx.close(); continue; }
  ok('page de bienvenue au premier lancement', !!(await p.$('[data-a="ob-hello"]')));
  await p.click('[data-a="ob-find"]'); await W(400); await p.screenshot({ path: `ob2-${scheme}-2.png` });
  ok('« Retrouver notre espace » : lien et 6 mots', !!(await p.$('#ob-inv')) && !!(await p.$('#ob-rc')));
  await p.click('[data-a="ob-back"]'); await W(300); await p.click('[data-a="ob-hello"]'); await W(400);
  await p.screenshot({ path: `ob2-${scheme}-3.png` });
  await p.fill('#ob-a', 'Yanis'); await p.fill('#ob-b', 'Sarah'); await p.click('[data-a="ob-names"]'); await W(600);
  await p.screenshot({ path: `ob2-${scheme}-4.png` });
  ok('étape « qui es-tu »', !!(await p.$('[data-a="ob-me"]')));
  await ctx.close();
}
console.log('errors', JSON.stringify(errs)); await b.close();
