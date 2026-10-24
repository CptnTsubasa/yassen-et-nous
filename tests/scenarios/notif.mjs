import { chromium, LAUNCH } from '../lib/pw.mjs';
import fs from 'fs';
const fakeDb = fs.readFileSync('fbtest/fake-firebase.js', 'utf8');
const b = await chromium.launch(LAUNCH);
const errs = [], W = ms => new Promise(r => setTimeout(r, ms)), ok = (n, v) => console.log((v ? 'OK  ' : 'FAIL') + ' ' + n);
const C = 'NNNNNNNNNNNNNNNNNNNNNNNNNNNN';
await fetch('http://localhost:8123/__fakedb', { method: 'POST', body: JSON.stringify({ couples: { [C]: { meta: { couple: { a: 'Yanis', b: 'Sarah', style: 'partage' }, avatars: { a: { self: true }, b: { self: true } } } } } }) });
async function phone(me) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: fakeDb }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await ctx.addInitScript(([c, me]) => { try { localStorage.setItem('entre-nous:couple', c); localStorage.setItem('entre-nous:me', me); localStorage.setItem('entre-nous:sfx', '0'); } catch (e) {} }, [C, me]);
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(me + ': ' + e.message)); await p.goto('http://localhost:8123/'); return p;
}
const A = await phone('a'), B = await phone('b'); await W(1500);
for (const P of [A, B]) await P.evaluate(() => { S.layer = null; S.obShown = true; render(true); });
ok('rien au départ', await A.evaluate(() => notifUnread() === 0));
await B.evaluate(() => {
  S.mot = 'mot'; S.drafts['mot-t'] = 'Tu me manques, à ce soir'; S.drafts['mot-f'] = 'b'; ACT['save-mot']();
  const d = new Date(Date.now() + 5 * 86400000), day = d.toISOString().slice(0, 10); S.drafts['le-m'] = 'secret'; S.drafts['le-f'] = 'b'; S.drafts['le-d'] = day; S.drafts['le-t'] = 'Pour notre week-end'; ACT['save-lettre']();
  S.drafts['av-t'] = 'Pique-nique au bord du lac'; ACT['save-av']();
  S.setup = { mode: 'questions', cat: 'qui', mood: 'surpris', dur: 5, style: 'distance' }; ACT.start(); render(true);
});
await W(2000);
await A.evaluate(() => render(true));
const n = await A.evaluate(() => notifUnread());
ok(`badge sur la cloche (${n})`, n >= 4 && !!(await A.$('.bell .badge')));
await A.click('.bell'); await W(400);
await A.screenshot({ path: 'notif.png' });
const items = await A.evaluate(() => notifItems().map(x => x.text));
console.log(items);
ok('la partie est en tête, avec « Rejoindre »', /t'invite à jouer/.test(items[0]) && !!(await A.$('.notif.live [data-a="notif-go"]')));
await A.click('.notif.live [data-a="notif-go"]'); await W(600);
ok('un toucher et on est dans la partie', await A.evaluate(() => S.layer && S.layer.type === 'live'));
await A.evaluate(() => { ACT['close-layer'](); render(true); }); await W(300);
ok('tout est vu après consultation', await A.evaluate(() => notifUnread() === 0));
ok('Sarah ne voit pas ses propres actions', await B.evaluate(() => notifItems().filter(x => !/Yassen/.test(x.text)).length === 0));
console.log('errors', JSON.stringify(errs)); await b.close();
