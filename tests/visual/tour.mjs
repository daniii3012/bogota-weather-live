// Recorrido visual: abre cada escena en el Chrome instalado, la captura y arma hojas de contacto
// (varias capturas en una imagen) para revisar la interfaz de un vistazo.
// Uso: node tests/visual/tour.mjs [url] [grupo…]      grupos: movil, escritorio (por defecto, todos)
import puppeteer from 'puppeteer-core';
import { mkdirSync, writeFileSync } from 'node:fs';

const [url = 'http://localhost:5173/', ...grupos] = process.argv.slice(2);
const OUT = new URL('./out/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const VISTAS = {
  movil: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  escritorio: { width: 1440, height: 900, deviceScaleFactor: 1 },
};
const ficha = (i) => `document.querySelectorAll('.ficha')[${i}]?.click()`;
// La hoja inferior a media altura o completa: flechas del teclado sobre la manija.
const hoja = (veces) => `(() => { const g = document.querySelector('.grip'); for (let i = 0; i < ${veces}; i++) g?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })); })()`;

const ESCENAS = {
  movil: [
    { n: 'inicio-media', hash: '#/', js: hoja(1) },
    { n: 'inicio-completa', hash: '#/', js: hoja(2) },
    { n: 'estacion-lluvia', hash: '#/estacion/1500', js: hoja(1) },
    { n: 'estacion-temp', hash: '#/estacion/1500', js: `${ficha(1)}; ${hoja(1)}` },
    { n: 'temperatura', hash: '#/', js: ficha(1) },
    { n: 'viento', hash: '#/', js: ficha(3) },
    { n: 'rios', hash: '#/rios', js: hoja(1) },
    { n: 'pronostico', hash: '#/pronostico', js: hoja(1) },
  ],
  escritorio: [
    { n: 'estacion', hash: '#/estacion/1500' },
    { n: 'temperatura', hash: '#/', js: ficha(1) },
    { n: 'viento-capas', hash: '#/', js: `${ficha(3)}; document.querySelector('[aria-label="Capas del mapa"]')?.click()` },
    { n: 'rio', hash: '#/rio/1700' },
    { n: 'pronostico', hash: '#/pronostico' },
    { n: 'buscar', hash: '#/', js: `window.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }))` },
    { n: 'claro', hash: '#/localidad/Usme', claro: true },
    { n: 'alertas', hash: '#/alertas', js: `document.querySelectorAll('.ver [role=switch]').forEach((b) => b.click())` },
  ],
};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars'] });
try {
  for (const grupo of grupos.length ? grupos : Object.keys(ESCENAS)) {
    const archivos = [];
    // SOLO=buscar,alertas limita el recorrido a esas escenas.
    const solo = process.env.SOLO?.split(',');
    for (const e of ESCENAS[grupo].filter((x) => !solo || solo.includes(x.n))) {
      const page = await browser.newPage();
      const avisos = [];
      page.on('pageerror', (x) => avisos.push(`error: ${x.message}`));
      page.on('console', (m) => { if (m.type() === 'error' || /svelte/.test(m.text())) avisos.push(`${m.type()}: ${m.text().slice(0, 200)}`); });
      page.on('response', (r) => { if (r.status() >= 400) avisos.push(`${r.status()} ${r.url().slice(0, 120)}`); });
      await page.setViewport(VISTAS[grupo]);
      if (e.claro) await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
      await page.goto(url + e.hash, { waitUntil: 'networkidle2', timeout: 60000 });
      await page.waitForFunction(() => window.__map?.areTilesLoaded?.(), { timeout: 30000 }).catch(() => avisos.push('mapa sin terminar'));
      await new Promise((r) => setTimeout(r, 1200));
      if (e.js) await page.evaluate(e.js);
      await new Promise((r) => setTimeout(r, e.espera ?? 2600));
      const file = `${OUT}${grupo}-${e.n}.png`;
      await page.screenshot({ path: file });
      archivos.push({ file, n: e.n });
      console.log(`${grupo}/${e.n}`, avisos.length ? `\n   ${[...new Set(avisos)].join('\n   ')}` : '');
      await page.close();
    }
    // Hoja de contacto: cuatro por fila en móvil, dos en escritorio.
    const cols = grupo === 'movil' ? 4 : 2, w = grupo === 'movil' ? 390 : 1100;
    const hojas = [];
    for (let i = 0; i < archivos.length; i += cols) hojas.push(archivos.slice(i, i + cols));
    for (const [k, fila] of hojas.entries()) {
      const html = `<body style="margin:0;background:#000;display:flex;gap:8px;padding:8px">${fila.map((a) => `<figure style="margin:0"><img src="file://${a.file}" width="${w}"><figcaption style="color:#9aa;font:12px monospace;padding:4px 0">${a.n}</figcaption></figure>`).join('')}</body>`;
      const tmp = `${OUT}_hoja.html`;
      writeFileSync(tmp, html);
      const page = await browser.newPage();
      await page.setViewport({ width: fila.length * (w + 8) + 8, height: 100, deviceScaleFactor: 1 });
      await page.goto(`file://${tmp}`, { waitUntil: 'load' });
      await page.screenshot({ path: `${OUT}hoja-${grupo}-${k + 1}.png`, fullPage: true });
      await page.close();
    }
  }
} finally {
  await browser.close();
}
