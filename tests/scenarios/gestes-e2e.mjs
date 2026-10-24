import { chromium, LAUNCH } from '../lib/pw.mjs';
import fs from 'fs'; import crypto from 'node:crypto';
const fakeDb = fs.readFileSync('fbtest/fake-firebase.js', 'utf8');
const b = await chromium.launch(LAUNCH);
const errs = [], W = ms => new Promise(r => setTimeout(r, ms)), ok = (n, v) => console.log((v ? 'OK  ' : 'FAIL') + ' ' + n);
const b64u = x => Buffer.from(x).toString('base64url');
const ecdh = crypto.createECDH('prime256v1'); ecdh.generateKeys(); const auth = crypto.randomBytes(16);
const C = 'QQQQQQQQQQQQQQQQQQQQQQQQQQQQ', EP = 'https://web.push.apple.com/SARAH-' + Date.now();
await fetch('http://localhost:8123/__fakedb', { method: 'POST', body: JSON.stringify({ couples: { [C]: { meta: { couple: { a: 'Yanis', b: 'Sarah', style: 'partage' }, avatars: { a: { self: true }, b: { self: true } } }, push: { b: { s1: { e: EP, p: b64u(ecdh.getPublicKey()), a: b64u(auth) } } } } } }) });
function decrypt(body) {
  body = Buffer.from(body, 'base64');
  const salt = body.subarray(0, 16), idlen = body[20], as = body.subarray(21, 21 + idlen), ct = body.subarray(21 + idlen);
  const shared = ecdh.computeSecret(as), ua = ecdh.getPublicKey(), H = (k, d) => crypto.createHmac('sha256', k).update(d).digest();
  const prk = H(salt, H(H(auth, shared), Buffer.concat([Buffer.from('WebPush: info\0'), ua, as, Buffer.from([1])])));
  const cek = H(prk, Buffer.concat([Buffer.from('Content-Encoding: aes128gcm\0'), Buffer.from([1])])).subarray(0, 16), nonce = H(prk, Buffer.concat([Buffer.from('Content-Encoding: nonce\0'), Buffer.from([1])])).subarray(0, 12);
  const d = crypto.createDecipheriv('aes-128-gcm', cek, nonce); d.setAuthTag(ct.subarray(ct.length - 16));
  const pt = Buffer.concat([d.update(ct.subarray(0, ct.length - 16)), d.final()]); return JSON.parse(pt.subarray(0, pt.lastIndexOf(2)).toString());
}
const got = async () => (await (await fetch('http://localhost:8124/__pushes')).json()).filter(p => p.u === EP).map(p => decrypt(p.body));
async function phone(me) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: fakeDb }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await ctx.addInitScript(([c, me]) => { try { if (!localStorage.getItem('entre-nous:couple')) { localStorage.setItem('entre-nous:couple', c); localStorage.setItem('entre-nous:me', me); localStorage.setItem('entre-nous:sfx', '0'); } } catch (e) {} }, [C, me]);
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(me + ': ' + e.message)); await p.goto('http://localhost:8123/'); return p;
}
const A = await phone('a'); await W(1500);
await A.evaluate(() => { S.layer = null; S.obShown = true; render(true); });
// 10 câlins à la suite, très vite
const sel = '[data-a="sig-send"][data-v="calin"]', btn = await A.$(sel); console.log('bouton visible :', !!btn);
for (let i = 0; i < 10; i++) { if (btn && i < 3) await A.click(sel); else await A.evaluate(() => ACT['sig-send']({ v: 'calin' })); await W(60); }
await W(4000);
let m = await got();
ok(`10 câlins → ${m.length} notifications pour Sarah`, m.length === 10 && m.every(x => /câlin/.test(x.title)));
ok('10 étiquettes différentes (aucune fusion sur l\'iPhone)', new Set(m.map(x => x.tag)).size === 10);
// 3 pensées, puis l'appli est fermée aussitôt (avant l'envoi) : elles partent à la réouverture
await A.evaluate(() => { for (let i = 0; i < 3; i++) ACT['sig-send']({ v: 'pense' }); });
await A.reload(); await W(6000);
m = await got();
ok(`appli fermée tout de suite : ${m.length - 10} pensées arrivées sur 3`, m.length === 13 && m.slice(10).every(x => /pense à toi/.test(x.title)));
const db = await (await fetch('http://localhost:8123/__fakedb')).json();
ok('les gestes livrés sont effacés de l\'espace commun', !db.couples[C].gestes || Object.keys(db.couples[C].gestes).length === 0);
ok('file d\'envoi vide', await A.evaluate(() => (localStorage.getItem('entre-nous:notifq') || '[]') === '[]'));
await W(1500); ok('pas de doublon ensuite', (await got()).length === 13);
console.log('errors', JSON.stringify(errs)); await b.close();
