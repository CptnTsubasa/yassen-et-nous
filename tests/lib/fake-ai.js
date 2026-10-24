let apps = [];
export const initializeApp = (c, name) => { const a = { name, c }; apps.push(a); return a; };
export const getApps = () => apps;
export class GoogleAIBackend {}
export class ReCaptchaV3Provider { constructor(k) { window.__appcheckKey = k; } }
export const initializeAppCheck = (app, o) => { window.__appcheck = !!o.provider; return {}; };
export const getToken = async () => { window.__tokens = (window.__tokens || 0) + 1; await new Promise(r => setTimeout(r, 300)); return { token: 'T' }; };
export const getAI = (app, o) => ({ app, o });
// Le vrai message de Google quand le quota gratuit du jour est épuisé.
const quota = m => new Error(`[GoogleGenerativeAI Error]: Error fetching from https://firebasevertexai.googleapis.com/v1beta/projects/p/models/${m}:streamGenerateContent: [429 ] You exceeded your current quota, please check your plan and billing details. * Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20, model: ${m}, description: Generate content requests per day limit exceeded on Free Tier. Please retry in 15h21m59.62s.`);
export const getGenerativeModel = (ai, o) => ({ async generateContentStream(prompt) {
  if ((window.__quotaModels || []).includes(o.model)) { window.__quotaHits = (window.__quotaHits || 0) + 1; throw quota(o.model); }
  window.__streamCfg = o.generationConfig; window.__streamModel = o.model; window.__yjPrompt = prompt; window.__streamCalls = (window.__streamCalls || 0) + 1;
  if (window.__busyModel === o.model) throw new Error('The model is overloaded (503)');
  const parts = ['[câl', 'in] *fait des ', 'étincelles* Coucou ! ', 'Je suis trop content ', 'que tu me parles. ', 'On fait le puzzle ce soir ?'];
  window.__chunks = [];
  return { stream: (async function* () { for (const t of parts) { await new Promise(r => setTimeout(r, window.__chunkMs || 250)); window.__chunks.push(document.querySelector('#yj-live p')?.textContent || (document.querySelector('.yjm.typing') ? '…' : '')); yield { text: () => t }; } })() };
}, async generateContent(prompt) {
  if ((window.__quotaModels || []).includes(o.model)) throw quota(o.model);
  window.__cfg = o.generationConfig; await new Promise(r => setTimeout(r, window.__aiDelay || 400));
  window.__aiCalls = (window.__aiCalls || 0) + 1;
  let out;
  if (/Nouveau message de/.test(prompt)) { window.__yjPrompt = prompt; out = { reponse: "*fait des étincelles* Coucou ! Je suis trop content que tu me parles. On fait le puzzle ce soir ?", humeur: "calin" }; }
  else if (/Voici une conversation récente/.test(prompt)) { window.__learnPrompt = prompt; out = { faits: ["Yanis adore les crêpes au caramel", "Sarah prépare un week-end à Amsterdam en novembre"] }; }
  else if (/petit mot du jour/.test(prompt)) out = { mot: "Aujourd'hui, je parie que vous allez vous faire au moins trois câlins. Je compte !" };
  else if (/Propose trois histoires/.test(prompt)) out = { propositions: [1, 2, 3].map(i => ({ titre: `Le secret n°${i}`, resume: `Une histoire imaginée par l'IA, version ${i}, avec vos détails.`, ambiance: "épique et tendre" })) };
  else {
    const m = /Écris l'étape (\d+) sur (\d+)/.exec(prompt), i = +m[1], N = +m[2], rpg = /Jeu de rôle/.test(prompt);
    out = { texte: `Étape ${i} écrite par l'IA. Le vent se lève sur la forêt. Les héros avancent, main dans la main, prêts à tout. Une lumière étrange brille au loin, et Yassen Jr. grignote une crêpe.`, decor: ["foret", "chateau", "grotte", "taverne"][i % 4], pause: "Pour de vrai : qu'est-ce qui vous rend courageux ?", choix: rpg ? [{ texte: "Grimper la falaise", stat: "force", difficulte: 11 }, { texte: "Parler au gardien", stat: "charme", difficulte: 9 }, { texte: "Continuer tranquillement" }] : [{ texte: "Suivre la lumière" }, { texte: "Rester ensemble au chaud" }], fin: i >= N, titreFin: "La fin heureuse" };
    if (rpg && i === 2) out.evenement = { type: "combat", ennemi: { nom: "Loup des brumes", espece: "loup", pv: 26, attaque: 4, defense: 1, faiblesse: "force" } };
    if (rpg && i === 3) out.evenement = { type: "tresor", objet: { nom: "Épée de lune", type: "arme", valeur: 2 } };
    if (rpg && i === N - 1) out.evenement = { type: "combat", ennemi: { nom: "Dragon d'Ombrevert", espece: "dragon", pv: 70, attaque: 6, defense: 3, faiblesse: "esprit", boss: true } };
  }
  return { response: { text: () => "```json\n" + JSON.stringify(out) + "\n```" } };
} });
