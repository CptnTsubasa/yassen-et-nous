import crypto from 'node:crypto';
import W from './worker.mjs';
const b64u = b => Buffer.from(b).toString('base64url');
const ecdh = crypto.createECDH('prime256v1'); ecdh.generateKeys();
const auth = crypto.randomBytes(16);
const C = 'G'.repeat(28), now = Date.now(), N = 12;
const gestes = {}; for (let i = 0; i < N; i++) gestes['g' + i] = { to: 'b', from: 'a', kind: i % 3 ? 'calin' : 'pense', t: now + i };
gestes.old = { to: 'b', from: 'a', kind: 'calin', t: now - 2 * 86400000 };
gestes.flaky = { to: 'b', from: 'a', kind: 'calin', t: now };
const data = { couples: { [C]: { meta: { couple: { a: 'Yanis', b: 'Sarah' } }, push: { b: { s1: { e: 'https://web.push.apple.com/ABC', p: b64u(ecdh.getPublicKey()), a: b64u(auth) } } }, gestes } } };
const at = p => p.split('/').filter(Boolean).reduce((o, k) => (o == null ? undefined : o[k]), data);
const sent = []; let down = false;
globalThis.fetch = async (u, init = {}) => {
  u = String(u);
  if (u.startsWith('https://y-s-14d43')) {
    const p = decodeURIComponent(new URL(u).pathname.replace(/\.json$/, ''));
    if (init.method === 'PUT') { const ks = p.split('/').filter(Boolean); let o = data; for (const k of ks.slice(0, -1)) o = o[k] ??= {}; o[ks.at(-1)] = JSON.parse(init.body); return new Response(init.body); }
    if (init.method === 'DELETE') { const ks = p.split('/').filter(Boolean); const o = at(ks.slice(0, -1).join('/')); if (o) delete o[ks.at(-1)]; return new Response('null'); }
    return new Response(JSON.stringify(at(p) ?? null));
  }
  if (down) return new Response('busy', { status: 503 });
  sent.push({ u, body: init.body }); return new Response('', { status: 201 });
};
const kv = new Map(); let kvPuts = 0;
const env = { KV: { get: async (k, t) => kv.has(k) ? (t === 'json' ? JSON.parse(kv.get(k)) : kv.get(k)) : null, put: async (k, v) => { kvPuts++; if (k !== 'vapid') throw new Error('KV put limit 429'); kv.set(k, v); }, delete: async k => { kv.delete(k); }, list: async () => ({ keys: [], list_complete: true }) } };
const call = async body => { const r = await W.fetch(new Request('https://w.example/notify', { method: 'POST', body: JSON.stringify(body) }), env); return { status: r.status, ...(await r.json()) }; };
function decrypt(body) {
  body = Buffer.from(body);
  const salt = body.subarray(0, 16), idlen = body[20], as = body.subarray(21, 21 + idlen), ct = body.subarray(21 + idlen);
  const shared = ecdh.computeSecret(as), ua = ecdh.getPublicKey(), H = (k, d) => crypto.createHmac('sha256', k).update(d).digest();
  const prk = H(salt, H(H(auth, shared), Buffer.concat([Buffer.from('WebPush: info\0'), ua, as, Buffer.from([1])])));
  const cek = H(prk, Buffer.concat([Buffer.from('Content-Encoding: aes128gcm\0'), Buffer.from([1])])).subarray(0, 16), nonce = H(prk, Buffer.concat([Buffer.from('Content-Encoding: nonce\0'), Buffer.from([1])])).subarray(0, 12);
  const d = crypto.createDecipheriv('aes-128-gcm', cek, nonce); d.setAuthTag(ct.subarray(ct.length - 16));
  const pt = Buffer.concat([d.update(ct.subarray(0, ct.length - 16)), d.final()]); return JSON.parse(pt.subarray(0, pt.lastIndexOf(2)).toString());
}
const ok = (n, v) => console.log((v ? 'OK  ' : 'FAIL') + ' ' + n);
// 12 gestes envoyés d'affilée, chacun signalé deux fois (comme une appli qui réessaie)
const r1 = await Promise.all(Object.keys(gestes).filter(k => /^g/.test(k)).map(id => call({ code: C, type: 'geste2', id })));
const r2 = await Promise.all(Array.from({ length: N }, (_, i) => call({ code: C, type: 'geste2', id: 'g' + i })));
const msgs = sent.map(s => decrypt(s.body));
ok(`${N} gestes → ${msgs.length} notifications`, msgs.length === N && r1.every(r => r.sent === 1) && r2.every(r => r.sent === 0));
ok('chacune a son étiquette (iOS ne les fusionne pas)', new Set(msgs.map(m => m.tag)).size === N);
ok('les gestes envoyés sont effacés', Object.keys(gestes).filter(k => /^g/.test(k)).length === 0);
console.log('  ex.', JSON.stringify(msgs[0]), JSON.stringify(msgs[1]));
ok('geste trop ancien : rien', (await call({ code: C, type: 'geste2', id: 'old' })).sent === 0);
sent.length = 0; down = true;
const f1 = await call({ code: C, type: 'geste2', id: 'flaky' });
ok(`Apple indisponible → erreur pour que l'appli réessaie (${f1.status})`, f1.status === 503 && !!gestes.flaky);
down = false;
const f2 = await call({ code: C, type: 'geste2', id: 'flaky' }), f3 = await call({ code: C, type: 'geste2', id: 'flaky' });
ok('nouvel essai : une seule notification', f2.sent === 1 && f3.sent === 0 && sent.length === 1);
ok(`aucune écriture KV à part la clé (${kvPuts})`, kvPuts === 1);
console.log('version', (await (await W.fetch(new Request('https://w.example/'), env)).json()).version);
