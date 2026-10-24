import { chromium, LAUNCH } from '../lib/pw.mjs';
import fs from 'fs';
import crypto from 'node:crypto';
const fakeDb = fs.readFileSync('fbtest/fake-firebase.js', 'utf8');
const b = await chromium.launch(LAUNCH);
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const errs = [], W = ms => new Promise(r => setTimeout(r, ms)), ok = (n, v) => console.log((v ? 'OK  ' : 'FAIL') + ' ' + n);
const C = 'JJJJJJJJJJJJJJJJJJJJJJJJJJJJ';
await fetch('http://localhost:8123/__fakedb', { method: 'POST', body: JSON.stringify({ couples: { [C]: { meta: { couple: { a: 'Yanis', b: 'Sarah', style: 'partage' }, avatars: { a: { self: true }, b: { self: true } } } } } }) });
// Le « téléphone de Sarah » a de vraies clés de notification : on pourra déchiffrer ce qu'il reçoit.
const ecdh = crypto.createECDH('prime256v1'); ecdh.generateKeys(); const auth = crypto.randomBytes(16);
const SUB = { endpoint: 'https://web.push.apple.com/SARAH', keys: { p256dh: ecdh.getPublicKey().toString('base64url'), auth: auth.toString('base64url') } };
async function phone(me, sub) {
  const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, userAgent: UA });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: fakeDb }));
  await ctx.addInitScript(([c, me, sub]) => { try { localStorage.setItem('entre-nous:couple', c); localStorage.setItem('entre-nous:me', me); } catch (e) {}
    Object.defineProperty(navigator, 'standalone', { get: () => true });
    let perm = 'default', cur = null; window.PushManager = function () {};
    window.Notification = { get permission() { return perm; }, requestPermission: async () => (perm = 'granted') };
    const pm = { getSubscription: async () => cur, subscribe: async o => { window.__appKey = o.applicationServerKey.length; cur = { toJSON: () => sub, unsubscribe: async () => { cur = null; return true; } }; return cur; } };
    Object.defineProperty(navigator.serviceWorker, 'ready', { get: () => Promise.resolve({ pushManager: pm }) }); }, [C, me, sub]);
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(me + ': ' + e.message)); await p.goto('http://localhost:8123/'); return p;
}
const B = await phone('b', SUB); await W(1500);
await B.click('.appbar [data-name="names"]'); await W(300); await B.click('[data-a="push-on"]'); await W(1500);
const db = await (await fetch('http://localhost:8123/__fakedb')).json();
ok('abonnement de Sarah rangé dans l\'espace commun', JSON.stringify(db.couples[C].push || {}).includes('web.push.apple.com/SARAH'));
ok('clé du service utilisée (65 octets)', await B.evaluate(() => window.__appKey === 65));
const A = await phone('a', { endpoint: 'https://web.push.apple.com/YANIS', keys: SUB.keys }); await W(1500);
await A.evaluate(() => { S.mot = 'mot'; S.drafts['mot-t'] = 'Tu me manques déjà 🥰'; S.drafts['mot-f'] = 'a'; ACT['save-mot'](); }); await W(3000);
const pushes = await (await fetch('http://localhost:8124/__pushes')).json();
function decrypt(body) { try { return decrypt0(body); } catch (e) { return {}; } }
function decrypt0(body) {
  const salt = body.subarray(0, 16), idlen = body[20], as = body.subarray(21, 21 + idlen), ct = body.subarray(21 + idlen);
  const H = (k, d) => crypto.createHmac('sha256', k).update(d).digest(), shared = ecdh.computeSecret(as), ua = ecdh.getPublicKey();
  const prk = H(salt, H(H(auth, shared), Buffer.concat([Buffer.from('WebPush: info\0'), ua, as, Buffer.from([1])])));
  const d = crypto.createDecipheriv('aes-128-gcm', H(prk, Buffer.from('Content-Encoding: aes128gcm\0\x01')).subarray(0, 16), H(prk, Buffer.from('Content-Encoding: nonce\0\x01')).subarray(0, 12));
  d.setAuthTag(ct.subarray(ct.length - 16)); const pt = Buffer.concat([d.update(ct.subarray(0, ct.length - 16)), d.final()]);
  return JSON.parse(pt.subarray(0, pt.lastIndexOf(2)).toString());
}
const got = pushes.filter(x => x.u.endsWith('SARAH')).map(x => decrypt(Buffer.from(x.body, 'base64'))).filter(g => g.title);
ok('Sarah reçoit le mot de Yanis', got.length === 1 && got[0].title === '💌 Un petit mot de Yanis' && got[0].body === 'Tu me manques déjà 🥰');
ok('file de signaux vidée', await A.evaluate(() => localStorage.getItem('entre-nous:notifq') === '[]'));
console.log(JSON.stringify(got));
await A.evaluate(() => { ACT['sig-send']({ v: 'calin' }); }); await W(2500);
const p2 = await (await fetch('http://localhost:8124/__pushes')).json();
const got2 = p2.filter(x => x.u.endsWith('SARAH')).map(x => decrypt(Buffer.from(x.body, 'base64')));
ok('Sarah reçoit le câlin sur son iPhone', got2.some(g => g.title === "🤗 Yanis t'envoie un câlin"));
await A.evaluate(() => { ACT['sig-send']({ v: 'pense' }); }); await W(2500);
const p3 = await (await fetch('http://localhost:8124/__pushes')).json();
ok('…et la pensée', p3.filter(x => x.u.endsWith('SARAH')).map(x => decrypt(Buffer.from(x.body, 'base64'))).some(g => /pense à toi/.test(g.title)));
await B.evaluate(() => { S.layer = null; render(true); }); await W(300);
const before = await B.evaluate(() => notifUnread());
await B.evaluate(() => { S.layer = { type: 'sheet', name: 'notifs' }; render(true); }); await W(300);
await B.evaluate(() => { S.layer = null; render(true); }); await W(300);
ok(`centre consulté : ${before} → ${await B.evaluate(() => notifUnread())} non lue`, await B.evaluate(() => notifUnread() === 0 && !document.querySelector('.bell .badge')));
await B.evaluate(() => { S.layer = { type: 'sheet', name: 'names' }; render(true); }); await W(300);
await B.click('[data-a="push-test"]'); await W(2500);
const p4 = await (await fetch('http://localhost:8124/__pushes')).json();
ok('notification de test reçue', p4.filter(x => x.u.endsWith('SARAH')).map(x => decrypt(Buffer.from(x.body, 'base64'))).some(g => /Test réussi/.test(g.title || '')));
console.log('errors', JSON.stringify(errs)); await b.close();
