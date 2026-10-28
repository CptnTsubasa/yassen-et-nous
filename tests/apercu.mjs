// Fabrique une démo jouable de l'appli : node tests/apercu.mjs → tests/.build/apercu.html
//
// Une seule page avec deux téléphones (Papa et Maman), chacun dans son cadre, reliés par une base en mémoire
// partagée par la page : rien ne part vers Firebase, l'IA ni le service de notifications. Pratique pour montrer
// une nouveauté avant de la publier (ici : L'évasion de Yassen Jr. et son happening).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const T = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.dirname(T), OUT = path.join(T, '.build', 'apercu.html');
let app = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const swap = (a, b) => { if (app.split(a).length !== 2) throw new Error('repère introuvable : ' + a.slice(0, 60)); app = app.replace(a, b); };
// Firebase → la base en mémoire de la page ; pas d'IA ni de notifications.
swap('import(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-app.js`),', 'Promise.resolve(window.__FB),');
swap('import(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-database.js`)', 'Promise.resolve(window.__FB)');
swap('const [A, M, C] = await Promise.all([import(`https://www.gstatic.com/firebasejs/${this.ver}/firebase-app.js`)', 'throw new Error("Pas d\'IA dans la démo"); const [A, M, C] = await Promise.all([import(`https://www.gstatic.com/firebasejs/${this.ver}/firebase-app.js`)');
app = app.replace(/const NOTIF_URL = "[^"]*";/, 'const NOTIF_URL = "";');
swap('const hot = window.claude && window.claude.hot;', 'Object.assign(window, { render, Hap, Esc, Store, ACT }); Object.defineProperty(window, "S", { get: () => S, configurable: true });\nconst hot = null;');
// Avant tout le reste : une mémoire propre à chaque téléphone, et la base partagée.
const boot = `<script>(function () {
  var D = parent.__DEMO, who = window.name === "b" ? "b" : "a", mem = new Map(Object.entries(D.ls(who)));
  var store = { getItem: function (k) { return mem.has(k) ? mem.get(k) : null; }, setItem: function (k, v) { mem.set(k, String(v)); }, removeItem: function (k) { mem.delete(k); }, clear: function () { mem.clear(); }, key: function (i) { return Array.from(mem.keys())[i] || null; }, get length() { return mem.size; } };
  try { Object.defineProperty(window, "localStorage", { value: store, configurable: true }); } catch (e) {}
  var parts = function (p) { return p.split("/").filter(Boolean); };
  var getAt = function (t, p) { return parts(p).reduce(function (o, k) { return o && typeof o === "object" ? o[k] : undefined; }, t); };
  var setAt = function (t, p, v) { var ks = parts(p), o = t; ks.slice(0, -1).forEach(function (k) { if (!o[k] || typeof o[k] !== "object") o[k] = {}; o = o[k]; }); if (v == null) delete o[ks[ks.length - 1]]; else o[ks[ks.length - 1]] = JSON.parse(JSON.stringify(v)); };
  var notify = function () { setTimeout(function () { Array.from(D.subs).forEach(function (f) { try { f(); } catch (e) { D.subs.delete(f); } }); }, 90); };
  var mutate = function (ops) { ops.forEach(function (op) { setAt(D.db, op[0], op[1]); }); notify(); return Promise.resolve(); };
  var snap = function (v) { return { exists: function () { return v != null; }, val: function () { return v == null ? null : JSON.parse(JSON.stringify(v)); } }; };
  var n = 0;
  window.__FB = {
    initializeApp: function (c) { return { c: c }; }, getDatabase: function () { return {}; }, ref: function (db, path) { return { path: path }; },
    push: function (r) { var key = "k" + Date.now().toString(36) + (n++) + who; return { path: r.path + "/" + key, key: key }; },
    set: function (r, v) { return mutate([[r.path, v]]); },
    update: function (r, v) { return mutate(Object.keys(v).map(function (k) { return [r.path + "/" + k, v[k]]; })); },
    remove: function (r) { return mutate([[r.path, null]]); },
    onValue: function (r, cb) { var last = "__"; var f = function () { var v = getAt(D.db, r.path), j = JSON.stringify(v); if (j !== last) { last = j; cb(snap(v)); } }; D.subs.add(f); setTimeout(f, 20); return function () { D.subs.delete(f); }; }
  };
})();<\/script>`;
app = app.replace(/<head>/i, '<head>' + boot);
const appJs = JSON.stringify(app).replace(/<\//g, '<\\/').replace(/<!--/g, '<\\!--');

const page = `<title>L'évasion de Yassen</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Young+Serif&family=Figtree:wght@400;600;700&display=swap">
<style>
/* Un grenier la nuit : bois sombre, lueur de flamme. Deux téléphones côte à côte (ou l'un après l'autre sur un téléphone). */
:root {
  --night: #1B1422; --wood: #2B1D16; --plank: #3A2A20; --cream: #F7EBD3; --muted: #C9B8A6; --flame: #FFC94D; --ember: #E8794A;
  --f-display: "Young Serif", Georgia, serif; --f-body: "Figtree", system-ui, -apple-system, sans-serif;
  color-scheme: dark;
}
body { background: radial-gradient(120% 70% at 50% 0%, #2E2140, var(--night) 60%); color: var(--cream); font: 15px/1.5 var(--f-body); padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 18px 28px; display: grid; gap: 16px; align-content: start; box-sizing: border-box; }
header { display: grid; gap: 6px; max-width: 820px; }
h1 { font: 400 clamp(1.6rem, 6vw, 2.3rem)/1.1 var(--f-display); margin: 0; text-wrap: balance; }
h1 span { color: var(--flame); }
.lede { margin: 0; color: var(--muted); max-width: 62ch; }
.bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.tabs { display: inline-flex; background: var(--wood); border-radius: 999px; padding: 4px; gap: 4px; }
.tabs button, .act { font: 600 .92rem var(--f-body); border: 0; border-radius: 999px; padding: 9px 14px; cursor: pointer; }
.tabs button { background: transparent; color: var(--muted); }
.tabs button[aria-pressed="true"] { background: var(--flame); color: #2B1D16; }
.act { background: var(--plank); color: var(--cream); }
.act:hover, .tabs button:hover { filter: brightness(1.12); }
button:focus-visible { outline: 3px solid var(--flame); outline-offset: 2px; }
.phones { display: flex; gap: 22px; justify-content: center; align-items: flex-start; }
.phone { display: grid; gap: 8px; justify-items: center; flex: 0 1 400px; min-width: 0; }
.phone p { margin: 0; font-weight: 700; letter-spacing: .04em; font-size: .78rem; text-transform: uppercase; color: var(--muted); }
.phone p b { color: var(--flame); }
iframe { width: 100%; max-width: 400px; height: min(820px, 78vh); border: 0; border-radius: 34px; background: #F6F2F5; box-shadow: 0 0 0 8px #120c16, 0 0 0 9px #3A2A20, 0 24px 60px rgba(0, 0, 0, .55); }
.how { max-width: 820px; color: var(--muted); font-size: .9rem; margin: 0; }
.how b { color: var(--cream); }
@media (max-width: 860px) { .phone[hidden-small] { display: none; } iframe { height: 74vh; border-radius: 26px; } }
@media (min-width: 861px) { .tabs { display: none; } }
@media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto; } }
</style>
<header>
  <h1>L'évasion de <span>Yassen Jr.</span></h1>
  <p class="lede">Aperçu jouable, avant de l'ajouter à Y&amp;S : l'escape game à deux et les nouvelles histoires de « Il était une fois nous ». Deux téléphones, Papa et Maman, reliés entre eux. Rien n'est enregistré dans votre vrai espace.</p>
  <div class="bar">
    <div class="tabs" role="group" aria-label="Téléphone affiché"><button id="t-a" aria-pressed="true" data-p="a">Téléphone de Papa</button><button id="t-b" aria-pressed="false" data-p="b">Téléphone de Maman</button></div>
    <button class="act" id="hap" type="button">Voir le happening</button>
    <button class="act" id="reset" type="button">Recommencer</button>
  </div>
  <p class="how"><b>Pour essayer :</b> sur le téléphone de Papa, touchez la carte « Yassen Jr. a disparu… » (ou l'onglet Jouer), choisissez qui monte au grenier, puis lancez. Passez ensuite d'un téléphone à l'autre pour vous parler… tout·e seul·e. Les indices de Yassen sont là si besoin. <b>Les histoires :</b> onglet Jouer, puis « Il était une fois nous ». La fin cachée de chaque histoire demande de bien explorer.</p>
</header>
<div class="phones">
  <div class="phone" id="p-a"><p>Téléphone de <b>Papa</b></p><iframe id="f-a" name="a" title="Téléphone de Papa"></iframe></div>
  <div class="phone" id="p-b" hidden-small><p>Téléphone de <b>Maman</b></p><iframe id="f-b" name="b" title="Téléphone de Maman"></iframe></div>
</div>
<script>
const APP = ${appJs};
const CODE = "APERCUAPERCUAPERCUAPERCUAPEZ";
function weekMonday() { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d.toISOString().slice(0, 10); }
function freshDb() {
  const now = Date.now(), days = {};
  for (let i = 1; i <= 40; i++) days[new Date(now - i * 86400000 * 2).toISOString().slice(0, 10)] = true;
  return { couples: { [CODE]: {
    meta: { couple: { a: "Papa", b: "Maman", style: "partage", since: "2023-06-12" }, avatars: { a: { self: true }, b: { self: true } }, game: { days }, escape: { since: now - 30 * 86400000, next: "grenier", seen: { [weekMonday()]: now - 3600000 } } },
    aventures: { av1: { title: "Lisbonne", statut: "realisee", createdAt: now - 90 * 86400000 } },
    capsule: { m1: { kind: "mot", from: "b", text: "Merci pour ce week-end, je t'aime.", createdAt: now - 5 * 86400000 } }
  } } };
}
window.__DEMO = { db: freshDb(), subs: new Set(), ls: who => ({ "entre-nous:couple": CODE, "entre-nous:me": who, "entre-nous:hap": weekMonday(), "entre-nous:install-hide": "1", "entre-nous:sfx": "1" }) };
function boot() { window.__DEMO.subs.clear(); for (const k of ["a", "b"]) document.getElementById("f-" + k).srcdoc = APP; }
let shown = "a";
function show(k) { shown = k; for (const x of ["a", "b"]) { document.getElementById("t-" + x).setAttribute("aria-pressed", String(x === k)); const p = document.getElementById("p-" + x); if (x === k) p.removeAttribute("hidden-small"); else p.setAttribute("hidden-small", ""); } }
document.querySelectorAll(".tabs button").forEach(b => b.addEventListener("click", () => show(b.dataset.p)));
document.getElementById("hap").addEventListener("click", () => {
  const wide = matchMedia("(min-width: 861px)").matches;
  for (const k of wide ? ["a", "b"] : [shown]) { const w = document.getElementById("f-" + k).contentWindow; try { w.S.hapShow = { room: "grenier", t: Date.now() }; w.S.layer = { type: "hap" }; w.render(true); } catch (e) {} }
});
document.getElementById("reset").addEventListener("click", () => { window.__DEMO.db = freshDb(); boot(); });
boot();
</script>`;
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, page);
console.log('aperçu :', OUT, Math.round(page.length / 1024) + ' Ko');
