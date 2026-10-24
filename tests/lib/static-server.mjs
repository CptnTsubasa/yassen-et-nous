// Petit serveur de fichiers (comme GitHub Pages) pour tester le service worker : node static-server.mjs <dossier> <port>
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const [root, port] = [path.resolve(process.argv[2] || '.'), +(process.argv[3] || 8130)];
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
http.createServer((q, s) => {
  let p = decodeURIComponent(new URL(q.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.statusCode = 404; s.end('introuvable'); return; }
  // Comme GitHub Pages : la page peut être gardée 10 minutes par le navigateur (le service worker doit la revalider).
  s.setHeader('Content-Type', TYPES[path.extname(f)] || 'application/octet-stream');
  s.setHeader('Cache-Control', 'max-age=600');
  s.setHeader('Last-Modified', fs.statSync(f).mtime.toUTCString());
  s.end(fs.readFileSync(f));
}).listen(port);
