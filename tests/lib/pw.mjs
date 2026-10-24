// Playwright et Chromium, où qu'ils soient installés.
// - Playwright : le paquet « playwright » s'il est installé, sinon l'installation globale de l'environnement cloud.
// - Chromium : la variable CHROME si elle est définie, sinon celui de l'environnement cloud, sinon celui de Playwright.
import fs from 'node:fs';

let pw;
try { pw = await import('playwright'); }
catch (e) { pw = await import('/opt/node22/lib/node_modules/playwright/index.mjs'); }
export const chromium = pw.chromium;

const CLOUD = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
export const LAUNCH = process.env.CHROME ? { executablePath: process.env.CHROME } : fs.existsSync(CLOUD) ? { executablePath: CLOUD } : {};
