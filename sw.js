/* Y&S hors ligne et rapide : la page gardée sur le téléphone s'affiche tout de suite, et la version en ligne
   est demandée en arrière-plan. Si elle a changé, elle remplace la copie et l'appli est prévenue (elle se
   recharge au prochain retour, ou propose un bandeau). Sans copie (première visite), on attend le réseau. Le reste (icônes, polices, modules Firebase) sert la copie
   en cache et se met à jour en arrière-plan. Les données et l'IA ne sont jamais mises en cache. */
const V = "ys-v7", LIB = "ys-lib-v1";
const CORE = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png", "favicon.svg", "yassen.jpg"];
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
    const kept = caches.match("index.html");
    // « no-cache » : le serveur est toujours consulté (le cache HTTP du navigateur pourrait rendre l'ancienne page).
    // La copie d'avant est relue à part : la réponse affichée ne peut être lue qu'une fois.
    const before = caches.match("index.html").then(o => (o ? o.text() : null));
    const net = Promise.all([fetch(new Request(r.url, { cache: "no-cache", credentials: "same-origin" })), before]).then(async ([res, old]) => {
      if (!res.ok || res.type !== "basic") return res;
      const fresh = await res.clone().text(), before = old;
      await caches.open(V).then(c => c.put("index.html", res.clone()));
      // Une nouvelle version vient d'arriver : l'appli ouverte est prévenue.
      if (before !== null && before !== fresh) self.clients.matchAll({ type: "window" }).then(cs => cs.forEach(c => c.postMessage({ ys: "update" })));
      return res;
    });
    e.respondWith(kept.then(hit => {
      if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
      return net.catch(() => caches.match("./").then(h2 => h2 || Promise.reject(new Error("hors ligne"))));
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
  // Toucher une notification ouvre l'appli directement sur son centre de notifications.
  const url = new URL("./#notifs", self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(ws => {
    const w = ws.find(c => c.url.startsWith(self.registration.scope));
    if (w) { w.postMessage({ ys: "notifs" }); return w.focus(); }
    return self.clients.openWindow(url);
  }));
});
