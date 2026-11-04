// Arcade : Vrai ou faux, Plus ou moins, Le juste prix (sur un téléphone et à distance), et Contact dans la liste.
import { chromium, LAUNCH } from '../lib/pw.mjs';
import fs from 'fs';
const fakeDb = fs.readFileSync('fbtest/fake-firebase.js', 'utf8'), fakeAi = fs.readFileSync('fake-ai.js', 'utf8');
const b = await chromium.launch(LAUNCH);
const errs = [], W = ms => new Promise(r => setTimeout(r, ms)), ok = (n, v) => console.log((v ? 'OK  ' : 'FAIL') + ' ' + n);
const C = 'QUIZQUIZQUIZQUIZQUIZQUIZQUIZ';
const caps = {}; for (let i = 0; i < 7; i++) caps['s' + i] = { kind: 'souvenir', question: 'Souvenir ' + i, entries: [], createdAt: 1 + i };
await fetch('http://localhost:8123/__fakedb', { method: 'POST', body: JSON.stringify({ couples: { [C]: { meta: { couple: { a: 'Yanis', b: 'Sarah', style: 'partage' }, avatars: { a: { self: true }, b: { self: true } } }, capsule: caps } } }) });
async function phone(me) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: /12\.0\.0/.test(r.request().url()) ? fakeAi : fakeDb }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await ctx.addInitScript(([c, me]) => { try { localStorage.setItem('entre-nous:couple', c); localStorage.setItem('entre-nous:me', me); localStorage.setItem('entre-nous:sfx', '0'); localStorage.setItem('entre-nous:yj-daily-off', '1'); localStorage.setItem('entre-nous:hap', '9999'); } catch (e) {} }, [C, me]);
  const P = await ctx.newPage(); P.on('pageerror', e => errs.push(me + ': ' + e.message)); await P.goto('http://localhost:8123/'); await W(1500);
  await P.evaluate(() => { S.layer = null; S.obShown = true; render(true); }); await W(1200);
  return P;
}
const A = await phone('a');
const click = async (P, sel) => { await P.click(sel); await W(150); };
// Les contenus
const data = await A.evaluate(() => ({ vf: VF.length, vfOk: VF.every(f => f[0] && typeof f[1] === 'boolean' && f[2]), pm: PM.length, jp: JP.length, jpOk: JP.every(j => j[2] > 0 && j[3]),
  th: (() => { let bad = 0; for (let k = 0; k < 40; k++) PM.forEach(p => { const t = qzTh(p[1]); if (!(t > 0) || Math.abs(t - p[1]) / p[1] < 0.15) bad++; }); return bad; })() }));
ok(`contenus : ${data.vf} affirmations, ${data.pm} chiffres, ${data.jp} prix`, data.vf >= 80 && data.vfOk && data.pm >= 40 && data.jp >= 40 && data.jpOk);
ok('Plus ou moins : chaque seuil est assez loin du vrai chiffre (une seule bonne réponse)', data.th === 0);
// L'Arcade : huit jeux, dont Contact
await click(A, '[data-a="tab"][data-tab="play"]'); await click(A, '[data-a="open-mode"][data-mode="arcade"]');
await A.screenshot({ path: 'quiz-1-arcade.png' });
ok('Arcade : Vrai ou faux, Plus ou moins, Le juste prix et Contact', await A.evaluate(() => ['vf', 'pm', 'jp', 'contact'].every(g => !!document.querySelector(`[data-a="arc-start"][data-g="${g}"]`)) && document.querySelectorAll('[data-a="arc-start"]').length === 8));
await click(A, '[data-a="arc-start"][data-g="contact"]');
ok('Contact s\'ouvre depuis l\'Arcade', await A.evaluate(() => S.layer.type === 'contact') && await A.isVisible('[data-a="ct-start"]'));
await A.evaluate(() => { S.layer = { type: 'arcade' }; S.arc = null; render(true); }); await W(200);
// Vrai ou faux, sur ce téléphone
await click(A, '[data-a="arc-start"][data-g="vf"]'); await click(A, '[data-a="arc-begin"]');
await A.screenshot({ path: 'quiz-2-vf.png' });
await click(A, '[data-a="arc-count"]'); await W(3600);
ok('Vrai ou faux : réponse et explication après le compte à rebours', await A.evaluate(() => S.arc.phase === 'reveal') && /Qui avait bon/.test(await A.textContent('.layer')));
await A.screenshot({ path: 'quiz-3-vf-reponse.png' });
await click(A, '[data-a="qz-ok"][data-k="a"]'); await click(A, '[data-a="qz-next"]');
ok('Vrai ou faux : un point pour Yanis, question suivante', await A.evaluate(() => S.arc.pa === 1 && S.arc.pb === 0 && S.arc.i === 1 && S.arc.phase === 'show'));
await A.evaluate(() => { S.arc.i = 9; S.arc.phase = 'reveal'; render(true); }); await click(A, '[data-a="qz-ok"][data-k="b"]'); await click(A, '[data-a="qz-next"]');
ok('Vrai ou faux : score final 1 – 1', /1 – 1/.test(await A.textContent('.layer')));
// Plus ou moins : vos chiffres à vous glissés dans le paquet
await A.evaluate(() => { S.arc = null; render(true); }); await click(A, '[data-a="arc-start"][data-g="pm"]'); await click(A, '[data-a="arc-begin"]');
const pm = await A.evaluate(() => ({ deck: S.arc.deck, th: S.arc.th, q: qzQuestion('pm', S.arc.deck[0], S.arc.th[0]) }));
ok(`Plus ou moins : 10 questions, dont vos souvenirs (${pm.deck.filter(n => n >= 1000).length} perso)`, pm.deck.length === 10 && pm.deck.includes(1000));
ok('Plus ou moins : la question annonce « plus ou moins que »', / : plus ou moins que /.test(pm.q.text));
await A.screenshot({ path: 'quiz-4-pm.png' });
// Le juste prix, sur ce téléphone : « c'est plus ! », puis trouvé
await A.evaluate(() => { S.arc = null; render(true); }); await click(A, '[data-a="arc-start"][data-g="jp"]'); await click(A, '[data-a="arc-begin"]');
const price = await A.evaluate(() => JP[S.arc.deck[0]][2]);
await A.fill('#jp-in', String(Math.max(0.01, price / 3)).replace('.', ',')); await click(A, '[data-a="jp-try"]');
ok('juste prix : trop bas → « C\'est plus »', await A.evaluate(() => S.arc.tries[0].r === 'plus') && /plus/i.test(await A.textContent('.ct-yj')));
await A.screenshot({ path: 'quiz-5-jp.png' });
await A.fill('#jp-in', String(price * 1.05)); await click(A, '[data-a="jp-try"]');
ok('juste prix : à moins de 10 % → trouvé, 6 points', await A.evaluate(() => S.arc.phase === 'found' && S.arc.pts === 6));
await A.screenshot({ path: 'quiz-6-jp-trouve.png' });
// À distance : Vrai ou faux puis Le juste prix
const B = await phone('b');
await A.evaluate(() => { S.arc = null; S.layer = null; startLiveArcade('vf'); }); await W(800);
await B.evaluate(() => { S.layer = { type: 'live' }; render(true); }); await W(400);
for (const P of [A, B]) { const r = await P.$('[data-a="lv-rules-ok"]'); if (r) await click(P, '[data-a="lv-rules-ok"]'); }
const good = await A.evaluate(() => qzQuestion('vf', Live.state.deck[0]).good);
await click(A, `[data-a="lv-pick"][data-v="${good}"]`); await click(B, `[data-a="lv-pick"][data-v="${1 - good}"]`); await W(900);
ok('à distance : réponses et explication sur les deux téléphones', /✓/.test(await A.textContent('.layer')) && /✗/.test(await B.textContent('.layer')));
await B.screenshot({ path: 'quiz-7-distance.png' });
await click(A, '[data-a="lv-qz-next"]'); await A.evaluate(() => ACT['lv-qz-next']({ i: '0' })); await W(900);
ok('à distance : point pour Yanis, et un double « suivant » ne saute pas de question', await B.evaluate(() => Live.state.i === 1 && Live.state.pa === 1 && Live.state.pb === 0));
await A.evaluate(() => { startLiveArcade('jp'); }); await W(800);
for (const P of [A, B]) { const r = await P.$('[data-a="lv-rules-ok"]'); if (r) await click(P, '[data-a="lv-rules-ok"]'); }
const jp = await A.evaluate(() => JP[Live.state.deck[0]][2]);
await A.fill('#jp-lv', String(jp * 1.02)); await click(A, '[data-a="lv-jp"]'); await B.fill('#jp-lv', String(jp * 3)); await click(B, '[data-a="lv-jp"]'); await W(900);
ok('à distance, juste prix : les deux prix et le vrai', /est plus près/.test(await B.textContent('.layer')));
await click(B, '[data-a="lv-qz-next"]'); await W(900);
ok('à distance, juste prix : 2 points pour le plus près (et dans le mille)', await A.evaluate(() => Live.state.pa === 2 && Live.state.pb === 0));
console.log('errors', JSON.stringify(errs)); await b.close();
