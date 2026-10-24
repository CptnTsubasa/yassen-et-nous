// « Notre année » : le récapitulatif s'ouvre depuis la Capsule, saute les écrans vides, compte les câlins
// envoyés et finit sur le mot de Yassen Jr. (avec ou sans IA).
import { chromium, LAUNCH } from '../lib/pw.mjs';
import fs from 'fs';
const fakeDb = fs.readFileSync('fbtest/fake-firebase.js', 'utf8'), fakeAi = fs.readFileSync('fake-ai.js', 'utf8');
const b = await chromium.launch(LAUNCH);
const errs = [], W = ms => new Promise(r => setTimeout(r, ms)), ok = (n, v) => console.log((v ? 'OK  ' : 'FAIL') + ' ' + n);
const now = Date.now(), d = n => new Date(now + n * 864e5).toISOString().slice(0, 10), C = 'ANNEEANNEEANNEEANNEEANNEE';
await fetch('http://localhost:8123/__fakedb', { method: 'POST', body: JSON.stringify({ couples: { [C]: {
  meta: { couple: { a: 'Yanis', b: 'Sarah', style: 'partage', since: '2023-06-14' }, avatars: { a: { self: true }, b: { self: true } },
    game: { days: { [d(-1)]: true, [d(-3)]: true, [d(-400)]: true }, quests: { [d(-1)]: { rdv: true, mot: true } }, earn: { [d(-1) + '_rdv']: 10, [d(-1) + '_mot']: 10, [d(-400) + '_rdv']: 10 } },
    progress: { partiesLog: { p1: now - 864e5, p2: now - 2 * 864e5, p3: now - 500 * 864e5 } } },
  capsule: { c1: { kind: 'mot', from: 'b', text: 'Merci pour cette journée parfaite au bord du lac', createdAt: now - 864e5 }, c2: { kind: 'mot', from: 'a', text: 'Bonne nuit', createdAt: now - 2 * 864e5 },
    c3: { kind: 'souvenir', question: 'Notre plus beau voyage ?', entries: [{ who: 'a', text: 'Lisbonne' }, { who: 'b', text: 'Lisbonne aussi !' }], createdAt: now - 5 * 864e5 },
    c4: { kind: 'mot', from: 'a', text: 'Très vieux mot', createdAt: now - 500 * 864e5 } },
  aventures: { v1: { title: 'Week-end à Amsterdam', statut: 'realisee', doneAt: now - 10 * 864e5, createdAt: now - 30 * 864e5 } } } } }) });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: /12\.0\.0/.test(r.request().url()) ? fakeAi : fakeDb }));
await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
await ctx.addInitScript(([c]) => { try { localStorage.setItem('entre-nous:couple', c); localStorage.setItem('entre-nous:me', 'a'); localStorage.setItem('entre-nous:sfx', '0'); } catch (e) {} }, [C]);
const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.goto('http://localhost:8123/'); await W(2000);
await p.evaluate(() => { S.layer = null; S.obShown = true; S.tab = 'capsule'; render(true); }); await W(300);
// Trois câlins et une pensée envoyés : ils sont comptés pour le récapitulatif.
await p.evaluate(() => { for (const k of ['calin', 'calin', 'calin', 'pense']) sigSend(k); }); await W(800);
const y = await p.evaluate(() => yearData());
ok(`12 derniers mois seulement : ${y.days} jours, ${y.mots.a + y.mots.b} mots, ${y.parties} parties, ${y.hearts} cœurs`, y.days === 2 && y.mots.a + y.mots.b === 2 && y.parties === 2 && y.hearts >= 20 && y.quests === 2);
ok(`câlins comptés : ${JSON.stringify(y.gestes)}`, y.gestes.calin === 3 && y.gestes.pense === 1);
ok('le plus beau mot mis en avant', /bord du lac/.test((y.mots.best || {}).text || ''));
await p.click('[data-a="yr-open"]'); await W(600);
ok('s\'ouvre depuis la Capsule', !!(await p.$('.yr')));
const seen = [];
for (let i = 0; i < 12; i++) {
  seen.push(await p.evaluate(() => document.querySelector('.yr-slide').textContent.replace(/\s+/g, ' ').trim().slice(0, 70)));
  await p.screenshot({ path: `annee-${i}.png` });
  if (!(await p.$('[data-a="yr-next"]'))) break;
  await p.click('[data-a="yr-next"]'); await W(500);
}
seen.forEach(t => console.log('   · ' + t));
ok(`${seen.length} écrans, sans écran vide`, seen.length >= 7 && seen.every(t => t.length > 10));
await W(1500);
const last = await p.evaluate(() => document.querySelector('.yr-slide').textContent);
ok('le mot de Yassen Jr. arrive à la fin', /Le mot de Yassen Jr\./.test(last) && !(await p.$('.yr-typing')));
await p.screenshot({ path: 'annee-fin.png' });
await p.click('[data-a="yr-restart"]'); await W(300);
ok('« Revoir » repart du début', await p.evaluate(() => S.yr.i === 0));
console.log('errors', JSON.stringify(errs)); await b.close();
