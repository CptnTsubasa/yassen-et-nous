import http from 'node:http';
import W from './worker.mjs';
const realFetch = globalThis.fetch, pushes = [];
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
  if (u.startsWith('https://web.push.apple.com')) { pushes.push({ u, body: Buffer.from(init.body).toString('base64') }); return new Response('', { status: 201 }); }
  return realFetch(u, init);
};
const kv = new Map();
const env = { KV: { get: async (k, t) => kv.has(k) ? (t === 'json' ? JSON.parse(kv.get(k)) : kv.get(k)) : null, put: async (k, v) => { if (k !== 'vapid' && !k.startsWith('rescue:')) throw new Error('KV put 429'); kv.set(k, v); }, delete: async k => { kv.delete(k); }, list: async ({ prefix }) => ({ keys: [...kv.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) } };
http.createServer(async (q, s) => {
  if (q.url === '/__pushes') { s.setHeader('Access-Control-Allow-Origin', '*'); s.end(JSON.stringify(pushes)); return; }
  let body = ''; q.on('data', c => body += c); await new Promise(r => q.on('end', r));
  const r = await W.fetch(new Request('http://localhost:8124' + q.url, { method: q.method, headers: q.headers, body: ['GET', 'OPTIONS'].includes(q.method) ? undefined : body }), env);
  s.writeHead(r.status, Object.fromEntries(r.headers)); s.end(await r.text());
}).listen(8124);
