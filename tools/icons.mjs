// Íconos de la PWA a partir de un SVG, con el Chrome instalado (sin dependencias nativas).
// Uso: node tools/icons.mjs
import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'node:fs';

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
// Marca: una línea de nube y tres trazos de lluvia sobre grafito; el del medio, en el azul de la
// lluvia. Con margen de zona segura para la versión enmascarable.
const mark = (pad) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#101418"/>
  <g transform="translate(${256 - 256 * (1 - pad)} ${256 - 256 * (1 - pad)}) scale(${1 - pad})" fill="none" stroke-width="52" stroke-linecap="square">
    <path d="M84 150 H428" stroke="#e9ecef"/>
    <path d="M150 262 L106 410" stroke="#e9ecef"/>
    <path d="M278 262 L234 410" stroke="#3987e5"/>
    <path d="M406 262 L362 410" stroke="#e9ecef"/>
  </g>
</svg>`;
const OUT = new URL('../public/icons/', import.meta.url).pathname;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const page = await browser.newPage();
for (const [name, size, pad] of [['icon-192.png', 192, 0.12], ['icon-512.png', 512, 0.12], ['maskable-512.png', 512, 0.3], ['apple-touch-icon.png', 180, 0.16], ['favicon-32.png', 32, 0.06]]) {
  await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
  await page.setContent(`<html><body style="margin:0;background:#101418">${mark(pad).replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  writeFileSync(OUT + name, await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: size, height: size } }));
  console.log(name);
}
writeFileSync(OUT + 'mark.svg', mark(0.12).trim());
// favicon.ico con PNG adentro (16, 32 y 48 px): el formato que todo navegador acepta como favicon.
const ico = [];
for (const size of [16, 32, 48]) {
  await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
  await page.setContent(`<html><body style="margin:0;background:#101418">${mark(0.06).replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  ico.push([size, Buffer.from(await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: size, height: size } }))]);
}
const head = Buffer.alloc(6 + 16 * ico.length);
head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(ico.length, 4);
let offset = head.length;
ico.forEach(([size, png], i) => {
  const e = 6 + 16 * i;
  head.writeUInt8(size, e); head.writeUInt8(size, e + 1); head.writeUInt8(0, e + 2); head.writeUInt8(0, e + 3);
  head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6); head.writeUInt32LE(png.length, e + 8); head.writeUInt32LE(offset, e + 12);
  offset += png.length;
});
writeFileSync(new URL('../public/favicon.ico', import.meta.url).pathname, Buffer.concat([head, ...ico.map(([, png]) => png)]));
console.log('favicon.ico');
await browser.close();
