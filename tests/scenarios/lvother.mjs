import { chromium, LAUNCH } from '../lib/pw.mjs';
import fs from 'fs';
const fakeDb = fs.readFileSync('fbtest/fake-firebase.js', 'utf8');
const b = await chromium.launch(LAUNCH);
const errs = [], W = ms => new Promise(r => setTimeout(r, ms)), ok = (n, v) => console.log((v ? 'OK  ' : 'FAIL') + ' ' + n);
const C = 'OOOOOOOOOOOOOOOOOOOOOOOOOOOO';
await fetch('http://localhost:8123/__fakedb', { method: 'POST', body: JSON.stringify({ couples: { [C]: { meta: { couple: { a: 'Yanis', b: 'Sarah', style: 'partage' }, avatars: { a: { self: true }, b: { self: true } } } } } }) });
async function phone(me) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: fakeDb }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await ctx.addInitScript(([c, me]) => { try { localStorage.setItem('entre-nous:couple', c); localStorage.setItem('entre-nous:me', me); localStorage.setItem('entre-nous:sfx', '0'); } catch (e) {} }, [C, me]);
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(me + ': ' + e.message)); await p.goto('http://localhost:8123/'); return p;
}
const A = await phone('a'), B = await phone('b'); await W(1500);
for (const P of [A, B]) await P.evaluate(() => { S.layer = null; S.obShown = true; render(true); });
const join = async () => { await B.evaluate(() => { ACT['lv-join'](); render(true); }); await W(400); for (const P of [A, B]) { const r = await P.$('[data-a="lv-rules-ok"]'); if (r) { await r.click(); await W(150); } } };
const st = P => P.evaluate(() => Live.state ? { i: Live.state.i, round: Live.state.round, node: Live.state.node, ans: Live.state.ans, votes: Live.state.votes, ended: !!Live.state.ended } : null);
// Arcade : questions à choix (télépathie, drapeaux)
for (const game of ['tp', 'flags']) {
  await A.evaluate(g => { startLiveArcade(g); render(true); }, game); await W(1000); await join();
  for (let r = 0; r < 2; r++) {
    for (const P of [B, A]) { const p = await P.$('[data-a="lv-pick"]'); if (p) await p.click(); await W(700); }
    const s = await st(B); ok(`${game} manche ${r} : réponses des deux reçues`, Object.keys(s.ans).length === 2);
    await A.click('[data-a="lv-arc-next"]'); await W(900);
  }
  ok(`${game} : passe à la suite`, (await st(B)).i === 2);
}
// Longueur d'onde : indice puis aiguille
await A.evaluate(() => { startLiveArcade('onde'); render(true); }); await W(1000); await join();
for (let r = 0; r < 2; r++) {
  for (const P of [A, B]) { if (await P.$('#lv-clue')) { await P.fill('#lv-clue', 'chaud'); await P.click('[data-a="lv-clue"]'); await W(800); } }
  for (const P of [A, B]) { if (await P.$('[data-a="lv-guess"]')) { await P.click('[data-a="lv-guess"]'); await W(800); } }
  const s = await st(A); ok(`onde manche ${r} : indice et aiguille reçus`, s.ans.clue && s.ans.guess != null);
  const n = await A.$('[data-a="lv-onde-next"]') || await B.$('[data-a="lv-onde-next"]'); await n.click(); await W(900);
}
// Synchro : deux mots
await A.evaluate(() => { startLiveArcade('synchro'); render(true); }); await W(1000); await join();
for (const [P, w] of [[A, 'lune'], [B, 'soleil']]) { const id = await P.evaluate(() => `lv-w-${Live.state.round}`); await P.fill('#' + id, w); await P.click('[data-a="lv-word"]'); await W(800); }
ok('synchro : les deux mots reçus', Object.keys((await st(A)).ans).length === 2);
await A.click('[data-a="lv-sync-next"]'); await W(900);
ok('synchro : manche suivante', (await st(B)).round === 2 && !Object.keys((await st(B)).ans).length);
// Histoire à deux : votes
await A.evaluate(() => { startLiveStory(Object.keys(STORY)[0]); render(true); }); await W(1000); await join();
const n0 = (await st(A)).node;
for (let step = 0; step < 2; step++) {
  for (const P of [A, B]) { const v = await P.$('[data-a="lv-st-vote"]'); if (v) { await v.click(); await W(700); } }
  const go = await A.$('[data-a="lv-st-go"]') || await B.$('[data-a="lv-st-go"]');
  if (!go) { const coin = await A.$('[data-a="lv-st-coin"]'); if (coin) { await coin.click(); await W(700); } }
  const go2 = await A.$('[data-a="lv-st-go"]') || await B.$('[data-a="lv-st-go"]'); if (go2) { await go2.click(); await W(900); }
}
ok('histoire à deux : on avance', (await st(B)).node !== n0);
console.log('errors', JSON.stringify(errs)); await b.close();
