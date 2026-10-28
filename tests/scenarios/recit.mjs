// « Il était une fois nous » : choix qui comptent (traits, aiguillages), fin cachée, morale, « Et vous ? »,
// chemin parcouru, album, et la même logique à distance. Captures dans tests/.build/recit-*.png.
import { chromium, LAUNCH } from '../lib/pw.mjs';
import fs from 'fs';
const fakeDb = fs.readFileSync('fbtest/fake-firebase.js', 'utf8'), fakeAi = fs.readFileSync('fake-ai.js', 'utf8');
const b = await chromium.launch(LAUNCH);
const errs = [], W = ms => new Promise(r => setTimeout(r, ms)), ok = (n, v) => console.log((v ? 'OK  ' : 'FAIL') + ' ' + n);
const C = 'RECITRECITRECITRECITRECITREZ';
await fetch('http://localhost:8123/__fakedb', { method: 'POST', body: JSON.stringify({ couples: { [C]: { meta: { couple: { a: 'Yanis', b: 'Sarah', style: 'partage' }, avatars: { a: { self: true }, b: { self: true } } } } } }) });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: /12\.0\.0/.test(r.request().url()) ? fakeAi : fakeDb }));
await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
await ctx.addInitScript(([c]) => { try { localStorage.setItem('entre-nous:couple', c); localStorage.setItem('entre-nous:me', 'a'); localStorage.setItem('entre-nous:sfx', '0'); localStorage.setItem('entre-nous:yj-daily-off', '1'); localStorage.setItem('entre-nous:hap', '9999'); } catch (e) {} }, [C]);
const A = await ctx.newPage(); A.on('pageerror', e => errs.push(e.message)); await A.goto('http://localhost:8123/'); await W(1500);
await A.evaluate(() => { S.layer = null; S.obShown = true; render(true); }); await W(1500);
// Toutes les histoires : 400 parties au hasard chacune, sans erreur, toujours jusqu'à une fin
const sim = await A.evaluate(() => STORIES.map(st => {
  const got = new Set(); let bad = 0;
  for (let k = 0; k < 400; k++) {
    let node = st.start, path = [], tr = {};
    for (let g = 0; g < 60 && !st.nodes[node].end; g++) { const n = st.nodes[node], i = Math.floor(Math.random() * n.ch.length); ({ node, path, tr } = storyStep(st, node, i, n.ch[i][1], path, tr)); }
    if (st.nodes[node].end) got.add(node); else bad++;
  }
  const ends = Object.keys(st.nodes).filter(k => st.nodes[k].end);
  return { id: st.id, bad, got: got.size, ends: ends.length, moral: ends.every(k => st.nodes[k].moral && st.nodes[k].ask), hidden: ends.filter(k => st.nodes[k].hidden).length };
}));
console.log('  ' + sim.map(x => `${x.id} ${x.got}/${x.ends}`).join(' · '));
ok('10 histoires, toutes les parties mènent à une fin', sim.length === 10 && sim.every(x => !x.bad));
ok('chaque fin a sa morale et son « Et vous ? », une fin cachée par histoire', sim.every(x => x.moral && x.hidden === 1));
ok('presque toutes les fins atteintes au hasard', sim.reduce((n, x) => n + x.got, 0) >= sim.reduce((n, x) => n + x.ends, 0) - 4);
// Une partie à la main : le train, jusqu'à la fin cachée (la lettre d'Odette portée à Anselme)
await A.click('[data-a="tab"][data-tab="play"]'); await A.click('[data-a="open-mode"][data-mode="recit"]'); await W(400);
ok('menu : environ 20 min, une fin cachée annoncée', /environ 20 min/.test(await A.textContent('.layer')) && /dont une cachée/.test(await A.textContent('.layer')));
await A.click('[data-a="st-open"][data-id="train"]'); await W(300);
const route = [2, 1, 0, 0, 2, 0, 0];
for (const [n, i] of route.entries()) { await A.click(`[data-a="st-go"][data-i="${i}"]`); await W(250); if (n === 1) await A.screenshot({ path: 'recit-1-page.png' }); }
const end = await A.evaluate(() => ({ node: S.story.node, path: S.story.path, tr: S.story.tr }));
ok(`fin cachée atteinte grâce à la lettre (${end.node})`, end.node === 'fin_lettres');
ok('chemin et traits notés', end.path.length === 7 && end.tr.ec >= 1 && end.tr.te >= 1);
const txt = await A.textContent('.layer');
ok('fin : « Fin cachée », morale, « Et vous ? », petit défi', /Fin cachée/.test(txt) && /La morale/.test(txt) && /Et vous \?/.test(txt) && /Le petit défi/.test(txt));
ok('« Votre chemin » : 7 choix et ce qu\'ils disent du duo', /Votre chemin · 7 choix · beaucoup d/.test(txt));
await A.screenshot({ path: 'recit-2-fin.png', fullPage: false });
await A.evaluate(() => { document.querySelector('.story-path').open = true; document.querySelector('.story-path').scrollIntoView(); }); await W(200); await A.screenshot({ path: 'recit-3-chemin.png' });
await A.click('[data-a="st-album"]'); await W(500);
const alb = await A.evaluate(() => Store.cols.capsule.find(x => /Les lettres de Dijon/.test(x.question)));
ok('gardée dans l\'album avec sa morale', alb && alb.entries.length === 2 && alb.entries[1].label === 'La morale');
// La même histoire, autre chemin : la fin ordinaire du chalet (sans la lettre)
await A.click('[data-a="st-open"][data-id="train"]'); await W(200);
for (const i of [0, 2, 0, 0]) { await A.click(`[data-a="st-go"][data-i="${i}"]`); await W(150); }
ok('sans la lettre : la fin du chalet', await A.evaluate(() => S.story.node === 'fin_chalet'));
// Yassen Jr. appelle ses parents Papa et Maman
ok('Yassen dit « Papa » et « Maman » dans son histoire', await A.evaluate(() => { Store.meta.couple.pa = 'papa'; Store.meta.couple.pb = 'maman'; return true; }) && await A.evaluate(() => /Papa et Maman/.test(stx(STORY.yassen.nodes.reveil.t)) && !/\{p/.test(stx(STORY.yassen.nodes.reveil.t))));
// À distance : même logique (chemin et traits partagés)
await A.evaluate(() => { S.layer = null; S.story = null; render(true); startLiveStory('dragon'); }); await W(600);
const live = await A.evaluate(async () => {
  for (const i of [2, 0, 0, 0, 0, 0, 0, 1, 0]) { const L = Live.state, n = STORY.dragon.nodes[L.node]; if (n.end) break; ACT['lv-st-go']({ to: n.ch[i][1], i: String(i) }); await new Promise(r => setTimeout(r, 120)); }
  return { node: Live.state.node, path: Live.state.path, tr: Live.state.tr };
});
console.log('  à distance :', live.node, live.path.join(' > '));
ok('à distance : la forge puis la plaidoirie mènent à la fin cachée', live.node === 'fin_double' && live.path.length >= 6);
await A.evaluate(() => render(true)); await W(300);
ok('à distance : la fin affiche aussi la morale', /La morale/.test(await A.textContent('.layer')));
console.log('errors', JSON.stringify(errs)); await b.close();
