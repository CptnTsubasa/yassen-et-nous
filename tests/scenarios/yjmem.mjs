import { chromium, LAUNCH } from '../lib/pw.mjs';
import fs from 'fs';
const fakeDb = fs.readFileSync('fbtest/fake-firebase.js', 'utf8'), fakeAi = fs.readFileSync('fake-ai.js', 'utf8');
const b = await chromium.launch(LAUNCH);
const errs = [], W = ms => new Promise(r => setTimeout(r, ms)), ok = (n, v) => console.log((v ? 'OK  ' : 'FAIL') + ' ' + n);
const C = 'MEMOIREMEMOIREMEMOIREMEMOI', now = Date.now(), soon = new Date(now + 12 * 864e5).toISOString().slice(0, 10), yday = new Date(now - 864e5).toISOString().slice(0, 10);
await fetch('http://localhost:8123/__fakedb', { method: 'POST', body: JSON.stringify({ couples: { [C]: {
  meta: { couple: { a: 'Yanis', b: 'Sarah', style: 'partage' }, space: { owner: 'D1', who: { a: 'D1', b: 'D2' } }, avatars: { a: { self: true }, b: { self: true } }, game: { days: { [yday]: true } } },
  capsule: { c1: { kind: 'mot', from: 'b', text: 'Merci pour hier soir, c\'était parfait', createdAt: now - 864e5 }, c2: { kind: 'souvenir', question: 'Notre plus beau fou rire ?', entries: [{ who: 'a', text: 'Le karaoké' }], createdAt: now - 2 * 864e5 } },
  aventures: { v1: { title: 'Week-end à Amsterdam', statut: 'planifiee', date: soon, createdAt: now - 3 * 864e5 } } } } }) });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: /12\.0\.0/.test(r.request().url()) ? fakeAi : fakeDb }));
await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
await ctx.addInitScript(([c]) => { try { localStorage.setItem('entre-nous:couple', c); localStorage.setItem('entre-nous:me', 'a'); localStorage.setItem('entre-nous:sfx', '0'); } catch (e) {} }, [C]);
const A = await ctx.newPage(); A.on('pageerror', e => errs.push(e.message)); await A.goto('http://localhost:8123/'); await W(2000);
await A.evaluate(() => { S.layer = { type: 'sheet', name: 'yassen' }; S.obShown = true; render(true); window.__chunkMs = 20; });
const ctxTxt = await A.evaluate(() => yjContext());
console.log(ctxTxt.split('\n\n').slice(1).join('\n\n'));
ok('actualités : petit mot d\'hier, souvenir, aventure dans 12 jours, jours ensemble', /hier, Sarah a laissé un petit mot/.test(ctxTxt) && /Notre plus beau fou rire/.test(ctxTxt) && /dans 12 jour\(s\) : Week-end à Amsterdam/.test(ctxTxt) && /1 jour\(s\) sur les 7/.test(ctxTxt));
for (const m of ['Coucou mon petit !', "J'ai mangé des crêpes au caramel, j'adore ça", 'Maman prépare un voyage à Amsterdam', 'Tu nous aimes ?']) { await A.evaluate(t => YJ.send(t), m); await W(400); }
await W(2500);
const mem = await A.evaluate(() => yjMem().map(m => m.x));
ok(`après 4 messages, Yassen retient : ${JSON.stringify(mem)}`, mem.length === 2);
ok('ce qu\'il a retenu est dans sa mémoire pour les prochaines réponses', await A.evaluate(() => /Ce que tu as retenu[\s\S]*crêpes au caramel/.test(yjContext())));
await A.evaluate(() => YJ.send('Et toi ?')); await W(800);
ok('pas de nouvel apprentissage après un seul message', (await A.evaluate(() => yjMem().length)) === 2);
await A.evaluate(() => render(true)); await W(200);
await A.click('.yj-mem summary'); await W(200); await A.screenshot({ path: 'yj-mem.png' });
await A.click('[data-a="yj-forget"]'); await W(500);
ok('« Oublier » efface un souvenir', (await A.evaluate(() => yjMem().length)) === 1);
console.log('errors', JSON.stringify(errs)); await b.close();
