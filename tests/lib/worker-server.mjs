import http from 'node:http';
import W from './worker.mjs';
const realFetch = globalThis.fetch, pushes = [];
// Faux Groq et faux Workers AI : « quota » par défaut (les autres scénarios restent sur Gemini), « ok » sur demande (POST /__ai).
let aiMode = 'quota'; const aiCalls = [];
globalThis.fetch = async (u, init = {}) => {
  u = String(u);
  if (u.startsWith('https://y-s-14d43')) {
    const p = decodeURIComponent(new URL(u).pathname.replace(/\.json$/, ''));
    if (init.method === 'PUT') { await realFetch('http://localhost:8123/__fakeops', { method: 'POST', body: JSON.stringify([[p, JSON.parse(init.body)]]) }); return new Response(init.body); }
    if (init.method === 'PATCH') { await realFetch('http://localhost:8123/__fakeops', { method: 'POST', body: JSON.stringify(Object.entries(JSON.parse(init.body)).map(([k, v]) => [p + '/' + k, v])) }); return new Response(init.body); }
    if (init.method === 'DELETE') { await realFetch('http://localhost:8123/__fakeops', { method: 'POST', body: JSON.stringify([[p, null]]) }); return new Response('null'); }
    const db = await (await realFetch('http://localhost:8123/__fakedb')).json();
    return new Response(JSON.stringify(p.split('/').filter(Boolean).reduce((o, k) => (o == null ? undefined : o[k]), db) ?? null));
  }
  if (u === 'https://api.groq.com/openai/v1/models') return new Response(JSON.stringify({ data: [{ id: 'openai/gpt-oss-120b' }, { id: 'qwen/qwen3.6-27b' }, { id: 'openai/gpt-oss-20b' }] }));
  if (u === 'https://api.groq.com/openai/v1/chat/completions') {
    const b = JSON.parse(init.body); aiCalls.push({ p: 'groq', m: b.model, json: !b.stream });
    if (aiMode !== 'ok') return new Response('{"error":{"message":"Rate limit reached for model on requests per day (RPD): Limit 1000, Used 1000. Please try again in 2h10m5s."}}', { status: 429 });
    if (!b.stream) return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ mot: 'Mot du jour écrit par Groq.', faits: [] }) } }] }));
    const parts = ['[joie] *fait ', 'des étincelles* ', 'Coucou Papa, ', 'ici Groq !'];
    const st = new ReadableStream({ async start(c) { for (const t of parts) { await new Promise(r => setTimeout(r, 120)); c.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ choices: [{ delta: { content: t } }] })}\n\n`)); } c.enqueue(new TextEncoder().encode('data: [DONE]\n\n')); c.close(); } });
    return new Response(st, { headers: { 'Content-Type': 'text/event-stream' } });
  }
  if (u.startsWith('https://web.push.apple.com')) { pushes.push({ u, body: Buffer.from(init.body).toString('base64') }); return new Response('', { status: 201 }); }
  return realFetch(u, init);
};
const kv = new Map();
const env = { GROQ_KEY: 'clé-test', AI: { run: async (m, o) => { aiCalls.push({ p: 'cf', m }); if (aiMode === 'cf' || aiMode === 'ok') return { response: '[tendre] Coucou, ici Workers AI.' }; throw new Error('4006: you have used up your daily free allocation of 10,000 neurons'); } }, KV: { get: async (k, t) => kv.has(k) ? (t === 'json' ? JSON.parse(kv.get(k)) : kv.get(k)) : null, put: async (k, v) => { if (k !== 'vapid' && !k.startsWith('rescue:')) throw new Error('KV put 429'); kv.set(k, v); }, delete: async k => { kv.delete(k); }, list: async ({ prefix }) => ({ keys: [...kv.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) } };
http.createServer(async (q, s) => {
  if (q.url.startsWith('/__ai')) { s.setHeader('Access-Control-Allow-Origin', '*'); const m = /mode=(\w+)/.exec(q.url); if (m) aiMode = m[1]; s.end(JSON.stringify(aiCalls)); if (/reset/.test(q.url)) aiCalls.length = 0; return; }
  if (q.url === '/__pushes') { s.setHeader('Access-Control-Allow-Origin', '*'); s.end(JSON.stringify(pushes)); return; }
  let body = ''; q.on('data', c => body += c); await new Promise(r => q.on('end', r));
  const r = await W.fetch(new Request('http://localhost:8124' + q.url, { method: q.method, headers: q.headers, body: ['GET', 'OPTIONS'].includes(q.method) ? undefined : body }), env);
  s.writeHead(r.status, Object.fromEntries(r.headers));
  // Le flux passe morceau par morceau, comme chez Cloudflare.
  if (r.body) { const rd = r.body.getReader(); for (;;) { const { value, done } = await rd.read(); if (done) break; s.write(value); } }
  s.end();
}).listen(8124);
