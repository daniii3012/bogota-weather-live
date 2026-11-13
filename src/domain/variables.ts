/** Las cuatro variables del clima: nombre, unidad y cómo se lee su valor de una estación. */
import type { Estacion, Variable } from '../live/contract';

export const VARIABLES: Variable[] = ['lluvia', 'temp', 'hum', 'viento'];

export interface Meta {
  nombre: string;
  /** Qué mide el valor que se muestra en el mapa y en las listas. */
  medida: string;
  unidad: string;
  dec: number;
  /** Tono de la variable (ficha de diseño). */
  tono: string;
}

export const META: Record<Variable, Meta> = {
  lluvia: { nombre: 'Lluvia', medida: 'Acumulado de hoy', unidad: 'mm', dec: 1, tono: 'var(--v-lluvia)' },
  temp: { nombre: 'Temperatura', medida: 'Temperatura del aire', unidad: '°C', dec: 1, tono: 'var(--v-temp)' },
  hum: { nombre: 'Humedad', medida: 'Humedad relativa', unidad: '%', dec: 0, tono: 'var(--v-hum)' },
  viento: { nombre: 'Viento', medida: 'Velocidad del viento', unidad: 'm/s', dec: 1, tono: 'var(--v-viento)' },
};

/** Una lectura con más de media hora ya no describe el presente. */
export const VIGENTE_S = 30 * 60;

export const vigente = (t: number | null | undefined, now: number): boolean => t != null && now - t < VIGENTE_S;

/** Valor vigente de una variable en una estación (en lluvia, el acumulado del día); `null` si no hay. */
export function valor(e: Estacion, v: Variable, now: number): number | null {
  if (v === 'lluvia') return e.lluvia && vigente(e.lluvia.t, now) ? e.lluvia.hoy : null;
  const l = e[v];
  return l && vigente(l.t, now) ? l.v : null;
}

/** Hora de la lectura de una variable, vigente o no. */
export const leida = (e: Estacion, v: Variable): number | null => e[v]?.t ?? null;

/** ¿Llovió en el último minuto en esta estación? */
export const llueve = (e: Estacion, now: number): boolean => !!e.lluvia && vigente(e.lluvia.t, now) && e.lluvia.min > 0;

/** Intensidad de la lluvia del último minuto, llevada a milímetros por hora. */
export function intensidad(mmMin: number): 'ligera' | 'moderada' | 'fuerte' | 'muy fuerte' {
  const h = mmMin * 60;
  return h < 2.5 ? 'ligera' : h < 10 ? 'moderada' : h < 50 ? 'fuerte' : 'muy fuerte';
}

const ROSA = ['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste'];
/** De dónde sopla el viento, en palabras. */
export const rumbo = (grados: number): string => ROSA[Math.round((((grados % 360) + 360) % 360) / 45) % 8];
