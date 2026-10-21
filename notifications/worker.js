/* Y&S : le petit service qui envoie les notifications (Cloudflare Worker, offert, sans carte).

   Les notifications partent directement vers le service de notifications d'Apple (Web Push).
   Le Worker fabrique lui-même sa paire de clés la première fois et la garde dans son stockage KV :
   la clé privée ne quitte jamais Cloudflare. L'appli lit la clé publique sur /vapid.

   - POST /register { code }            : un téléphone a activé les notifications pour ce couple
   - POST /notify { code, type, id }     : quelque chose vient d'arriver (petit mot, geste, lettre, partie)
     Le Worker relit lui-même l'élément dans l'espace commun : il n'envoie que ce qui existe vraiment.
   - Tâches programmées : 9 h (lettres qui s'ouvrent, anniversaires) et 20 h 30 (rappel, si demandé).

   Réglages dans Cloudflare : une liaison KV nommée « KV », et deux déclencheurs Cron :
   « 0 7,8 * * * » et « 30 18,19 * * * » (heure UTC : le code ne garde que 9 h et 20 h 30 à Paris). */

const DB = "https://y-s-14d43-default-rtdb.europe-west1.firebasedatabase.app";
const SITE = "https://cptntsubasa.github.io/yassen-et-nous/";
const TZ = "Europe/Paris";
const DEFAULTS = { mot: true, geste: true, lettre: true, partie: true, fete: true, quetes: false };
const GESTES = { calin: ["🤗", "{f} t'envoie un câlin", "Un gros câlin à distance."], courage: ["💪", "{f} t'envoie plein de courage", "Tu vas y arriver."], pense: ["💭", "{f} pense à toi", "Juste comme ça, parce que."], espace: ["🌙", "{f} est là si tu as besoin", "Prends ton temps."] };
const okCode = c => typeof c === "string" && /^[A-Za-z0-9]{24,64}$/.test(c);
const okId = v => typeof v === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(v);
const other = k => (k === "a" ? "b" : "a");
const cut = (t, n) => { t = String(t || "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1) + "…" : t; };
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
const json = (v, status = 200) => new Response(JSON.stringify(v), { status, headers: { "Content-Type": "application/json", ...CORS } });

/* ───── Petits outils binaires ───── */
const enc = new TextEncoder();
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), c => c.charCodeAt(0));
const concat = (...parts) => { const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out; };
async function hmac(key, data) {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data));
}

/* ───── Clés VAPID (créées une fois, gardées dans KV) ───── */
async function vapid(env) {
  const saved = await env.KV.get("vapid", "json");
  if (saved) return saved;
  const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const v = { jwk: await crypto.subtle.exportKey("jwk", kp.privateKey), pub: b64u(await crypto.subtle.exportKey("raw", kp.publicKey)) };
  await env.KV.put("vapid", JSON.stringify(v));
  return v;
}
async function vapidHeader(env, endpoint) {
  const v = await vapid(env), aud = new URL(endpoint).origin;
  const head = b64u(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const body = b64u(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: SITE })));
  const key = await crypto.subtle.importKey("jwk", v.jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(head + "." + body));
  return `vapid t=${head}.${body}.${b64u(sig)}, k=${v.pub}`;
}

/* ───── Chiffrement du message (RFC 8291, aes128gcm) ───── */
async function encrypt(sub, text) {
  const ua = unb64u(sub.p), auth = unb64u(sub.a);
  const eph = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const as = new Uint8Array(await crypto.subtle.exportKey("raw", eph.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", ua, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, eph.privateKey, 256));
  const prkKey = await hmac(auth, shared);
  const ikm = await hmac(prkKey, concat(enc.encode("WebPush: info\0"), ua, as, new Uint8Array([1])));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, concat(enc.encode("Content-Encoding: aes128gcm\0"), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, concat(enc.encode("Content-Encoding: nonce\0"), new Uint8Array([1])))).slice(0, 12);
  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, concat(enc.encode(text), new Uint8Array([2]))));
  const head = new Uint8Array(21); head.set(salt); new DataView(head.buffer).setUint32(16, 4096); head[20] = as.length;
  return concat(head, as, ct);
}

/* ───── L'espace commun (base Firebase, en lecture) ───── */
async function rtdb(path, init) {
  const r = await fetch(`${DB}/${path}.json`, init);
  if (!r.ok) throw new Error("base " + r.status);
  return r.json();
}
async function names(code) {
  const c = (await rtdb(`couples/${code}/meta/couple`)) || {};
  return { c, nm: k => cut(c[k], 24) || (k === "a" ? "Partenaire 1" : "Partenaire 2") };
}
async function wants(code, who, type) {
  const v = await rtdb(`couples/${code}/meta/space/notif/${who}/${type}`);
  return typeof v === "boolean" ? v : DEFAULTS[type];
}
// Envoie à tous les téléphones de « who » ; les abonnements disparus sont retirés.
async function notify(env, code, who, type, msg) {
  if (who !== "a" && who !== "b" || !(await wants(code, who, type))) return 0;
  const subs = (await rtdb(`couples/${code}/push/${who}`)) || {};
  const text = JSON.stringify({ title: cut(msg.title, 80), body: cut(msg.body, 180), tag: msg.tag || type, url: "./" });
  let n = 0;
  for (const [k, s] of Object.entries(subs)) {
    if (!s || typeof s.e !== "string" || typeof s.p !== "string" || typeof s.a !== "string" || !/^https:\/\//.test(s.e)) continue;
    try {
      const r = await fetch(s.e, { method: "POST", headers: { Authorization: await vapidHeader(env, s.e), "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream", TTL: "86400", Urgency: "high" }, body: await encrypt(s, text) });
      if (r.status === 404 || r.status === 410) await rtdb(`couples/${code}/push/${who}/${k}`, { method: "DELETE" });
      else if (r.ok) n++;
      else console.log("push", r.status, await r.text());
    } catch (e) { console.log("push", e.message); }
  }
  return n;
}
// Une même nouvelle n'est envoyée qu'une fois, même si l'appli la signale deux fois.
async function once(env, key) {
  if (await env.KV.get(key)) return false;
  await env.KV.put(key, "1", { expirationTtl: 3 * 86400 });
  return true;
}

/* ───── Ce qui vient d'arriver ───── */
async function onEvent(env, code, type, id) {
  const { nm } = await names(code);
  if (type === "mot") {
    const x = await rtdb(`couples/${code}/capsule/${id}`);
    if (!x || (x.kind !== "mot" && x.kind !== "anecdote") || Date.now() - (+x.createdAt || 0) > 86400000) return 0;
    if (!(await once(env, `sent:${code}:mot:${id}`))) return 0;
    const from = x.from === "b" ? "b" : "a";
    return notify(env, code, other(from), "mot", x.kind === "mot"
      ? { title: `💌 Un petit mot de ${nm(from)}`, body: x.text || "Ouvre Y&S pour le lire." }
      : { title: `📖 ${nm(from)} a raconté une anecdote`, body: x.text || "" });
  }
  if (type === "geste") {
    // id = le destinataire (a ou b) : son dernier geste reçu, s'il est tout frais.
    const x = await rtdb(`couples/${code}/meta/signal/${id}`), g = x && GESTES[x.kind];
    if (!g || (id !== "a" && id !== "b") || Date.now() - (+x.t || 0) > 600000 || !(await once(env, `sent:${code}:geste:${x.id}`))) return 0;
    const from = x.from === "b" ? "b" : "a";
    return notify(env, code, id, "geste", { title: `${g[0]} ${g[1].replace("{f}", nm(from))}`, body: g[2], tag: "geste" });
  }
  if (type === "lettre") {
    const x = await rtdb(`couples/${code}/lettres/${id}`);
    if (!x || !/^\d{4}-\d{2}-\d{2}$/.test(x.openOn || "") || Date.now() - (+x.createdAt || 0) > 86400000) return 0;
    if (!(await once(env, `sent:${code}:lettre:${id}`))) return 0;
    const from = x.from === "b" ? "b" : "a";
    const d = new Date(x.openOn + "T12:00:00Z").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
    return notify(env, code, other(from), "lettre", { title: `✉️ ${nm(from)} a scellé une lettre pour toi`, body: `Elle s'ouvrira le ${d}. Patience…` });
  }
  if (type === "partie") {
    const x = await rtdb(`couples/${code}/live/game`);
    if (!x || x.ended || Date.now() - (+x.startAt || 0) > 600000) return 0;
    if (!(await once(env, `sent:${code}:partie:${x.startAt}`))) return 0;
    const by = x.by === "b" ? "b" : "a", what = x.kind === "story" ? "une histoire à deux" : x.kind === "arcade" ? "un jeu d'arcade" : "une partie de cartes";
    return notify(env, code, other(by), "partie", { title: `🎲 ${nm(by)} t'invite à jouer`, body: `On t'attend pour ${what}, à distance.`, tag: "partie" });
  }
  return 0;
}

/* ───── Les rendez-vous du matin et du soir ───── */
const parisNow = () => {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date()).map(x => [x.type, x.value]));
  return { day: `${p.year}-${p.month}-${p.day}`, hour: +p.hour };
};
async function couples(env) {
  const out = []; let cursor;
  do { const r = await env.KV.list({ prefix: "couple:", cursor }); out.push(...r.keys.map(k => k.name.slice(7))); cursor = r.list_complete ? null : r.cursor; } while (cursor);
  return out.filter(okCode);
}
async function morning(env, day) {
  const md = day.slice(5);
  for (const code of await couples(env)) {
    try {
      const { c, nm } = await names(code), lettres = (await rtdb(`couples/${code}/lettres`)) || {};
      for (const l of Object.values(lettres)) {
        if (l && l.openOn === day) { const from = l.from === "b" ? "b" : "a"; await notify(env, code, other(from), "lettre", { title: `💌 Une lettre de ${nm(from)} s'ouvre aujourd'hui`, body: l.title ? `« ${cut(l.title, 60)} »` : "Elle t'attend dans Y&S.", tag: "lettre-" + day }); }
      }
      for (const k of ["a", "b"]) {
        const bd = c["bd" + k];
        if (typeof bd === "string" && bd.slice(5) === md) {
          await notify(env, code, k, "fete", { title: `🎂 Joyeux anniversaire, ${nm(k)} !`, body: "Yassen Jr. a préparé un gâteau. Il en a un peu mangé.", tag: "fete-" + day });
          await notify(env, code, other(k), "fete", { title: `🎂 C'est l'anniversaire de ${nm(k)} aujourd'hui`, body: "Un petit mot pour la journée ?", tag: "fete-" + day });
        }
      }
      if (typeof c.since === "string" && c.since.slice(5) === md && c.since < day) {
        const n = +day.slice(0, 4) - +c.since.slice(0, 4);
        for (const k of ["a", "b"]) await notify(env, code, k, "fete", { title: `💞 ${n} an${n > 1 ? "s" : ""} ensemble aujourd'hui`, body: `${nm("a")} & ${nm("b")}, joyeux anniversaire à vous deux.`, tag: "since-" + day });
      }
    } catch (e) { console.log(code, e.message); }
  }
}
async function evening(env, day) {
  for (const code of await couples(env)) {
    try {
      if (await rtdb(`couples/${code}/meta/game/days/${day}`)) continue;
      for (const k of ["a", "b"]) await notify(env, code, k, "quetes", { title: "🔥 Yassen Jr. vous attend", body: "Une petite quête à deux ce soir ? Même cinq minutes, ça compte.", tag: "soir-" + day });
    } catch (e) { console.log(code, e.message); }
  }
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
    try {
      if (req.method === "GET" && url.pathname === "/vapid") return json({ key: (await vapid(env)).pub });
      if (req.method === "GET" && url.pathname === "/") return json({ ok: true, service: "Y&S notifications" });
      if (req.method !== "POST") return json({ error: "inconnu" }, 404);
      const b = await req.json().catch(() => ({}));
      if (!okCode(b.code)) return json({ error: "code" }, 400);
      if (url.pathname === "/register") {
        if (!(await env.KV.get("couple:" + b.code))) await env.KV.put("couple:" + b.code, "1");
        return json({ ok: true });
      }
      if (url.pathname === "/notify") {
        if (!["mot", "geste", "lettre", "partie"].includes(b.type) || (b.type !== "partie" && !okId(b.id))) return json({ error: "type" }, 400);
        return json({ ok: true, sent: await onEvent(env, b.code, b.type, b.id) });
      }
      return json({ error: "inconnu" }, 404);
    } catch (e) { return json({ error: e.message }, 500); }
  },
  async scheduled(event, env, ctx) {
    const { day, hour } = parisNow();
    if (hour === 9) ctx.waitUntil(morning(env, day));
    else if (hour === 20) ctx.waitUntil(evening(env, day));
  }
};
