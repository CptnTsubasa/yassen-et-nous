/* Y&S : le petit service qui envoie les notifications.
   Il écoute l'espace commun de chaque couple (couples/<code>) et prévient l'autre téléphone :
   un petit mot, une lettre scellée, une invitation à jouer, puis chaque matin les lettres qui s'ouvrent
   et les dates qui comptent, et le soir (si on l'a demandé) un rappel quand Yassen Jr. attend encore.
   Les jetons de notification sont rangés dans couples/<code>/push/<a|b>/<id> par l'appli. */
const { setGlobalOptions } = require("firebase-functions/v2");
const { onValueCreated, onValueWritten } = require("firebase-functions/v2/database");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

admin.initializeApp();
setGlobalOptions({ region: "europe-west1", maxInstances: 3 });
const DB = { instance: "y-s-14d43-default-rtdb" };
const TZ = "Europe/Paris";
const db = () => admin.database();
const other = k => (k === "a" ? "b" : "a");
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
const cut = (t, n) => { t = String(t || "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1) + "…" : t; };
const NEVER_OFF = {};
const DEFAULTS = { mot: true, lettre: true, partie: true, fete: true, quetes: false };

async function couple(code) {
  const v = (await db().ref(`couples/${code}/meta/couple`).get()).val() || {};
  return k => cut(v[k], 24) || (k === "a" ? "Partenaire 1" : "Partenaire 2");
}
async function wants(code, who, type) {
  const v = (await db().ref(`couples/${code}/meta/space/notif/${who}/${type}`).get()).val();
  return typeof v === "boolean" ? v : DEFAULTS[type];
}
// Envoie à tous les téléphones de « who » ; les jetons devenus invalides sont retirés.
async function notify(code, who, type, msg) {
  if (who !== "a" && who !== "b") return;
  if (!NEVER_OFF[type] && !(await wants(code, who, type))) return;
  const ref = db().ref(`couples/${code}/push/${who}`), list = (await ref.get()).val() || {};
  const keys = Object.keys(list).filter(k => list[k] && typeof list[k].t === "string");
  if (!keys.length) return;
  const res = await admin.messaging().sendEachForMulticast({
    tokens: keys.map(k => list[k].t),
    data: { title: cut(msg.title, 80), body: cut(msg.body, 180), url: "./", tag: msg.tag || type },
    webpush: { headers: { Urgency: "high", TTL: "86400" } }
  });
  const dead = {};
  res.responses.forEach((r, i) => {
    const c = r.error && r.error.code;
    if (c === "messaging/registration-token-not-registered" || c === "messaging/invalid-registration-token" || c === "messaging/invalid-argument") dead[keys[i]] = null;
  });
  if (Object.keys(dead).length) await ref.update(dead);
}

// Un téléphone vient d'activer les notifications : on note ce couple pour les envois du matin et du soir.
exports.pushIndex = onValueWritten({ ref: "/couples/{code}/push/{who}/{key}", ...DB }, async e => {
  if (e.data.after.exists()) await db().ref(`pushIndex/${e.params.code}`).set(true);
});

// Un petit mot (ou une anecdote) rangé dans la capsule.
exports.newMot = onValueCreated({ ref: "/couples/{code}/capsule/{id}", ...DB }, async e => {
  const x = e.data.val() || {};
  if (x.kind !== "mot" && x.kind !== "anecdote") return;
  const from = x.from === "b" ? "b" : "a", nm = await couple(e.params.code);
  await notify(e.params.code, other(from), "mot", x.kind === "mot"
    ? { title: `💌 Un petit mot de ${nm(from)}`, body: x.text || "Ouvre Y&S pour le lire." }
    : { title: `📖 ${nm(from)} a raconté une anecdote`, body: x.text || "" });
});

// Une lettre scellée : l'autre sait qu'elle existe, pas ce qu'elle dit.
exports.newLettre = onValueCreated({ ref: "/couples/{code}/lettres/{id}", ...DB }, async e => {
  const x = e.data.val() || {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(x.openOn || "")) return;
  const from = x.from === "b" ? "b" : "a", nm = await couple(e.params.code);
  const d = new Date(x.openOn + "T12:00:00Z").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  await notify(e.params.code, other(from), "lettre", { title: `✉️ ${nm(from)} a scellé une lettre pour toi`, body: `Elle s'ouvrira le ${d}. Patience…` });
});

// Une partie à distance qui commence.
exports.newPartie = onValueWritten({ ref: "/couples/{code}/live/game", ...DB }, async e => {
  const a = e.data.after.val(), b = e.data.before.val();
  if (!a || a.ended || (b && b.startAt === a.startAt) || Date.now() - (+a.startAt || 0) > 600000) return;
  const by = a.by === "b" ? "b" : "a", nm = await couple(e.params.code);
  const what = a.kind === "story" ? "une histoire à deux" : a.kind === "arcade" ? "un jeu d'arcade" : "une partie de cartes";
  await notify(e.params.code, other(by), "partie", { title: `🎲 ${nm(by)} t'invite à jouer`, body: `On t'attend pour ${what}, à distance.`, tag: "partie" });
});

async function eachCouple(fn) {
  const codes = Object.keys((await db().ref("pushIndex").get()).val() || {});
  for (const code of codes) { try { await fn(code); } catch (err) { console.error(code, err); } }
}

// Chaque matin : lettres qui s'ouvrent, anniversaires, date où vous vous êtes mis ensemble.
exports.matin = onSchedule({ schedule: "0 9 * * *", timeZone: TZ }, async () => {
  const d = today(), md = d.slice(5);
  await eachCouple(async code => {
    const nm = await couple(code), c = (await db().ref(`couples/${code}/meta/couple`).get()).val() || {};
    const lettres = (await db().ref(`couples/${code}/lettres`).get()).val() || {};
    for (const l of Object.values(lettres)) {
      if (l && l.openOn === d) { const from = l.from === "b" ? "b" : "a"; await notify(code, other(from), "lettre", { title: `💌 Une lettre de ${nm(from)} s'ouvre aujourd'hui`, body: l.title ? `« ${cut(l.title, 60)} »` : "Elle t'attend dans Y&S.", tag: "lettre-" + d }); }
    }
    for (const k of ["a", "b"]) {
      const bd = c["bd" + k];
      if (typeof bd === "string" && bd.slice(5) === md) {
        await notify(code, k, "fete", { title: `🎂 Joyeux anniversaire, ${nm(k)} !`, body: "Yassen Jr. a préparé un gâteau. Il en a un peu mangé.", tag: "fete-" + d });
        await notify(code, other(k), "fete", { title: `🎂 C'est l'anniversaire de ${nm(k)} aujourd'hui`, body: "Un petit mot pour la journée ?", tag: "fete-" + d });
      }
    }
    if (typeof c.since === "string" && c.since.slice(5) === md && c.since < d) {
      const n = +d.slice(0, 4) - +c.since.slice(0, 4);
      for (const k of ["a", "b"]) await notify(code, k, "fete", { title: `💞 ${n} an${n > 1 ? "s" : ""} ensemble aujourd'hui`, body: `${nm("a")} & ${nm("b")}, joyeux anniversaire à vous deux.`, tag: "since-" + d });
    }
  });
});

// Le soir, pour qui l'a demandé : rien partagé aujourd'hui ? Yassen Jr. vous attend.
exports.soir = onSchedule({ schedule: "30 20 * * *", timeZone: TZ }, async () => {
  const d = today();
  await eachCouple(async code => {
    if ((await db().ref(`couples/${code}/meta/game/days/${d}`).get()).exists()) return;
    for (const k of ["a", "b"]) await notify(code, k, "quetes", { title: "🔥 Yassen Jr. vous attend", body: "Une petite quête à deux ce soir ? Même cinq minutes, ça compte.", tag: "soir-" + d });
  });
});
