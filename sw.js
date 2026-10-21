/* Y&S hors ligne : la page est d'abord demandée au réseau (pour avoir toujours la dernière version) ;
   si le réseau ne répond pas en 3 secondes, la copie gardée s'affiche, et la nouvelle version
   prendra sa place à la prochaine ouverture. Le reste (icônes, polices, modules Firebase) sert la copie
   en cache et se met à jour en arrière-plan. Les données et l'IA ne sont jamais mises en cache. */
const V = "ys-v4", LIB = "ys-lib-v1";
const CORE = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "yassen.jpg"];
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== LIB).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
const keep = (name, req, res) => { if (res && (res.ok || res.type === "opaque")) { const cp = res.clone(); caches.open(name).then(c => c.put(req, cp)); } return res; };
self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (r.mode === "navigate") {
    const app = u.origin === self.location.origin && /\/(index\.html)?$/.test(u.pathname);
    if (!app) return;
    const net = fetch(r).then(res => (res.ok && res.type === "basic" ? keep(V, "index.html", res) : res));
    const late = new Promise(ok => setTimeout(ok, 3000)).then(() => caches.match("index.html"));
    e.respondWith(new Promise((ok, no) => {
      let done = false;
      const give = res => { if (!done && res) { done = true; ok(res); } };
      net.then(give, () => caches.match("index.html").then(hit => hit ? give(hit) : caches.match("./").then(h2 => h2 ? give(h2) : no(new Error("hors ligne")))));
      late.then(give);
    }));
    return;
  }
  const ours = u.origin === self.location.origin, lib = u.hostname === "www.gstatic.com" && u.pathname.startsWith("/firebasejs/"), font = /^fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);
  if (!(ours && CORE.some(p => p !== "./" && u.pathname.endsWith("/" + p))) && !lib && !font) return;
  const name = ours ? V : LIB;
  e.respondWith(caches.match(r).then(hit => {
    const net = fetch(r).then(res => keep(name, r, res)).catch(() => hit);
    return hit || net;
  }));
});

// Notifications : chaque message reçu s'affiche (l'iPhone l'exige), et le toucher ouvre l'appli.
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data ? e.data.text() : "" }; }
  const m = d.data || d.notification || d;
  e.waitUntil(self.registration.showNotification(m.title || "Y&S", { body: m.body || "", icon: "icon-192.png", badge: "icon-192.png", tag: m.tag || undefined, data: { url: m.url || "./" } }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "./", self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(ws => {
    const w = ws.find(c => c.url.startsWith(self.registration.scope));
    return w ? w.focus() : self.clients.openWindow(url);
  }));
});
