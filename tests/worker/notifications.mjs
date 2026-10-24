import crypto from 'node:crypto';
import W from './worker.mjs';
const b64u = b => Buffer.from(b).toString('base64url');
// Un « iPhone » : sa paire de clés de notification et son secret
const ecdh = crypto.createECDH('prime256v1'); ecdh.generateKeys();
const auth = crypto.randomBytes(16);
const C = 'K'.repeat(28), now = Date.now();
globalThis.__old = true;
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date());
const data = { couples: { [C]: { meta: { couple: { a: 'Yanis', b: 'Sarah', bdb: '1999-' + today.slice(5) }, space: { notif: { a: { partie: false } } }, game: { days: {} } },
  push: { b: { s1: { e: 'https://web.push.apple.com/ABC', p: b64u(ecdh.getPublicKey()), a: b64u(auth) }, s2: { e: 'https://web.push.apple.com/GONE', p: b64u(ecdh.getPublicKey()), a: b64u(auth) } }, a: { s3: { e: 'https://web.push.apple.com/AAA', p: b64u(ecdh.getPublicKey()), a: b64u(auth) } } },
  capsule: { m1: { kind: 'mot', from: 'a', text: 'Je t\'aime fort ❤️', createdAt: now } },
  lettres: { l1: { from: 'a', title: 'Pour toi', openOn: today, createdAt: now } },
  live: { game: { kind: 'arcade', by: 'b', startAt: now } }, notifsent: { vieux: now - 4 * 86400000, recent: now } } } };
const at = p => p.split('/').filter(Boolean).reduce((o, k) => (o == null ? undefined : o[k]), data);
const sent = [];
globalThis.fetch = async (u, init = {}) => {
  u = String(u);
  if (u.startsWith('https://y-s-14d43')) {
    const p = decodeURIComponent(new URL(u).pathname.replace(/\.json$/, ''));
    if (init.method === 'PUT' || init.method === 'PATCH') { const ks = p.split('/').filter(Boolean); let o = data; for (const k of (init.method === 'PUT' ? ks.slice(0, -1) : ks)) o = o[k] ??= {}; if (init.method === 'PUT') o[ks.at(-1)] = JSON.parse(init.body); else for (const [k, v] of Object.entries(JSON.parse(init.body))) { if (v === null) delete o[k]; else o[k] = v; } return new Response(init.body); }
    if (init.method === 'DELETE') { const ks = p.split('/').filter(Boolean); const o = at(ks.slice(0, -1).join('/')); delete o[ks.at(-1)]; return new Response('null'); }
    return new Response(JSON.stringify(at(p) ?? null));
  }
  sent.push({ u, h: init.headers, body: init.body });
  return new Response('', { status: u.endsWith('GONE') ? 410 : 201 });
};
const kv = new Map();
const env = { KV: { get: async (k, t) => kv.has(k) ? (t === 'json' ? JSON.parse(kv.get(k)) : kv.get(k)) : null, put: async (k, v) => { kv.set(k, v); }, delete: async k => { kv.delete(k); }, list: async ({ prefix }) => ({ keys: [...kv.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) } };
const call = async (path, body, method = 'POST') => (await W.fetch(new Request('https://w.example' + path, { method, body: body ? JSON.stringify(body) : undefined }), env)).json();
// Déchiffre comme un téléphone (RFC 8291)
function decrypt(body) {
  const salt = body.subarray(0, 16), idlen = body[20], as = body.subarray(21, 21 + idlen), ct = body.subarray(21 + idlen);
  const shared = ecdh.computeSecret(as), ua = ecdh.getPublicKey();
  const H = (k, d) => crypto.createHmac('sha256', k).update(d).digest();
  const prkKey = H(auth, shared), ikm = H(prkKey, Buffer.concat([Buffer.from('WebPush: info\0'), ua, as, Buffer.from([1])]));
  const prk = H(salt, ikm), cek = H(prk, Buffer.concat([Buffer.from('Content-Encoding: aes128gcm\0'), Buffer.from([1])])).subarray(0, 16);
  const nonce = H(prk, Buffer.concat([Buffer.from('Content-Encoding: nonce\0'), Buffer.from([1])])).subarray(0, 12);
  const d = crypto.createDecipheriv('aes-128-gcm', cek, nonce); d.setAuthTag(ct.subarray(ct.length - 16));
  const pt = Buffer.concat([d.update(ct.subarray(0, ct.length - 16)), d.final()]);
  return JSON.parse(pt.subarray(0, pt.lastIndexOf(2)).toString());
}
const key = (await call('/vapid', null, 'GET')).key;
console.log('clé publique (65 octets) :', Buffer.from(key, 'base64url').length === 65);
console.log('register :', JSON.stringify(await call('/register', { code: C })));
console.log('mot :', JSON.stringify(await call('/notify', { code: C, type: 'mot', id: 'm1' })), '| 2e fois :', JSON.stringify(await call('/notify', { code: C, type: 'mot', id: 'm1' })));
console.log('partie (Yanis a coupé les invitations) :', JSON.stringify(await call('/notify', { code: C, type: 'partie' })));
console.log('abonnement disparu retiré :', !data.couples[C].push.b.s2);
const s = sent[0], [jh, jb, js] = s.h.Authorization.match(/t=([^,]+)/)[1].split('.');
const pub = crypto.createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: b64u(Buffer.from(key, 'base64url').subarray(1, 33)), y: b64u(Buffer.from(key, 'base64url').subarray(33)) }, format: 'jwk' });
console.log('signature VAPID valide :', crypto.verify('sha256', Buffer.from(jh + '.' + jb), { key: pub, dsaEncoding: 'ieee-p1363' }, Buffer.from(js, 'base64url')), JSON.parse(Buffer.from(jb, 'base64url')).aud);
console.log('message déchiffré :', JSON.stringify(decrypt(Buffer.from(s.body))));
sent.length = 0;
await W.scheduled({}, env, { waitUntil: () => {} });
const { morning } = {}; // le matin n'est envoyé qu'à 9 h : on l'appelle directement
const mod = await import('./worker.mjs');
console.log('aujourd\'hui à Paris :', today);
await mod.morning(env, today);
console.log('matin :', sent.map(x => { try { return decrypt(Buffer.from(x.body)).title + ' → ' + x.u.split('/').pop(); } catch (e) { return 'ERR ' + e.message; } }).join(' | '));
sent.length = 0; await mod.evening(env, today); console.log('soir (désactivé par défaut) :', sent.length);

console.log('traces : vieille effacée, récente gardée :', JSON.stringify(Object.keys(data.couples[C].notifsent)));
