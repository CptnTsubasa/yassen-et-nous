// Lance les tests de Y&S : node tests/run.mjs [nom…]   (sans nom : tous les scénarios)
//
// 1. Prépare une version de test de l'appli dans tests/.build : index.html avec ses fonctions exposées
//    (window.Store, window.render…) et le service de notifications pointé vers le service local.
// 2. Démarre la fausse base Firebase (port 8123), le service Cloudflare local (8124) et un serveur de
//    fichiers pour le service worker (8130).
// 3. Lance chaque scénario (Chromium piloté par Playwright) et fait le bilan : une ligne « FAIL », une erreur
//    de page (« errors [...] ») ou un plantage = échec.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const T = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.dirname(T), B = path.join(T, '.build');
const read = f => fs.readFileSync(f, 'utf8'), put = (f, s) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s); };

// Ce que les scénarios utilisent directement depuis la page.
const EXPOSE = 'Jeu, Store, render, Buddies, SHOP_BY_ID, STORY, Live, OUTFITS, onboardStep, PRESETS, Shared, cleanCol, cleanLive, cleanMeta, cxNormalize, ACT, AI, CX_GENRES, whoAmI, cxStory, flushSeen, seenSet, nParties, claimMe, deviceId, rpgStartFight, rpgHeroAct, rpgEnemyAct, rpgUseItem, rpgWin, todayStr, startLiveArcade, startLiveCards, Sfx, Music, yassenSvg, moodOf, sigSend, yjLog, YJ, notifItems, notifUnread, seasonNow, bdayToday, startLiveStory, toast, liveRound, cleanLive2: cleanLive, avatarSvg, avOf, couple, nm, parentOf, Backup, IDB, pzList, Rescue, yjMem, yjContext, countdowns, gainToast, yearData, Stats, Update, Esc, escGen, escCartons, escStep, escHints, escPoints, cleanEscape, Hap, hapOf, hapWeek, EscTick, ESC_ITEMS, ESC_SYMS, ESC_COLORS, ESC_LEVELS, STORIES, storyStep, stx, startLiveStory';
const HOOK = 'const hot = window.claude && window.claude.hot;';

function build() {
  fs.rmSync(B, { recursive: true, force: true });
  let html = read(path.join(ROOT, 'index.html'));
  if (html.split(HOOK).length !== 2) throw new Error(`repère introuvable dans index.html : ${HOOK}`);
  html = html.replace(HOOK, `Object.assign(window, { ${EXPOSE} });\nObject.defineProperty(window, "S", { get: () => S, configurable: true });\n${HOOK}`);
  const NOTIF = /const NOTIF_URL = "[^"]*";/;
  // Version servie par la fausse base : notifications vers le service local.
  put(path.join(B, 'fbtest/index.html'), html.replace(NOTIF, 'const NOTIF_URL = "http://localhost:8124";'));
  fs.copyFileSync(path.join(T, 'lib/fake-firebase.js'), path.join(B, 'fbtest/fake-firebase.js'));
  fs.copyFileSync(path.join(T, 'lib/fakedb-server.mjs'), path.join(B, 'fbtest/server.mjs'));
  fs.copyFileSync(path.join(T, 'lib/fake-ai.js'), path.join(B, 'fake-ai.js'));
  // Le service Cloudflare, avec les tâches du matin et du soir exportées pour les tests.
  put(path.join(B, 'wk/worker.mjs'), read(path.join(ROOT, 'notifications/worker.js')) + '\nexport { morning, evening, happening, hapOf, hapWeek };\n');
  fs.copyFileSync(path.join(T, 'lib/worker-server.mjs'), path.join(B, 'wk/serve.mjs'));
  for (const f of fs.readdirSync(path.join(T, 'worker'))) fs.copyFileSync(path.join(T, 'worker', f), path.join(B, 'wk', f));
  // Le site tel que publié (pour le service worker), qui s'enregistre aussi sur localhost.
  const site = html.replace('location.protocol === "https:" && /github\\.io$/.test(location.hostname)', 'true').replace(NOTIF, 'const NOTIF_URL = "http://localhost:8124";');
  put(path.join(B, 'site/index.html'), site);
  for (const f of ['sw.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'favicon.svg', 'favicon.ico', 'maskable-512.png', 'yassen.jpg'])
    if (fs.existsSync(path.join(ROOT, f))) fs.copyFileSync(path.join(ROOT, f), path.join(B, 'site', f));
}

// Vérifie que chaque script de index.html se compile (une erreur de syntaxe = appli blanche).
function syntax() {
  const html = read(path.join(ROOT, 'index.html')), bad = [];
  for (const m of html.matchAll(/<script(?![^>]*src)([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (/type="application\/json"/.test(m[1])) continue;
    try { new Function(m[2]); } catch (e) { if (!/import|await/.test(e.message)) bad.push(e.message); }
  }
  return bad;
}

const servers = [];
function serve(cwd, args) { const p = spawn(process.execPath, args, { cwd, stdio: 'ignore' }); servers.push(p); return p; }
const stop = () => servers.forEach(p => { try { p.kill(); } catch (e) { /* déjà arrêté */ } });
process.on('exit', stop); process.on('SIGINT', () => { stop(); process.exit(130); });

const errs = syntax();
if (errs.length) { console.log('ÉCHEC  index.html ne se compile pas :', errs.join(' | ')); process.exit(1); }
build();
serve(path.join(B, 'fbtest'), ['server.mjs']);
serve(path.join(B, 'wk'), ['serve.mjs']);
serve(T, [path.join(T, 'lib/static-server.mjs'), path.join(B, 'site'), '8130']);
await new Promise(r => setTimeout(r, 1200));

const want = process.argv.slice(2);
const units = fs.readdirSync(path.join(T, 'worker')).filter(f => f.endsWith('.mjs')).map(f => ({ name: 'worker/' + f.replace(/\.mjs$/, ''), file: path.join(B, 'wk', f), cwd: path.join(B, 'wk') }));
const scen = fs.readdirSync(path.join(T, 'scenarios')).filter(f => f.endsWith('.mjs')).sort().map(f => ({ name: f.replace(/\.mjs$/, ''), file: path.join(T, 'scenarios', f), cwd: B }));
const list = [...units, ...scen].filter(t => !want.length || want.some(w => t.name === w || t.name.endsWith('/' + w)));
const results = [];
for (const t of list) {
  const t0 = Date.now(), r = spawnSync(process.execPath, [t.file], { cwd: t.cwd, encoding: 'utf8', timeout: 240000 });
  const out = (r.stdout || '') + (r.stderr || ''), lines = out.split('\n');
  const fails = lines.filter(l => /^FAIL\b/.test(l)), oks = lines.filter(l => /^OK\b/.test(l)).length;
  const pageErr = lines.find(l => /^errors \[.+\]/.test(l) && l.trim() !== 'errors []');
  const crash = r.status !== 0 ? (lines.find(l => /Error|error/.test(l)) || `code ${r.status}${r.signal ? ' ' + r.signal : ''}`) : '';
  const ok = !fails.length && !pageErr && !crash;
  results.push({ name: t.name, ok });
  console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${t.name.padEnd(22)} ${String(oks).padStart(2)} vérification${oks > 1 ? 's' : ''}  ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  if (!ok) [...fails, pageErr, crash].filter(Boolean).slice(0, 5).forEach(l => console.log('        ' + l.trim().slice(0, 220)));
  // YS_VERBOSE=1 : toute la sortie du scénario (pour chercher un échec).
  if (process.env.YS_VERBOSE) console.log(out.split('\n').filter(l => !/^\s+at /.test(l)).slice(-40).join('\n'));
}
stop();
const bad = results.filter(r => !r.ok);
console.log(`\n${results.length - bad.length}/${results.length} scénarios réussis${bad.length ? ' — à revoir : ' + bad.map(r => r.name).join(', ') : ''}`);
process.exit(bad.length ? 1 : 0);
