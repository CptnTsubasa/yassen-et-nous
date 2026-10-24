// L'IA gratuite en relais : Gemini épuisé → Groq (en continu) → Workers AI ; Gemini indisponible → les autres répondent.
import { chromium, LAUNCH } from '../lib/pw.mjs';
import fs from 'fs';
const fakeDb = fs.readFileSync('fbtest/fake-firebase.js', 'utf8'), fakeAi = fs.readFileSync('fake-ai.js', 'utf8');
const b = await chromium.launch(LAUNCH);
const errs = [], W = ms => new Promise(r => setTimeout(r, ms)), ok = (n, v) => console.log((v ? 'OK  ' : 'FAIL') + ' ' + n);
const C = 'IA3IA3IA3IA3IA3IA3IA3IA3IA3Z';
const mode = async m => (await fetch('http://localhost:8124/__ai?mode=' + m)).json();
await fetch('http://localhost:8123/__fakedb', { method: 'POST', body: JSON.stringify({ couples: { [C]: { meta: { couple: { a: 'Yanis', b: 'Sarah', style: 'partage' }, avatars: { a: { self: true }, b: { self: true } } } } } }) });
async function phone(geminiDown) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => { const ai = /12\.0\.0/.test(r.request().url()); if (ai && geminiDown) return r.abort(); r.fulfill({ status: 200, contentType: 'text/javascript', body: ai ? fakeAi : fakeDb }); });
  await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await ctx.addInitScript(([c]) => { try { localStorage.setItem('entre-nous:couple', c); localStorage.setItem('entre-nous:me', 'a'); localStorage.setItem('entre-nous:sfx', '0'); localStorage.setItem('entre-nous:yj-daily-off', '1'); } catch (e) {} }, [C]);
  const P = await ctx.newPage(); P.on('pageerror', e => errs.push(e.message)); await P.goto('http://localhost:8123/'); await W(1500);
  await P.evaluate(() => { S.layer = null; S.obShown = true; render(true); }); await W(2500);
  return P;
}
await fetch('http://localhost:8124/__ai?mode=ok&reset=1');
const A = await phone(false);
await A.evaluate(() => AI.loadRemote());
const rem = await A.evaluate(() => ({ r: AI.remote, chat: AI.order('chat') }));
ok('modèles du service récupérés (Groq + Workers AI)', rem.r.groq.length === 3 && rem.r.cf.length >= 2 && rem.chat.some(m => m.startsWith('groq:')) && rem.chat.some(m => m.startsWith('cf:')));
ok('noms résolus (qwen-27b → qwen/qwen3.6-27b)', await A.evaluate(() => AI.resolve('groq:qwen-27b') === 'qwen/qwen3.6-27b' && AI.resolve('cf:qwen3.8-27b') === 'qwen3.8-27b'));
// Tous les Gemini épuisés : Groq prend le relais, en continu
await A.click('[data-a="sheet"][data-name="yassen"]'); await W(600);
await A.evaluate(() => { window.__quotaModels = AI.models.filter(m => !m.includes(':')); });
await A.fill('#yj-in', 'Coucou mon petit !'); await A.click('[data-a="yj-send"]');
await A.waitForSelector('#yj-live p', { timeout: 8000 }); const live = await A.textContent('#yj-live p');
await A.waitForFunction(() => !YJ.busy, null, { timeout: 15000 });
const g = await A.evaluate(() => ({ e: yjLog().slice(-1)[0], st: AI.state }));
console.log('  en direct :', live, '| final :', g.e.x);
ok('Gemini épuisé → Groq répond, texte en direct', /ici Groq/.test(g.e.x) && !g.e.local && g.e.h === 'joie' && live.length > 0 && !/\[/.test(live));
const calls1 = await mode('ok');
ok('Groq : le meilleur modèle d\'abord (gpt-oss-120b)', calls1.filter(c => c.p === 'groq')[0].m === 'openai/gpt-oss-120b');
ok('le Gemini épuisé est mis de côté, Groq passe en tête', await A.evaluate(() => AI.order('chat')[0] === 'groq:gpt-oss-120b'));
// Groq épuisé à son tour : Workers AI
await mode('cf');
await A.evaluate(() => YJ.send('Et toi ça va ?'));
const c = await A.evaluate(() => yjLog().slice(-1)[0]);
ok('Groq épuisé → Workers AI répond', /Workers AI/.test(c.x) && !c.local);
ok('Groq mis de côté jusqu\'à son heure (2 h 10)', await A.evaluate(() => { const q = AI.spent(), t = q['groq:gpt-oss-120b']; return t > Date.now() + 2 * 3600000 && t < Date.now() + 2.3 * 3600000; }));
// Une tâche en JSON (mot du jour) par Groq
await mode('ok');
const j = await A.evaluate(async () => { localStorage.removeItem('entre-nous:ai-quota'); window.__quotaModels = AI.models.filter(m => !m.includes(':')); return AI.json('Écris ton petit mot du jour. Réponds en JSON : {"mot": "…"}', 'Tu es Yassen Jr.', 'light'); });
ok('JSON par Groq (modèle léger pour les petites tâches)', j && j.mot === 'Mot du jour écrit par Groq.' && (await mode('ok')).slice(-1)[0].m === 'openai/gpt-oss-20b');
// Plus rien nulle part : réponse de secours cohérente
await mode('quota');
await A.evaluate(async () => { localStorage.removeItem('entre-nous:ai-quota'); await YJ.send('Tu me racontes ta journée ?'); });
const l = await A.evaluate(() => ({ e: yjLog().slice(-1)[0], st: AI.state }));
ok('tout épuisé → réponse de secours, état « quota »', l.e.local && l.st === 'quota');
// Gemini qui ne se charge pas du tout : les autres fournisseurs répondent quand même
await mode('ok');
const B = await phone(true);
await B.evaluate(async () => { await AI.loadRemote(); await YJ.send('Coucou !'); });
const bb = await B.evaluate(() => yjLog().slice(-1)[0]);
ok('Gemini injoignable → Groq répond quand même', /ici Groq/.test(bb.x) && !bb.local);
await mode('quota');
console.log('errors', JSON.stringify(errs)); await b.close();
