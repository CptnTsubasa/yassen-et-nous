import { chromium, LAUNCH } from '../lib/pw.mjs';
import fs from 'fs';
const b = await chromium.launch(LAUNCH);
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
await ctx.route(/fonts\.(googleapis|gstatic)|gstatic\.com\/firebasejs/, r => r.abort());
const p = await ctx.newPage(), cdp = await ctx.newCDPSession(p), ok = (n, v) => console.log((v ? 'OK  ' : 'FAIL') + ' ' + n);
const msgs = []; p.on('console', m => msgs.push(m.text()));
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await cdp.send('Network.enable');
const slow = () => cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.5e6 / 8, uploadThroughput: 750e3 / 8 });
const shown = async label => { const t0 = Date.now(); await p.goto('http://localhost:8130/', { waitUntil: 'commit' }); await p.waitForFunction(() => document.querySelector('#app') && document.querySelector('#app').children.length > 0, null, { timeout: 60000 }); const t = Date.now() - t0; console.log(`${label} : ${t} ms`); return t; };
await shown('1re visite (réseau rapide, installation du service worker)');
await p.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 20000 }).catch(() => {});
await p.reload(); await p.waitForTimeout(1500);
await slow();
const t2 = await shown('ouverture suivante, réseau mobile lent');
ok('l\'appli s\'affiche sans attendre le réseau (< 2 s, processeur ralenti ×4)', t2 < 2000);
// Nouvelle version en ligne : l'appli ouverte est prévenue
await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
await p.evaluate(() => { window.__upd = 0; const f = Update.found.bind(Update); Update.found = () => { window.__upd++; }; });
fs.writeFileSync('site/index.html', fs.readFileSync('site/index.html', 'utf8').replace('</body>', '<!-- v2 --></body>'));
await p.evaluate(() => fetch('/', { mode: 'navigate' }).catch(() => {}));
// une navigation déclenche la vérification : on ouvre un 2e onglet, comme une réouverture
const p2 = await ctx.newPage(); await p2.goto('http://localhost:8130/'); await p2.waitForTimeout(2500);
ok('nouvelle version détectée et signalée à l\'appli', (await p.evaluate(() => window.__upd)) > 0 || (await p2.evaluate(() => Update.pending || S.update || 0)));
const p3 = await ctx.newPage(); await p3.goto('http://localhost:8130/'); await p3.waitForTimeout(1500);
ok('la réouverture suivante affiche la nouvelle version', (await p3.content()).includes('<!-- v2 -->'));
console.log('erreurs', JSON.stringify(msgs.filter(m => /error|Error/.test(m)).slice(0, 3)));
await b.close();
