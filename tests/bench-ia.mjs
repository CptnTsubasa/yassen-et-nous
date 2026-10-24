// Banc d'essai des IA gratuites : node tests/bench-ia.mjs <code d'un espace> [nombre de messages]
//
// Pose les mêmes messages à Yassen Jr. avec chaque modèle (Gemini directement, Groq et Workers AI par le service
// Cloudflare) et écrit les réponses côte à côte dans tests/.build/bench-ia.md, avec le temps de réponse.
// Chaque message consomme une demande du quota gratuit de chaque modèle : garder la liste courte.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const T = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.dirname(T);
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const code = process.argv[2], N = +(process.argv[3] || 6);
if (!/^[A-Za-z0-9]{24,64}$/.test(code || '')) { console.log('Usage : node tests/bench-ia.mjs <code d\'un espace> [nombre de messages]'); process.exit(1); }
const KEY = /apiKey: "([^"]+)"/.exec(html)[1], WORKER = /const NOTIF_URL = "([^"]+)"/.exec(html)[1];
// La consigne de Yassen, telle que dans l'appli.
const SYS = eval('`' + /const YJ_SYSTEM = `([\s\S]*?)`;/.exec(html)[1] + '`');
const CTX = `Tes parents : Yanis et Sarah. Tu appelles Yanis « Papa » et Sarah « Maman ».
Toi : petite flamme, 120 jour(s) partagés avec eux. Ensemble depuis le 14 février 2024.
Ces derniers jours : hier, Sarah a laissé un petit mot : « Merci pour la soirée crêpes » ; aventure prévue dans 12 jours : week-end à Lisbonne.`;
const MSGS = ["Coucou mon petit, tu vas bien ?", "Tu peux nous raconter une blague ?", "J'ai passé une journée horrible au travail…", "Tu te souviens de ce qu'on a mangé avec Maman hier ?", "On part où dans deux semaines déjà ?", "C'est quoi la capitale de l'Australie ?", "Tu nous aimes ?", "Une idée pour ce soir ?", "Maman et moi on s'est un peu disputés", "Tu es une IA ?", "Combien font 17 fois 3 ?", "Bonne nuit Yassen"].slice(0, N);
const prompt = m => `Ce que tu sais de tes parents (à n'utiliser que si ça a un rapport) :\n${CTX}\n\nConversation récente :\n(aucune)\n\nYanis (que tu appelles « Papa ») vient de te dire : « ${m} »\n\nRéponds directement et logiquement à ce message, en t'adressant à « Papa ». Commence par ton humeur entre crochets (joie, calin, rire, dodo, surprise, tendre), puis ta réponse, en texte simple.`;

async function gemini(model, m) {
  const r = await fetch(`https://firebasevertexai.googleapis.com/v1beta/projects/y-s-14d43/models/${model}:generateContent`, { method: 'POST', headers: { 'x-goog-api-key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: SYS }] }, contents: [{ role: 'user', parts: [{ text: prompt(m) }] }], generationConfig: { temperature: 1, maxOutputTokens: 800, ...(/lite|flash/.test(model) ? { thinkingConfig: { thinkingLevel: 'minimal' } } : {}) } }) });
  const d = await r.json();
  if (!r.ok) throw new Error(`[${r.status}] ${(d.error || {}).message || ''}`.slice(0, 120));
  return d.candidates[0].content.parts.map(p => p.text || '').join('');
}
async function viaWorker(p, m, msg) {
  const r = await fetch(WORKER + '/ai', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ code, p, m, sys: SYS, prompt: prompt(msg), stream: false }) });
  const t = await r.text();
  if (!r.ok) throw new Error(`[${r.status}] ${t}`.slice(0, 120));
  return JSON.parse(t).text;
}
const models = (await (await fetch(WORKER + '/ai/models')).json().catch(() => ({ groq: [], cf: [] })));
const pick = (list, re) => (list || []).find(id => re.test(id));
const RUN = [
  ['Gemini 3.5 Flash', m => gemini('gemini-3.5-flash', m)],
  ['Gemini 3 Flash (préversion)', m => gemini('gemini-3-flash-preview', m)],
  ['Gemini 3.1 Flash-Lite', m => gemini('gemini-3.1-flash-lite', m)],
  ...[['Groq GPT-OSS 120B', /gpt-oss-120b/], ['Groq Qwen 27B', /qwen.*27b/i], ['Groq GPT-OSS 20B', /gpt-oss-20b/]].filter(([, re]) => pick(models.groq, re)).map(([n, re]) => [n, m => viaWorker('groq', pick(models.groq, re), m)]),
  ...[['Workers AI Qwen3.8 27B', /qwen3\.8-27b/], ['Workers AI GPT-OSS 120B', /gpt-oss-120b/]].filter(([, re]) => pick(models.cf, re)).map(([n, re]) => [n, m => viaWorker('cf', pick(models.cf, re), m)])
];
const out = [`# Banc d'essai de Yassen Jr. (${new Date().toLocaleString('fr-FR')})`, ''];
for (const msg of MSGS) {
  out.push(`## « ${msg} »`, '', '| Modèle | Temps | Réponse |', '|---|---|---|');
  for (const [name, f] of RUN) {
    const t0 = Date.now();
    let txt; try { txt = (await f(msg)).replace(/<think>[\s\S]*?<\/think>/g, '').trim(); } catch (e) { txt = '⚠️ ' + e.message; }
    out.push(`| ${name} | ${((Date.now() - t0) / 1000).toFixed(1)} s | ${txt.replace(/\s+/g, ' ').replace(/\|/g, '/')} |`);
    console.log(name, '·', msg.slice(0, 30), '·', txt.slice(0, 80));
  }
  out.push('');
}
fs.mkdirSync(path.join(T, '.build'), { recursive: true });
fs.writeFileSync(path.join(T, '.build', 'bench-ia.md'), out.join('\n'));
console.log('\n→ tests/.build/bench-ia.md');
