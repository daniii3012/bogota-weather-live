// Navegación sin recarga: recorre las vistas con clics reales y comprueba que el documento y el mapa
// siguen siendo los mismos (una marca puesta al abrir sobrevive) y cuánto tarda cada cambio de vista.
// Uso: node tests/visual/nav.mjs [url] [movil]
import puppeteer from 'puppeteer-core';

const [url = 'http://localhost:5173/', modo] = process.argv.slice(2);
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const movil = modo === 'movil';

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
let fallas = 0;
try {
  const page = await browser.newPage();
  await page.setViewport(movil ? { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { width: 1440, height: 900, deviceScaleFactor: 1 });
  let cargas = 0;
  page.on('load', () => cargas++);
  page.on('pageerror', (e) => { fallas++; console.log('   error de la página:', e.message); });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForFunction(() => window.__map?.areTilesLoaded?.(), { timeout: 30000 }).catch(() => {});
  await page.waitForSelector('.ficha', { timeout: 20000 });
  await page.evaluate(() => { window.__marca = 'intacta'; window.__mapa0 = window.__map; });
  const cargasIniciales = cargas;

  // Cada paso: qué se pulsa y qué debe aparecer.
  const pasos = [
    ['a[href="#/pronostico"]', 'Pronóstico'],
    ['.cab .volver', null],
    ['a[href="#/rios"]', 'Ríos y quebradas'],
    ['.rios a', null],
    ['.cab .volver', 'Ríos y quebradas'],
    ['.cab .cerrar', null],
    ['a[href="#/alertas"]', 'Alertas'],
    ['.cab .cerrar', null],
    ['.filas a', null],
    ['.cab .cerrar', null],
  ];
  for (const [sel, titulo] of pasos) {
    // En el teléfono el enlace puede estar fuera de la hoja asomada: se desplaza a la vista antes de tocarlo.
    const antes = await page.evaluate(() => location.hash);
    const t0 = Date.now();
    const ok = await page.evaluate((s) => { const el = document.querySelector(s); if (!el) return false; el.scrollIntoView({ block: 'center' }); el.click(); return true; }, sel);
    await new Promise((r) => setTimeout(r, 700));
    const e = await page.evaluate(() => ({ hash: location.hash, marca: window.__marca, mismoMapa: window.__mapa0 === window.__map, titulo: document.querySelector('.cab h2')?.textContent ?? '(inicio)' }));
    const bien = ok && e.marca === 'intacta' && e.mismoMapa && cargas === cargasIniciales && (!titulo || e.titulo === titulo) && e.hash !== antes;
    if (!bien) fallas++;
    console.log(`${bien ? 'bien ' : 'FALLA'} ${sel.padEnd(26)} ${antes || '#/'} → ${e.hash || '#/'}  «${e.titulo}»  marca=${e.marca} mapa=${e.mismoMapa ? 'el mismo' : 'OTRO'} cargas=${cargas} (${Date.now() - t0} ms)`);
  }

  // El inicio se conserva: tras abrir otra vista y volver, sigue con la lista desplegada, en el mismo
  // punto del desplazamiento y (teléfono) con la hoja a la misma altura; y el mapa no se mueve.
  const contenido = movil ? '.sheet .content' : '.panel .content';
  if (movil) await page.evaluate(() => { const g = document.querySelector('.grip'); for (let i = 0; i < 2; i++) g.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })); });
  await page.evaluate(() => document.querySelector('.mas')?.click());
  await new Promise((r) => setTimeout(r, 500));
  const medir = () => page.evaluate((c) => {
    const m = window.__map, ce = m.getCenter();
    return { top: Math.round(document.querySelector(c).scrollTop), filas: document.querySelectorAll('.vista:not([hidden]) .filas li').length, hoja: Math.round(document.querySelector('.sheet')?.getBoundingClientRect().height ?? 0), mapa: `${ce.lng.toFixed(5)},${ce.lat.toFixed(5)},${m.getZoom().toFixed(3)},${JSON.stringify(m.getPadding())}` };
  }, contenido);
  await page.evaluate((c) => { document.querySelector(c).scrollTop = 420; }, contenido);
  await new Promise((r) => setTimeout(r, 300));
  const antes = await medir();
  for (const [sel, nombre] of [['a[href="#/pronostico"]', 'pronóstico'], ['.cab .volver', 'volver'], ['a[href="#/rios"]', 'ríos'], ['.cab .cerrar', 'cerrar']]) {
    await page.evaluate((x) => document.querySelector(x).click(), sel);
    await new Promise((r) => setTimeout(r, 900));
    const d = await medir();
    const enInicio = nombre === 'volver' || nombre === 'cerrar';
    const bien = d.mapa === antes.mapa && (!enInicio || (d.top === antes.top && d.filas === antes.filas && d.hoja === antes.hoja));
    if (!bien) fallas++;
    console.log(`${bien ? 'bien ' : 'FALLA'} ${nombre.padEnd(11)} desplazamiento ${d.top} (${antes.top}) · filas ${d.filas} (${antes.filas}) · hoja ${d.hoja} (${antes.hoja}) · mapa ${d.mapa === antes.mapa ? 'quieto' : 'SE MOVIÓ'}`);
  }
} finally {
  await browser.close();
}
console.log(fallas ? `${fallas} fallas` : 'sin recargas');
process.exit(fallas ? 1 : 0);
