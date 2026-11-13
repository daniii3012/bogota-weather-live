/** Resúmenes: la ciudad entera, cada localidad y el orden de las estaciones por variable. */
import type { Estacion, Serie, Variable } from '../live/contract';
import { llueve, valor } from './variables';

export interface Resumen {
  /** Estaciones con lluvia vigente (las que cuentan para «llueve en N de M»). */
  conLluvia: number;
  /** Estaciones donde llovió en el último minuto, de más a menos. */
  lloviendo: Estacion[];
  /** Estación con más lluvia acumulada hoy (si llovió en alguna). */
  maxHoy: Estacion | null;
  temp: { min: Estacion | null; max: Estacion | null; media: number | null };
  hum: { media: number | null };
  viento: { max: Estacion | null; media: number | null };
  /** Lectura más reciente de cualquier variable. */
  ultima: number | null;
}

const media = (xs: number[]): number | null => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

function extremo(es: Estacion[], v: Variable, now: number, signo: 1 | -1): Estacion | null {
  let mejor: Estacion | null = null, m = -Infinity;
  for (const e of es) {
    const x = valor(e, v, now);
    if (x !== null && x * signo > m) { m = x * signo; mejor = e; }
  }
  return mejor;
}

export function resumen(es: Estacion[], now: number): Resumen {
  const lloviendo = es.filter((e) => llueve(e, now)).sort((a, b) => b.lluvia!.min - a.lluvia!.min);
  const maxHoy = extremo(es, 'lluvia', now, 1);
  const vals = (v: Variable) => es.map((e) => valor(e, v, now)).filter((x): x is number => x !== null);
  let ultima: number | null = null;
  for (const e of es) for (const l of [e.lluvia, e.temp, e.hum, e.viento]) if (l && (ultima === null || l.t > ultima)) ultima = l.t;
  return {
    conLluvia: vals('lluvia').length,
    lloviendo,
    maxHoy: maxHoy && valor(maxHoy, 'lluvia', now)! > 0 ? maxHoy : null,
    temp: { min: extremo(es, 'temp', now, -1), max: extremo(es, 'temp', now, 1), media: media(vals('temp')) },
    hum: { media: media(vals('hum')) },
    viento: { max: extremo(es, 'viento', now, 1), media: media(vals('viento')) },
    ultima,
  };
}

export interface Localidad {
  nombre: string;
  estaciones: Estacion[];
  lloviendo: number;
  /** Mayor acumulado del día, temperatura y humedad medias y viento máximo; `null` sin datos. */
  lluvia: number | null;
  temp: number | null;
  hum: number | null;
  viento: number | null;
}

export function porLocalidad(es: Estacion[], now: number): Localidad[] {
  const grupos = new Map<string, Estacion[]>();
  for (const e of es) (grupos.get(e.localidad) ?? grupos.set(e.localidad, []).get(e.localidad)!).push(e);
  const out: Localidad[] = [];
  for (const [nombre, lista] of grupos) {
    const vals = (v: Variable) => lista.map((e) => valor(e, v, now)).filter((x): x is number => x !== null);
    const max = (xs: number[]) => (xs.length ? Math.max(...xs) : null);
    out.push({
      nombre, estaciones: lista, lloviendo: lista.filter((e) => llueve(e, now)).length,
      lluvia: max(vals('lluvia')), temp: media(vals('temp')), hum: media(vals('hum')), viento: max(vals('viento')),
    });
  }
  return out.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

/** Estaciones con dato vigente de una variable, de mayor a menor. */
export function orden(es: Estacion[], v: Variable, now: number): { e: Estacion; v: number }[] {
  const out: { e: Estacion; v: number }[] = [];
  for (const e of es) {
    const x = valor(e, v, now);
    if (x !== null) out.push({ e, v: x });
  }
  return out.sort((a, b) => b.v - a.v || a.e.nombre.localeCompare(b.e.nombre, 'es'));
}

const lista = (xs: string[]): string => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`);

/** El estado de la ciudad en una frase: dónde llueve ahora. */
export function frase(r: Resumen): { titulo: string; detalle: string } {
  if (!r.conLluvia) return { titulo: 'Sin datos de lluvia', detalle: 'Las estaciones no han reportado en la última media hora.' };
  if (!r.lloviendo.length) {
    return {
      titulo: 'Sin lluvia en la ciudad',
      detalle: r.maxHoy ? `Hoy ha llovido: el mayor acumulado, ${String(r.maxHoy.lluvia!.hoy).replace('.', ',')} mm, es de ${r.maxHoy.nombre} (${r.maxHoy.localidad}).` : 'Ninguna estación ha registrado lluvia hoy.',
    };
  }
  // Localidades con lluvia, primero las que más estaciones tienen lloviendo.
  const cuenta = new Map<string, number>();
  for (const e of r.lloviendo) cuenta.set(e.localidad, (cuenta.get(e.localidad) ?? 0) + 1);
  const locs = [...cuenta.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n);
  const visibles = locs.slice(0, 3), resto = locs.length - visibles.length;
  const donde = resto > 0 ? `${visibles.join(', ')} y ${resto} ${resto === 1 ? 'localidad más' : 'localidades más'}` : lista(visibles);
  const n = r.lloviendo.length;
  return { titulo: n === 1 ? 'Llueve en una estación' : `Llueve en ${n} estaciones`, detalle: `En ${donde}.` };
}

/** Lluvia intensa según la regla oficial: 5 mm o más en un intervalo de 5 minutos de la última hora. */
export function intensa(s: Serie, now: number): boolean {
  return s.variable === 'lluvia' && s.puntos.some(([t, v]) => now - t <= 3600 && v >= 5);
}
