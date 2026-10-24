let cache = {}, subs = new Set(), n = 0;
const parts = p => p.split("/").filter(Boolean);
const getAt = (t, p) => parts(p).reduce((o, k) => (o && typeof o === "object" ? o[k] : undefined), t);
function setAt(t, p, v) { const ks = parts(p); let o = t; ks.slice(0, -1).forEach(k => { if (!o[k] || typeof o[k] !== "object") o[k] = {}; o = o[k]; }); if (v == null) delete o[ks[ks.length - 1]]; else o[ks[ks.length - 1]] = v; }
async function pull() { cache = await (await fetch("/__fakedb")).json(); subs.forEach(f => f()); }
// Comme la vraie base : chaque écriture est appliquée côté serveur, chemin par chemin.
function mutate(ops) { ops.forEach(([p, v]) => setAt(cache, p, v)); subs.forEach(f => f()); return fetch("/__fakeops", { method: "POST", body: JSON.stringify(ops) }).then(pull); }
setInterval(pull, 300);
// Comme la vraie base : un objet aux clés 0, 1, 2… (plus de la moitié présentes) revient sous forme de liste.
const asRtdb = v => {
  if (Array.isArray(v)) return asRtdb(Object.fromEntries(v.map((x, i) => [i, x]).filter(([, x]) => x != null)));
  if (!v || typeof v !== "object") return v;
  const o = {}; for (const k in v) o[k] = asRtdb(v[k]);
  const ks = Object.keys(o);
  if (ks.length && ks.every(k => /^(0|[1-9]\d*)$/.test(k))) { const max = Math.max(...ks.map(Number)); if (ks.length * 2 > max + 1) { const arr = []; for (let i = 0; i <= max; i++) arr.push(i in o ? o[i] : null); return arr; } }
  return o;
};
const snap = v => ({ exists: () => v != null, val: () => (v == null ? null : asRtdb(JSON.parse(JSON.stringify(v)))) });
export const initializeApp = c => ({ c });
export const getDatabase = () => ({});
export const ref = (db, path) => ({ path });
export const push = r => { const key = "k" + Date.now().toString(36) + (n++) + Math.random().toString(36).slice(2, 6); return { path: r.path + "/" + key, key }; };
export const set = (r, v) => mutate([[r.path, v]]);
export const update = (r, v) => mutate(Object.keys(v).map(k => [r.path + "/" + k, v[k]]));
export const remove = r => mutate([[r.path, null]]);
export function onValue(r, cb) { let last = "__init__"; const f = () => { const v = getAt(cache, r.path), j = JSON.stringify(v); if (j !== last) { last = j; cb(snap(v)); } }; subs.add(f); pull(); return () => subs.delete(f); }
