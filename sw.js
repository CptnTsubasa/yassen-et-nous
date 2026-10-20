/* Y&S hors ligne : la page est d'abord demandée au réseau (pour avoir toujours la dernière version),
   avec la copie gardée en cache si le réseau manque. Le reste (icônes, polices, modules Firebase)
   sert la copie en cache et se met à jour en arrière-plan. Les données et l'IA ne sont jamais mises en cache. */
const V = "ys-v1";
const CORE = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "yassen.jpg"];
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (r.mode === "navigate") {
    e.respondWith(fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put("index.html", cp)); } return res; })
      .catch(() => caches.match("index.html").then(hit => hit || caches.match("./"))));
    return;
  }
  const ours = u.origin === self.location.origin, lib = u.hostname === "www.gstatic.com" && u.pathname.startsWith("/firebasejs/"), font = /^fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);
  if (!ours && !lib && !font) return;
  e.respondWith(caches.match(r).then(hit => {
    const net = fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); } return res; }).catch(() => hit);
    return hit || net;
  }));
});
