// Escalas de color de los datos, calculadas en OKLCH (tono fijo, pasos de luminosidad iguales) y no
// elegidas a ojo. Imprime las rampas para los dos temas; se validan con el validador de paletas
// (rampa ordinal: luminosidad monótona, pasos ≥ 0,06 y contraste ≥ 2:1 del extremo cercano al fondo).
//   node tools/palette.mjs
const toLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
function hexToOklch(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => toLin(parseInt(hex.slice(i, i + 2), 16) / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), (Math.atan2(B, A) * 180) / Math.PI];
}
function oklchToRgb(L, C, H) {
  const a = C * Math.cos((H * Math.PI) / 180), b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
}
// Si el color no cabe en sRGB se baja el croma hasta que quepa: el tono y la luminosidad se conservan.
function hex(L, C, H) {
  for (let c = C; c >= 0; c -= 0.004) {
    const rgb = oklchToRgb(L, c, H);
    if (rgb.every((v) => v >= -0.0005 && v <= 1.0005)) return '#' + rgb.map((v) => Math.round(toSrgb(Math.min(1, Math.max(0, v))) * 255).toString(16).padStart(2, '0')).join('');
  }
  return '#000000';
}
// Tonos de la paleta de referencia (azul, aguamarina, violeta, naranja, rojo).
const TONO = { azul: hexToOklch('#3987e5')[2], agua: hexToOklch('#199e70')[2], violeta: hexToOklch('#9085e9')[2], naranja: hexToOklch('#d95926')[2], rojo: hexToOklch('#e66767')[2] };
const rampa = (tono, n, l0, l1, c) => Array.from({ length: n }, (_, i) => hex(l0 + ((l1 - l0) * i) / (n - 1), c, TONO[tono]));
// Oscuro: más es más claro (el valor bajo se acerca al fondo). Claro: más es más oscuro.
const modo = (oscuro) => {
  const [a, b] = oscuro ? [0.52, 0.9] : [0.69, 0.36];
  const [da, db] = oscuro ? [0.66, 0.86] : [0.62, 0.42];
  const gris = oscuro ? hex(0.56, 0.012, 250) : hex(0.7, 0.012, 250);
  return {
    lluvia: rampa('azul', 4, a, b, 0.15),
    hum: rampa('agua', 5, a, b, 0.13),
    viento: rampa('violeta', 5, a, b, 0.15),
    sequia: rampa('naranja', 4, a, b, 0.15),
    // Divergente: frío en azul, templado en gris neutro, cálido en rojo; tres pasos por brazo.
    temp: [...rampa('azul', 3, db, da, 0.15), gris, ...rampa('rojo', 3, da, db, 0.16)],
  };
};
console.log(JSON.stringify({ oscuro: modo(true), claro: modo(false) }, null, 1));
