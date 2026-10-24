import { chromium, LAUNCH } from '../lib/pw.mjs';
import fs from 'fs';
const fakeDb = fs.readFileSync('fbtest/fake-firebase.js', 'utf8');
const b = await chromium.launch(LAUNCH);
const errs = [], W = ms => new Promise(r => setTimeout(r, ms)), ok = (n, v) => console.log((v ? 'OK  ' : 'FAIL') + ' ' + n);
const now = Date.now(), PIX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const C1 = 'BACKUPAAAAAAAAAAAAAAAAAAAAAA', C2 = 'RESTOREBBBBBBBBBBBBBBBBBBBBB';
const day = new Date().toISOString().slice(0, 10), later = new Date(now + 40 * 864e5).toISOString().slice(0, 10);
await fetch('http://localhost:8123/__fakedb', { method: 'POST', body: JSON.stringify({ couples: {
  [C1]: { meta: { couple: { a: 'Yanis', b: 'Sarah', style: 'partage' }, avatars: { a: { self: true }, b: { self: true } }, puzzle: { list: { p1: 1 } },
      yj: { log: { m1: { w: 'a', t: now - 9000, x: 'Coucou mon petit !' }, y1: { w: 'y', t: now - 8000, x: 'Coucou Papa !', to: 'a', h: 'joie' } } } },
    pzimg: { p1: { data: PIX } },
    capsule: { c1: { kind: 'mot', from: 'b', text: 'Tu me manques déjà <3', createdAt: now - 1e6 }, c2: { kind: 'souvenir', question: 'Notre plus beau voyage ?', entries: [{ who: 'a', text: 'Lisbonne' }, { who: 'b', text: 'Lisbonne aussi !' }], createdAt: now - 2e6 } },
    lettres: { l1: { from: 'a', title: 'Pour plus tard', message: 'SECRET-SCELLE', openOn: later, createdAt: now - 3e6 }, l2: { from: 'b', title: 'Ouverte', message: 'Je t\'aime même quand il pleut.', openOn: day, createdAt: now - 4e6 } },
    aventures: { v1: { title: 'Week-end à Amsterdam', statut: 'planifiee', date: later, createdAt: now - 5e6 } } },
  [C2]: { meta: { couple: { a: 'Yanis', b: 'Sarah', style: 'partage' } } } } }) });
async function phone(C) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: fakeDb }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await ctx.addInitScript(([c]) => { try { localStorage.setItem('entre-nous:couple', c); localStorage.setItem('entre-nous:me', 'a'); localStorage.setItem('entre-nous:sfx', '0'); } catch (e) {} }, [C]);
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.goto('http://localhost:8123/'); await W(2000);
  await p.evaluate(() => { S.layer = null; S.obShown = true; render(true); }); return p;
}
const A = await phone(C1);
await A.evaluate(() => { window.__saved = null; navigator.canShare = () => true; navigator.share = async o => { window.__saved = await o.files[0].text(); window.__name = o.files[0].name; }; S.layer = { type: 'sheet', name: 'names' }; render(true); });
await W(300);
await A.click('[data-a="bk-make"]'); await A.waitForSelector('[data-a="bk-save"]', { timeout: 10000 });
await A.screenshot({ path: 'bk-panel.png', fullPage: true });
await A.click('[data-a="bk-save"]'); await W(500);
const html = await A.evaluate(() => window.__saved), name = await A.evaluate(() => window.__name);
fs.writeFileSync('bk-file.html', html || '');
ok(`fichier « ${name} » (${Math.round((html || '').length / 1024)} Ko)`, !!html && /nos souvenirs/.test(name));
ok('lisible : mots, album, lettre ouverte, aventure, Yassen, photo', /Tu me manques déjà &lt;3/.test(html) && /Lisbonne aussi/.test(html) && /même quand il pleut/.test(html) && /Amsterdam/.test(html) && /Coucou Papa/.test(html) && html.includes(PIX));
ok('la lettre scellée n\'est pas affichée en clair (mais gardée dans les données)', !/<p class="h">SECRET-SCELLE/.test(html) && /SECRET-SCELLE/.test(html.split('id="ys-backup"')[1] || ''));
// Restauration dans un autre espace
const B = await phone(C2);
await B.evaluate(() => { S.layer = { type: 'sheet', name: 'names' }; render(true); }); await W(300);
await B.setInputFiles('#bk-file', { name: 'sauvegarde.html', mimeType: 'text/html', buffer: Buffer.from(html) }); await W(2500);
const r = await B.evaluate(() => ({ mots: Store.cols.capsule.length, lettres: Store.cols.lettres.length, av: Store.cols.aventures.length, yj: Object.keys((Store.meta.yj || {}).log || {}).length, ph: pzList().length }));
ok(`restauré : ${JSON.stringify(r)}`, r.mots === 2 && r.lettres === 2 && r.av === 1 && r.yj === 2 && r.ph === 1);
await B.setInputFiles('#bk-file', { name: 'sauvegarde.html', mimeType: 'text/html', buffer: Buffer.from(html) }); await W(2000);
ok('restaurer deux fois ne crée pas de doublon', await B.evaluate(() => Store.cols.capsule.length === 2 && Store.cols.lettres.length === 2));
// Copie automatique
await A.evaluate(() => Backup.auto()); await W(800);
const keys = await A.evaluate(async () => (await IDB.keys()).map(String));
ok(`copie automatique du jour (${keys.join(', ')})`, keys.some(k => k.endsWith(new Date().toISOString().slice(0, 10)) || /\d{4}-\d\d-\d\d$/.test(k)));
await A.evaluate(() => Backup.refreshList()); await W(300);
await A.evaluate(() => { S.layer = { type: 'sheet', name: 'names' }; render(true); }); await W(300);
ok('les copies apparaissent dans les réglages', !!(await A.$('[data-a="bk-restore"]')));
console.log('errors', JSON.stringify(errs)); await b.close();
