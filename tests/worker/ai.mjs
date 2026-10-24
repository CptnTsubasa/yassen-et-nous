// Service Cloudflare : IA gratuite (Groq en continu, Workers AI), contrôle de l'espace, quota renvoyé tel quel.
import W from './worker.mjs';
const C = 'H'.repeat(28), data = { couples: { [C]: { meta: { couple: { a: 'Yanis', b: 'Sarah' } } } } };
const at = p => p.split('/').filter(Boolean).reduce((o, k) => (o == null ? undefined : o[k]), data);
const calls = []; let groqMode = 'ok';
globalThis.fetch = async (u, init = {}) => {
  u = String(u);
  if (u.startsWith('https://y-s-14d43')) return new Response(JSON.stringify(at(decodeURIComponent(new URL(u).pathname.replace(/\.json$/, ''))) ?? null));
  if (u === 'https://api.groq.com/openai/v1/models') return new Response(JSON.stringify({ data: [{ id: 'openai/gpt-oss-120b', active: true }, { id: 'qwen/qwen3.6-27b', active: true }, { id: 'vieux', active: false }] }));
  if (u === 'https://api.groq.com/openai/v1/chat/completions') {
    const b = JSON.parse(init.body); calls.push(b);
    if (init.headers.Authorization !== 'Bearer clé-test') return new Response('{"error":"bad key"}', { status: 401 });
    if (groqMode === 'quota') return new Response(JSON.stringify({ error: { message: 'Rate limit reached for model `openai/gpt-oss-120b` on requests per day (RPD): Limit 1000, Used 1000. Please try again in 1m26.4s.', code: 'rate_limit_exceeded' } }), { status: 429 });
    if (groqMode === 'noreason' && b.reasoning_format) return new Response('{"error":{"message":"reasoning_format is not supported with this model"}}', { status: 400 });
    if (b.stream) return new Response(['Cou', 'cou ', 'Papa !'].map(t => `data: ${JSON.stringify({ choices: [{ delta: { content: t } }] })}\n\n`).join('') + 'data: [DONE]\n\n', { headers: { 'Content-Type': 'text/event-stream' } });
    return new Response(JSON.stringify({ choices: [{ message: { content: '{"mot":"Bonjour"}' } }] }));
  }
  throw new Error('réseau interdit : ' + u);
};
let neurons = 2;
const env = { GROQ_KEY: 'clé-test', KV: { get: async () => null, put: async () => { throw new Error('KV put interdit'); }, list: async () => ({ keys: [], list_complete: true }) },
  AI: { run: async (m, o) => { if (m === '@cf/inconnu') throw new Error('5007: No such model'); if (neurons-- <= 0) throw new Error('4006: you have used up your daily free allocation of 10,000 neurons'); return m.includes('gpt-oss') ? { output: [{ type: 'reasoning', content: [{ type: 'reasoning_text', text: 'je réfléchis' }] }, { type: 'message', content: [{ type: 'output_text', text: 'Bonjour de gpt-oss' }] }] } : { response: 'Bonjour de ' + m + ' (' + o.messages.length + ' messages)' }; } } };
const post = async b => { const r = await W.fetch(new Request('https://w.example/ai', { method: 'POST', body: JSON.stringify(b) }), env); return { status: r.status, type: r.headers.get('Content-Type'), text: await r.text() }; };
const ok = (n, v) => console.log((v ? 'OK  ' : 'FAIL') + ' ' + n);
const base = { code: C, sys: 'Tu es Yassen Jr.', prompt: 'Coucou' };

const r0 = await (await W.fetch(new Request('https://w.example/'), env)).json();
ok('version 7, IA annoncée', r0.version === 7 && r0.ai.groq && r0.ai.cf);
const ms = await (await W.fetch(new Request('https://w.example/ai/models'), env)).json();
ok('liste des modèles (Groq en direct, sans les inactifs)', ms.groq.join() === 'openai/gpt-oss-120b,qwen/qwen3.6-27b' && ms.cf.length >= 2);
const s1 = await post({ ...base, p: 'groq', m: 'openai/gpt-oss-120b' });
ok('Groq en continu : le flux passe tel quel', s1.status === 200 && /event-stream/.test(s1.type) && /Papa !/.test(s1.text) && /\[DONE\]/.test(s1.text));
ok('Groq : réflexion courte, consigne système envoyée', calls[0].reasoning_effort === 'low' && calls[0].messages[0].role === 'system' && calls[0].stream === true);
const j1 = await post({ ...base, p: 'groq', m: 'openai/gpt-oss-120b', json: true });
ok('Groq en JSON', j1.status === 200 && JSON.parse(j1.text).text === '{"mot":"Bonjour"}' && calls[1].response_format.type === 'json_object');
groqMode = 'noreason'; const n1 = await post({ ...base, p: 'groq', m: 'qwen/qwen3.6-27b' });
ok('réglage refusé → nouvel essai sans', n1.status === 200 && calls.at(-1).reasoning_format === undefined && calls.at(-2).reasoning_format === 'hidden');
groqMode = 'quota'; const q1 = await post({ ...base, p: 'groq', m: 'openai/gpt-oss-120b' });
ok('quota Groq épuisé → 429 et message d\'origine', q1.status === 429 && /try again in 1m26/.test(q1.text));
groqMode = 'ok';
const c1 = await post({ ...base, p: 'cf', m: '@cf/qwen/qwen3.8-27b' });
ok('Workers AI (Qwen)', c1.status === 200 && JSON.parse(c1.text).text === 'Bonjour de @cf/qwen/qwen3.8-27b (2 messages)');
const c2 = await post({ ...base, p: 'cf', m: '@cf/openai/gpt-oss-120b' });
ok('Workers AI (gpt-oss) : la réponse sans les pensées', JSON.parse(c2.text).text === 'Bonjour de gpt-oss');
const c3 = await post({ ...base, p: 'cf', m: '@cf/qwen/qwen3.8-27b' });
ok('neurones du jour épuisés → 429', c3.status === 429 && /neurons/.test(c3.text));
const c4 = await post({ ...base, p: 'cf', m: '@cf/inconnu' });
ok('modèle retiré → 404', c4.status === 404);
const u1 = await post({ ...base, code: 'Z'.repeat(28), p: 'groq', m: 'openai/gpt-oss-120b' });
ok('espace inconnu → refusé', u1.status === 403);
const b1 = await post({ ...base, p: 'openai', m: 'x' }), b2 = await post({ ...base, p: 'groq', m: 'openai/gpt-oss-120b', prompt: 'x'.repeat(50000) });
ok('demandes invalides refusées', b1.status === 400 && b2.status === 400);
let last; for (let i = 0; i < 160; i++) last = await post({ ...base, p: 'groq', m: 'openai/gpt-oss-120b' });
ok('pas plus de 150 demandes par heure et par espace', last.status === 429 && /limite de l'espace/.test(last.text));
const noKey = await W.fetch(new Request('https://w.example/ai', { method: 'POST', body: JSON.stringify({ ...base, code: 'K'.repeat(28), p: 'groq', m: 'openai/gpt-oss-120b' }) }), { ...env, GROQ_KEY: '' });
data.couples['K'.repeat(28)] = data.couples[C];
ok('sans clé Groq → 404 clair', [403, 404].includes(noKey.status));
