// Le happening de la semaine : même tirage que le service Cloudflare, animation à l'heure dite sur chaque téléphone
// (une fois), carte « Yassen Jr. a disparu… » sur l'accueil, rien le jour où le jeu arrive.
import { chromium, LAUNCH } from '../lib/pw.mjs';
import fs from 'fs';
import { hapOf as wkHapOf, hapWeek as wkHapWeek } from '../.build/wk/worker.mjs';
const fakeDb = fs.readFileSync('fbtest/fake-firebase.js', 'utf8'), fakeAi = fs.readFileSync('fake-ai.js', 'utf8');
const b = await chromium.launch(LAUNCH);
const errs = [], W = ms => new Promise(r => setTimeout(r, ms)), ok = (n, v) => console.log((v ? 'OK  ' : 'FAIL') + ' ' + n);
const C = 'HAPPENINGHAPPENINGHAPPENINGZ', C2 = 'NOUVEAUNOUVEAUNOUVEAUNOUVEAZ';
const today = new Date().toISOString().slice(0, 10), h = wkHapOf(C, wkHapWeek(today));
const at = new Date(`${h.day}T${String(h.hour).padStart(2, '0')}:00:00`).getTime();
await fetch('http://localhost:8123/__fakedb', { method: 'POST', body: JSON.stringify({ couples: {
  [C]: { meta: { couple: { a: 'Yanis', b: 'Sarah', style: 'partage' }, avatars: { a: { self: true }, b: { self: true } }, escape: { since: at - 7 * 86400000, next: 'grenier' } } },
  [C2]: { meta: { couple: { a: 'Léo', b: 'Max', style: 'partage' }, avatars: { a: { self: true }, b: { self: true } } } } } }) });
async function phone(code, me, time) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: /12\.0\.0/.test(r.request().url()) ? fakeAi : fakeDb }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await ctx.addInitScript(([c, me]) => { try { localStorage.setItem('entre-nous:couple', c); localStorage.setItem('entre-nous:me', me); localStorage.setItem('entre-nous:sfx', '0'); localStorage.setItem('entre-nous:yj-daily-off', '1'); localStorage.setItem('entre-nous:onboarded', '1'); } catch (e) {} }, [code, me]);
  const P = await ctx.newPage(); P.on('pageerror', e => errs.push(me + ': ' + e.message));
  if (time) await P.clock.setSystemTime(time);
  await P.goto('http://localhost:8123/'); await W(1800);
  return P;
}
// Même tirage que le service Cloudflare, sur un an
const A = await phone(C, 'a', at + 10 * 60000);
const same = await A.evaluate(([C, weeks]) => weeks.every(([w, d, hr]) => { const x = hapOf(C, w); return x.day === d && x.hour === hr; }), [C, Array.from({ length: 52 }, (_, i) => { const w = wkHapWeek(new Date(Date.UTC(2026, 9, 26) + i * 7 * 86400000).toISOString().slice(0, 10)); const x = wkHapOf(C, w); return [w, x.day, x.hour]; })]);
ok('même tirage que le service Cloudflare (52 semaines)', same);
// À l'heure dite : l'animation
await A.evaluate(() => { if (S.layer && S.layer.type === 'onboard') { S.layer = null; S.obShown = true; } render(true); }); await W(400);
ok('à l\'heure du happening : Yassen disparaît', await A.evaluate(() => S.layer && S.layer.type === 'hap') && await A.isVisible('.hap'));
await W(700); await A.screenshot({ path: 'hap-1-course.png' });
await W(3200); await A.screenshot({ path: 'hap-2-papier.png' });
ok('le papier propose « On y va ! » ou « Plus tard »', await A.isVisible('[data-a="hap-go"]') && await A.isVisible('[data-a="hap-later"]'));
ok('vu noté dans l\'espace commun', await A.evaluate(w => !!Store.meta.escape.seen[w], h.week));
await A.click('[data-a="hap-later"]'); await W(500);
ok('« Plus tard » : la carte reste sur l\'accueil', await A.isVisible('.esc-card') && /a disparu/.test(await A.textContent('.esc-card')));
await A.screenshot({ path: 'hap-3-carte.png' });
await A.reload(); await W(2200); await A.evaluate(() => render(true)); await W(300);
ok('pas deux fois sur le même téléphone', await A.evaluate(() => !S.layer || S.layer.type !== 'hap'));
// L'autre téléphone le découvre aussi
const B = await phone(C, 'b', at + 3 * 3600000);
await B.evaluate(() => { if (S.layer && S.layer.type === 'onboard') { S.layer = null; S.obShown = true; } render(true); }); await W(400);
ok('l\'autre téléphone voit aussi Yassen disparaître', await B.evaluate(() => S.layer && S.layer.type === 'hap'));
await B.click('[data-a="hap-go"]'); await W(400);
ok('« On y va ! » ouvre l\'évasion', await B.evaluate(() => S.layer && S.layer.type === 'escape') && await B.isVisible('[data-a="esc-start"]'));
// Avant l'heure : rien
const A0 = await phone(C, 'a', at - 60000);
await A0.evaluate(() => { localStorage.removeItem('entre-nous:hap'); if (S.layer && S.layer.type === 'onboard') { S.layer = null; S.obShown = true; } render(true); }); await W(400);
ok('une minute avant : rien', await A0.evaluate(() => !S.layer || S.layer.type !== 'hap'));
// Un espace qui découvre le jeu aujourd'hui : rien d'annoncé, la date d'arrivée est notée
const N = await phone(C2, 'a', at + 10 * 60000);
await N.evaluate(() => { if (S.layer && S.layer.type === 'onboard') { S.layer = null; S.obShown = true; } render(true); }); await W(800); await N.evaluate(() => render(true)); await W(300);
ok('le jour où le jeu arrive : pas de happening', await N.evaluate(() => (!S.layer || S.layer.type !== 'hap') && !!Store.meta.escape.since));
console.log('errors', JSON.stringify(errs)); await b.close();
