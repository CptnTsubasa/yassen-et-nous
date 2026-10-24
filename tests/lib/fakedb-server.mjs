import http from "http"; import fs from "fs";
let db = {};
const parts = p => p.split("/").filter(Boolean);
function setAt(t, p, v) { const ks = parts(p); let o = t; ks.slice(0, -1).forEach(k => { if (!o[k] || typeof o[k] !== "object") o[k] = {}; o = o[k]; }); if (v == null) delete o[ks[ks.length - 1]]; else o[ks[ks.length - 1]] = v; }
http.createServer((q, s) => {
  const body = f => { let b = ""; q.on("data", c => b += c); q.on("end", () => { f(b); s.end("ok"); }); };
  if (q.url === "/__fakedb") { if (q.method === "POST") body(b => { db = JSON.parse(b || "{}"); }); else { s.setHeader("content-type", "application/json"); s.end(JSON.stringify(db)); } return; }
  if (q.url === "/__fakeops") { body(b => JSON.parse(b).forEach(([p, v]) => setAt(db, p, v))); return; }
  s.setHeader("content-type", "text/html; charset=utf-8"); s.end(fs.readFileSync(new URL("./index.html", import.meta.url)));
}).listen(8123);
