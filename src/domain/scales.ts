/**
 * Escalas de color de los datos sobre el mapa.
 *
 * Cada variable usa un solo tono en pasos de luminosidad (más es más claro en el tema oscuro y más
 * oscuro en el claro); la temperatura, que tiene un punto medio natural, va de azul a rojo pasando
 * por gris. Los colores salen de `tools/palette.mjs` y están validados en los dos temas: no se
 * retocan a mano.
 */
import type { Variable } from '../live/contract';

export type Tema = 'dark' | 'light';
export type Escala = Variable | 'sequia';

/** Límites superiores de cada clase (la última no tiene límite). */
export const CORTES: Record<Escala, number[]> = {
  // Acumulado del día en milímetros: los tramos de la página oficial.
  lluvia: [10, 30, 50],
  // °C. El tramo central (13–15) es lo templado de Bogotá.
  temp: [8, 11, 13, 15, 17, 20],
  // % de humedad relativa.
  hum: [50, 65, 80, 90],
  // m/s: calma, leve, moderado, fuerte, muy fuerte.
  viento: [1.5, 3.5, 5.5, 8],
  // Días sin lluvia de los últimos siete.
  sequia: [1, 3, 5],
};

const RAMPAS: Record<Tema, Record<Escala, string[]>> = {
  dark: {
    lluvia: ['#1f68bc', '#488fe7', '#83b8fd', '#cae0fd'],
    hum: ['#097c56', '#0e9c6e', '#40ba8a', '#63d9a7', '#84f9c5'],
    viento: ['#6557b9', '#8073d9', '#9c91fa', '#bab6fe', '#dbdafe'],
    sequia: ['#ad4215', '#d86941', '#ff956f', '#ffd3c3'],
    temp: ['#b3d4ff', '#7bb4fd', '#4d93ec', '#6f757b', '#e36364', '#fe8b88', '#fdbfbc'],
  },
  light: {
    lluvia: ['#569df6', '#337bd0', '#0859ac', '#013c79'],
    hum: ['#38b484', '#069a6c', '#0d7e58', '#046344', '#004931'],
    viento: ['#968bf3', '#7e71d7', '#6758bb', '#513fa0', '#3c2686'],
    sequia: ['#e7774e', '#c1552b', '#9b3402', '#6c2000'],
    temp: ['#014b96', '#1f68bc', '#4087de', '#999fa6', '#d55758', '#b3363c', '#900f20'],
  },
};

/** Sin dato o sin lluvia: gris que se retira hacia el fondo. */
export const NEUTRO: Record<Tema, string> = { dark: '#5f6975', light: '#9aa3ac' };

/** Estados (ríos, alertas): fijos en los dos temas; siempre con icono y rótulo. */
export const ESTADO = { ok: '#0ca30c', warn: '#fab219', serious: '#ec835a', critical: '#d03b3b' } as const;

/** Clase de un valor: índice del primer corte que no supera. */
export function clase(escala: Escala, v: number): number {
  const c = CORTES[escala];
  let i = 0;
  while (i < c.length && v > c[i]) i++;
  return i;
}

export const rampa = (escala: Escala, tema: Tema): string[] => RAMPAS[tema][escala];

export function color(escala: Escala, v: number, tema: Tema): string {
  return RAMPAS[tema][escala][clase(escala, v)];
}

/** Tinta para un texto dentro de un relleno: casi negro o blanco, según la luminancia del fondo. */
export function tinta(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.26 ? '#0b0e11' : '#ffffff';
}

const fmt = (n: number) => String(n).replace('.', ',');

/** Rótulos de la leyenda: «≤ 10», «10–30», «> 50». */
export function rotulos(escala: Escala): string[] {
  const c = CORTES[escala];
  return [...c.map((x, i) => (i === 0 ? `≤ ${fmt(x)}` : `${fmt(c[i - 1])}–${fmt(x)}`)), `> ${fmt(c[c.length - 1])}`];
}
