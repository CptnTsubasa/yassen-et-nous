import { chromium, LAUNCH } from '../lib/pw.mjs';
import fs from 'fs';
const fakeDb = fs.readFileSync('fbtest/fake-firebase.js', 'utf8');
const b = await chromium.launch(LAUNCH);
const errs = [], W = ms => new Promise(r => setTimeout(r, ms));
const ok = (name, v) => console.log((v ? 'OK  ' : 'FAIL') + ' ' + name);
const C = 'DDDDDDDDDDDDDDDDDDDDDDDDDDDD';
await fetch('http://localhost:8123/__fakedb', { method: 'POST', body: JSON.stringify({ couples: { [C]: { meta: { couple: { a: 'Yanis', b: 'Sarah', style: 'partage' }, avatars: { a: { self: true }, b: { self: true } }, puzzle: { list: { abc123: 5 } } } } } }) });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: fakeDb }));
await ctx.addInitScript(([c]) => { try { localStorage.setItem('entre-nous:couple', c); localStorage.setItem('entre-nous:me', 'a'); } catch (e) {} }, [C]);
const P = await ctx.newPage(); P.on('pageerror', e => errs.push(e.message));
await P.goto('http://localhost:8123/'); await W(1500);
await P.evaluate(() => { window.__ev = []; const f = Jeu.event.bind(Jeu); Jeu.event = id => { window.__ev.push(id); return f(id); }; });
// Quêtes fantômes
await P.evaluate(() => { S.layer = null; S.arc = { phase: 'end', game: 'tp' }; S.game = { phase: 'end', mode: 'questions', seen: ['dec-1', 'dec-2', 'dec-3'] }; render(true); });
ok('partie finie restée en mémoire : rien ne compte', await P.evaluate(() => !window.__ev.length));
await P.evaluate(() => { S.layer = { type: 'game' }; S.game = { phase: 'end', mode: 'questions', seen: ['dec-1'], i: 0, deck: ['dec-1'] }; try { render(true); } catch (e) {} });
ok('une seule carte rejouée ne valide pas « partie »', await P.evaluate(() => !window.__ev.includes('partie')));
await P.evaluate(() => { S.layer = null; S.game = null; S.arc = null; render(true); });
// Bonus des 3 quêtes
await P.evaluate(() => { const d = todayStr(), qs = Jeu.todayQuests(), p = {}; qs.forEach(q => { p[`quests/${d}/${q.id}`] = true; }); Store.patchMeta('game', p); render(true); });
ok('bonus des 3 quêtes donné par la surveillance', await P.evaluate(() => !!((Jeu.g().earn || {})[todayStr() + '_bonus'])));
// Combats
const mkStory = () => P.evaluate(() => { Store.put('contes', 'f1', { title: 'Combat', pitch: 'p', genre: 'fantasy', length: 'courte', max: 5, mode: 'rpg', status: 'play', createdAt: Date.now(), seed: { l: 0, o: 0, al: 0, m: 0, r: 1 },
  rpg: { heroes: { a: { cls: 'barde', stats: { force: 1, agilite: 3, esprit: 2, charme: 5 }, lvl: 1, xp: 0, pv: 24, pvMax: 24, pm: 10, pmMax: 10 }, b: { cls: 'sentinelle', stats: { force: 4, agilite: 2, esprit: 1, charme: 1 }, lvl: 1, xp: 0, pv: 34, pvMax: 34, pm: 4, pmMax: 4 } }, items: [{ nom: 'Potion', type: 'potion', valeur: 1 }], gold: 0, wins: 0, bosses: 0 },
  steps: [{ text: 'Un boss !', sc: 'foret', choices: [{ t: 'ok' }], event: { type: 'combat', enemy: { nom: 'Gros Boss', espece: 'dragon', pv: 100, atk: 7, def: 3, faiblesse: 'force', boss: true } } }] });
  S.layer = { type: 'conte' }; ACT['cx-open']({ id: 'f1' }); ACT['cx-fight'](); render(true); });
await mkStory(); await W(300);
ok('potion refusée quand les PV sont pleins', await P.evaluate(() => rpgUseItem(S.fight.st, 0, 'a', S.fight) === ''));
ok('potion ne relève pas', await P.evaluate(() => { S.fight.st.rpg.heroes.a.pv = 0; const r = rpgUseItem(S.fight.st, 0, 'a', S.fight); S.fight.st.rpg.heroes.a.pv = 24; return r === ''; }));
ok('bonus gardé si l\'action est refusée', await P.evaluate(() => { const F = S.fight; F.buff.b = 4; F.specials.b = true; const r = rpgHeroAct(F.st, 'b', 'special'); return r === false && F.buff.b === 4; }));
ok('la berceuse fait aussi passer le temps du bouclier', await P.evaluate(() => { const F = S.fight; F.shield = 2; F.lulled = true; rpgEnemyAct(F.st); return F.shield === 1; }));
await P.evaluate(() => { const F = S.fight; F.enemy.atk = 15; F.enemy.pv = 10; F.over = 'lose'; ACT['cx-retry'](); render(true); });
ok('retenter : boss d\'origine', await P.evaluate(() => S.fight.enemy.atk === 7 && S.fight.enemy.pv === 100));
await P.evaluate(() => { const F = S.fight; F.enemy.pv = 0; F.over = 'win'; F.result = rpgWin(F.st); ACT['cx-flee'](); render(true); });
ok('× après victoire enregistre la victoire', await P.evaluate(() => { const s = Store.cols.contes.find(x => x.id === 'f1'); return !S.fight && s.steps[0].done === 'win' && s.rpg.wins === 1; }));
// Défaite : on se relève à moitié
await mkStory(); await W(300);
await P.evaluate(() => { const F = S.fight; F.st.rpg.heroes.a.pv = 0; F.st.rpg.heroes.b.pv = 0; F.over = 'lose'; ACT['cx-fight-end'](); render(true); });
ok('« continuer autrement » : un tiers des PV', await P.evaluate(() => { const h = Store.cols.contes.find(x => x.id === 'f1').rpg.heroes; return h.a.pv === 9 && h.b.pv === 12; }));
// Sac plein
await P.evaluate(() => { const st = Store.cols.contes.find(x => x.id === 'f1'); const { id, ...d } = st; d.rpg.items = Array.from({ length: 20 }, () => ({ nom: 'Potion', type: 'potion', valeur: 1 })); d.steps = [{ text: 'Trésor', sc: 'foret', choices: [{ t: 'ok' }], event: { type: 'tresor', item: { nom: 'Bombe', type: 'bombe', valeur: 1 } } }]; Store.put('contes', 'f1', d); ACT['cx-loot'](); render(true); });
ok('sac plein : objet pas ajouté', await P.evaluate(() => Store.cols.contes.find(x => x.id === 'f1').rpg.items.length === 20));
// Photo de puzzle manquante : pas de boucle
await P.evaluate(() => { window.__r = 0; const f = window.render; S.layer = { type: 'puzzle' }; S.pz = null; render(true); });
await P.evaluate(() => { const o = Store.db.doc; window.__snaps = 0; Store.db.doc = function (p) { const r = o.call(this, p); if (/^pzimg/.test(p)) { const os = r.onSnapshot; r.onSnapshot = (...a) => { window.__snaps++; return os(...a); }; } return r; }; render(true); });
await W(2000);
ok('photo manquante demandée une seule fois', await P.evaluate(() => window.__snaps <= 1));
console.log('errors', JSON.stringify(errs)); await b.close();
