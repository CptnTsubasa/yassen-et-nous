import { chromium, LAUNCH } from '../lib/pw.mjs';
import fs from 'fs';
const fakeDb = fs.readFileSync('fbtest/fake-firebase.js', 'utf8');
const b = await chromium.launch(LAUNCH);
const errs = [], W = ms => new Promise(r => setTimeout(r, ms));
const ok = (name, v) => console.log((v ? 'OK  ' : 'FAIL') + ' ' + name);
const C = 'FFFFFFFFFFFFFFFFFFFFFFFFFFFF';
await fetch('http://localhost:8123/__fakedb', { method: 'POST', body: JSON.stringify({ couples: { [C]: { meta: { couple: { a: 'Yanis', b: 'Sarah', style: 'partage' }, avatars: { a: { self: true }, b: { self: true } } } } } }) });
async function phone(me) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: fakeDb }));
  await ctx.addInitScript(([c, me]) => { try { localStorage.setItem('entre-nous:couple', c); localStorage.setItem('entre-nous:me', me); } catch (e) {} }, [C, me]);
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(me + ': ' + e.message)); await p.goto('http://localhost:8123/'); return p;
}
const A = await phone('a'), B = await phone('b'); await W(1800);
// Cartes : réponse de la manche 2 jamais effacée par un « suivant » en retard
await A.evaluate(() => { startLiveCards({ mode: 'questions', cat: 'mix', mood: 'surpris', dur: 5, style: 'distance' }); render(true); }); await W(1200);
await A.evaluate(() => ACT['lv-next']()); await W(800);
await A.evaluate(() => Live.answer('ans', 'a', 'ma réponse de la carte 2')); await W(400);
await B.evaluate(() => { Live.write({ i: 1 }); }); await W(1200);
ok('réponse gardée malgré un « suivant » en retard', await A.evaluate(() => Live.state.ans.a === 'ma réponse de la carte 2') && await B.evaluate(() => Live.state.ans.a === 'ma réponse de la carte 2'));
await A.evaluate(() => ACT['lv-next']()); await W(1000);
ok('nouvelle carte : réponses vides', await B.evaluate(() => Live.state.i === 2 && !Object.keys(Live.state.ans).length));
// Onde : même cible sur les deux téléphones, même si les deux passent à la suite en même temps
await A.evaluate(() => { startLiveArcade('onde'); render(true); }); await W(1200);
await Promise.all([A.evaluate(() => ACT['lv-onde-next']()), B.evaluate(() => ACT['lv-onde-next']())]); await W(1500);
const tA = await A.evaluate(() => [Live.state.i, Live.state.target]), tB = await B.evaluate(() => [Live.state.i, Live.state.target]);
ok('même manche et même cible des deux côtés', JSON.stringify(tA) === JSON.stringify(tB) && tA[0] === 1);
// Histoire : pile ou face identique
await A.evaluate(() => { const id = Object.keys(STORY)[0]; startLiveStory(id); render(true); }); await W(1200);
const ca = await A.evaluate(() => { ACT['lv-st-coin'](); return Live.state.coinWho; }), cb = await B.evaluate(() => { ACT['lv-st-coin'](); return Live.state.coinWho; });
ok('pile ou face : même résultat', ca === cb && (ca === 'a' || ca === 'b'));
console.log('errors', JSON.stringify(errs)); await b.close();
