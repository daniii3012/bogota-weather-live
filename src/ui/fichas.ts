/** Contenido de las cuatro fichas para la ciudad, una localidad o una estación, y filas de las listas. */
import type { Estacion, Variable } from '../live/contract';
import { num } from '../domain/fmt';
import { type Localidad, type Resumen } from '../domain/stats';
import { META, intensidad, llueve, rumbo, valor, vigente } from '../domain/variables';
import type { Fichas } from './VarTiles.svelte';
import type { Fila } from './Filas.svelte';

const nada = { valor: '—', unidad: '', nota: 'Sin datos', sinDato: true };

export function fichasCiudad(r: Resumen, now: number): Fichas {
  const max = r.maxHoy ? valor(r.maxHoy, 'lluvia', now) : null;
  const tmin = r.temp.min ? valor(r.temp.min, 'temp', now) : null, tmax = r.temp.max ? valor(r.temp.max, 'temp', now) : null;
  const vmax = r.viento.max ? valor(r.viento.max, 'viento', now) : null;
  return {
    lluvia: r.conLluvia
      ? { valor: String(r.lloviendo.length), unidad: `de ${r.conLluvia} con lluvia`, nota: max ? `Máx. hoy ${num(max, 1)} mm` : 'Sin lluvia hoy' }
      : nada,
    temp: r.temp.media !== null ? { valor: num(r.temp.media, 1), unidad: '°C media', nota: `De ${num(tmin, 1)}° a ${num(tmax, 1)}°` } : nada,
    hum: r.hum.media !== null ? { valor: num(r.hum.media, 0), unidad: '% media', nota: 'Humedad relativa' } : nada,
    viento: vmax !== null ? { valor: num(vmax, 1), unidad: 'm/s máx.', nota: r.viento.max!.nombre } : nada,
  };
}

export function fichasLocalidad(l: Localidad): Fichas {
  const n = l.estaciones.filter((e) => e.lluvia).length;
  return {
    lluvia: l.lluvia !== null ? { valor: num(l.lluvia, 1), unidad: 'mm máx. hoy', nota: l.lloviendo ? `Llueve en ${l.lloviendo} de ${n}` : 'Sin lluvia ahora' } : nada,
    temp: l.temp !== null ? { valor: num(l.temp, 1), unidad: '°C media', nota: 'Temperatura del aire' } : nada,
    hum: l.hum !== null ? { valor: num(l.hum, 0), unidad: '% media', nota: 'Humedad relativa' } : nada,
    viento: l.viento !== null ? { valor: num(l.viento, 1), unidad: 'm/s máx.', nota: 'Velocidad del viento' } : nada,
  };
}

export function fichasEstacion(e: Estacion, now: number): Fichas {
  const sinSensor = { valor: '—', unidad: '', nota: 'Sin sensor', sinDato: true }, vieja = { valor: '—', unidad: '', nota: 'Sin lecturas recientes', sinDato: true };
  const f = (v: Variable) => (e[v] ? (vigente(e[v]!.t, now) ? null : vieja) : sinSensor);
  return {
    lluvia: f('lluvia') ?? { valor: num(e.lluvia!.hoy, 1), unidad: 'mm hoy', nota: llueve(e, now) ? `Llueve: ${intensidad(e.lluvia!.min)}` : 'Sin lluvia ahora' },
    temp: f('temp') ?? { valor: num(e.temp!.v, 1), unidad: '°C', nota: 'Temperatura del aire' },
    hum: f('hum') ?? { valor: num(e.hum!.v, 0), unidad: '%', nota: 'Humedad relativa' },
    viento: f('viento') ?? { valor: num(e.viento!.v, 1), unidad: 'm/s', nota: e.viento!.dir === null ? 'Sin dirección' : `Del ${rumbo(e.viento!.dir)} (${e.viento!.dir}°)` },
  };
}

/** Tope de las barras de una lista: fijo donde la escala es natural, el mayor valor donde no. */
export function tope(v: Variable, valores: number[]): number {
  const max = valores.length ? Math.max(...valores) : 0;
  return v === 'hum' ? 100 : v === 'temp' ? Math.max(25, max) : v === 'viento' ? Math.max(6, max) : Math.max(5, max);
}

export function filaEstacion(e: Estacion, v: Variable, now: number, sub = e.localidad): Fila {
  const x = valor(e, v, now);
  return {
    href: `#/estacion/${e.id}`, nombre: e.nombre, sub, v: x, estacion: e.id,
    txt: x === null ? 'sin dato' : num(x, META[v].dec), llueve: llueve(e, now),
  };
}

export function filaLocalidad(l: Localidad, v: Variable): Fila {
  const x = l[v];
  const n = l.estaciones.length;
  return {
    href: `#/localidad/${encodeURIComponent(l.nombre)}`, nombre: l.nombre, sub: `${n} ${n === 1 ? 'estación' : 'estaciones'}`,
    v: x, txt: x === null ? 'sin dato' : num(x, META[v].dec), llueve: l.lloviendo > 0,
  };
}
