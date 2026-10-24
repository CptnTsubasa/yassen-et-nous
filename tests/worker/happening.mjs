// Service Cloudflare : le happening de la semaine (même tirage que l'appli, notification à l'heure dite, une seule fois).
import crypto from 'node:crypto';
import { happening, hapOf, hapWeek } from './worker.mjs';
const b64u = b => Buffer.from(b).toString('base64url');
const ecdh = crypto.createECDH('prime256v1'); ecdh.generateKeys(); const auth = crypto.randomBytes(16);
const C = 'J'.repeat(28), sub = { s1: { e: 'https://web.push.apple.com/X', p: b64u(ecdh.getPublicKey()), a: b64u(auth) } };
const data = { couples: { [C]: { meta: { couple: { a: 'Yanis', b: 'Sarah' }, escape: { since: Date.now() - 86400000, next: 'grenier' } }, push: { a: sub, b: sub } } } };
const at = p => p.split('/').filter(Boolean).reduce((o, k) => (o == null ? undefined : o[k]), data);
const sent = [];
globalThis.fetch = async (u, init = {}) => {
  u = String(u);
  if (u.startsWith('https://y-s-14d43')) {
    const p = decodeURIComponent(new URL(u).pathname.replace(/\.json$/, ''));
    if (init.method === 'PUT') { const ks = p.split('/').filter(Boolean); let o = data; for (const k of ks.slice(0, -1)) o = o[k] ??= {}; o[ks.at(-1)] = JSON.parse(init.body); return new Response(init.body); }
    return new Response(JSON.stringify(at(p) ?? null));
  }
  sent.push(u); return new Response('', { status: 201 });
};
const kv = new Map([['couple:' + C, '1']]);
const env = { KV: { get: async k => kv.get(k) ?? null, put: async (k, v) => { if (k !== 'vapid') throw new Error('KV put interdit'); kv.set(k, v); }, list: async ({ prefix }) => ({ keys: [...kv.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) } };
const ok = (n, v) => console.log((v ? 'OK  ' : 'FAIL') + ' ' + n);
// Un an de semaines : jours et heures valides, toujours au moins 3 jours d'écart
let prev = null, gaps = true, valid = true, days = new Set(), hours = new Set();
for (let w = 0; w < 53; w++) {
  const week = hapWeek(new Date(Date.UTC(2026, 9, 26) + w * 7 * 86400000).toISOString().slice(0, 10)), h = hapOf(C, week);
  valid &&= hapWeek(h.day) === week && h.hour >= 12 && h.hour <= 21; days.add(new Date(h.day + 'T12:00:00Z').getUTCDay()); hours.add(h.hour);
  if (prev) gaps &&= (new Date(h.day) - new Date(prev)) / 86400000 >= 3; prev = h.day;
}
ok('un happening par semaine, entre 12 h et 21 h', valid);
ok('au moins 3 jours entre deux happenings', gaps);
ok(`jours et heures variés (${days.size} jours, ${hours.size} heures différents)`, days.size >= 5 && hours.size >= 6);
ok('lundi de la semaine', hapWeek('2026-10-25') === '2026-10-19' && hapWeek('2026-10-26') === '2026-10-26');
const h = hapOf(C, hapWeek('2026-10-28'));
await happening(env, h.day, h.hour === 12 ? 13 : h.hour - 1);
ok('pas de notification à une autre heure', sent.length === 0);
await happening(env, h.day, h.hour);
ok('à l\'heure dite : une notification à chacun·e', sent.length === 2);
await happening(env, h.day, h.hour);
ok('une seule fois', sent.length === 2);
// Jeu tout juste arrivé dans l'espace : rien n'est annoncé
const C2 = 'L'.repeat(28); data.couples[C2] = { meta: { couple: { a: 'A', b: 'B' }, escape: { since: Date.now() } }, push: { a: sub } }; kv.set('couple:' + C2, '1');
const h2 = hapOf(C2, hapWeek('2026-10-28')); sent.length = 0; await happening(env, h2.day, h2.hour);
ok('pas d\'annonce le jour où le jeu arrive', sent.length === 0);
// Déjà découvert dans l'appli avant l'heure : pas de notification
const C3 = 'M'.repeat(28), h3 = hapOf(C3, hapWeek('2026-10-28')); data.couples[C3] = { meta: { couple: { a: 'A', b: 'B' }, escape: { since: 1, seen: { [h3.week]: 1 } } }, push: { a: sub } }; kv.set('couple:' + C3, '1');
await happening(env, h3.day, h3.hour);
ok('déjà vu dans l\'appli → pas de notification', sent.length === 0);
