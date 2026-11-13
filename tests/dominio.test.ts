import { describe, expect, it } from 'vitest';
import type { Estacion, Serie } from '../src/live/contract';
import { CORTES, clase, color, rampa, rotulos, tinta } from '../src/domain/scales';
import { frase, intensa, orden, porLocalidad, resumen } from '../src/domain/stats';
import { intensidad, llueve, rumbo, valor, vigente } from '../src/domain/variables';
import { cercano, distancia, enBogota, km } from '../src/domain/geo';
import { cuando, hace, hora, num } from '../src/domain/fmt';
import { eje, horas, paso } from '../src/charts/escala';
import { href, parse } from '../src/app/router';

const NOW = Date.UTC(2026, 10, 13, 3, 30) / 1000; // 22:30 del 12 nov. en Bogotá

function est(p: Partial<Estacion> & { id: number }): Estacion {
  return { nombre: `E${p.id}`, localidad: 'Usme', lat: 4.5, lon: -74.1, alt: null, lluvia: null, temp: null, hum: null, viento: null, presion: null, ...p };
}
const lluvia = (min: number, hoy: number, edad = 60) => ({ min, hoy, t: NOW - edad });

describe('escalas', () => {
  it('clasifica en los tramos oficiales de lluvia', () => {
    expect([0.1, 10, 10.1, 30, 30.1, 50, 50.1].map((v) => clase('lluvia', v))).toEqual([0, 0, 1, 1, 2, 2, 3]);
  });
  it('cada escala tiene un color por clase en los dos temas', () => {
    for (const e of ['lluvia', 'temp', 'hum', 'viento', 'sequia'] as const) {
      for (const t of ['dark', 'light'] as const) expect(rampa(e, t)).toHaveLength(CORTES[e].length + 1);
      expect(rotulos(e)).toHaveLength(CORTES[e].length + 1);
    }
  });
  it('la temperatura templada es gris en los dos temas (punto medio neutro)', () => {
    expect(color('temp', 14, 'dark')).toBe('#6f757b');
    expect(color('temp', 14, 'light')).toBe('#999fa6');
  });
  it('la tinta dentro de un relleno contrasta con él', () => {
    expect(tinta('#cae0fd')).toBe('#0b0e11');
    expect(tinta('#1f68bc')).toBe('#ffffff');
  });
  it('rotula con coma decimal', () => {
    expect(rotulos('viento')).toEqual(['≤ 1,5', '1,5–3,5', '3,5–5,5', '5,5–8', '> 8']);
  });
});

describe('variables', () => {
  it('una lectura de más de media hora no cuenta como actual', () => {
    expect(vigente(NOW - 29 * 60, NOW)).toBe(true);
    expect(vigente(NOW - 31 * 60, NOW)).toBe(false);
    expect(valor(est({ id: 1, temp: { v: 12, t: NOW - 3600 } }), 'temp', NOW)).toBeNull();
    expect(valor(est({ id: 1, lluvia: lluvia(0, 4.2) }), 'lluvia', NOW)).toBe(4.2);
  });
  it('llueve solo si el último minuto trae lluvia y la lectura es actual', () => {
    expect(llueve(est({ id: 1, lluvia: lluvia(0.2, 3) }), NOW)).toBe(true);
    expect(llueve(est({ id: 1, lluvia: lluvia(0, 3) }), NOW)).toBe(false);
    expect(llueve(est({ id: 1, lluvia: lluvia(0.2, 3, 3600) }), NOW)).toBe(false);
  });
  it('dice la intensidad y el rumbo en palabras', () => {
    expect([0.02, 0.1, 0.5, 1].map(intensidad)).toEqual(['ligera', 'moderada', 'fuerte', 'muy fuerte']);
    expect([0, 44, 90, 211, 359].map(rumbo)).toEqual(['norte', 'noreste', 'este', 'suroeste', 'norte']);
  });
});

describe('resúmenes', () => {
  const es = [
    est({ id: 1, localidad: 'Usme', lluvia: lluvia(0.5, 30), temp: { v: 9, t: NOW - 60 } }),
    est({ id: 2, localidad: 'Usme', lluvia: lluvia(0.1, 12), temp: { v: 10, t: NOW - 60 } }),
    est({ id: 3, localidad: 'Suba', lluvia: lluvia(0, 2), temp: { v: 14, t: NOW - 60 }, viento: { v: 3, dir: 90, t: NOW - 60 } }),
    est({ id: 4, localidad: 'Suba', lluvia: lluvia(0.3, 50, 7200) }), // lectura vieja: no cuenta
  ];
  it('cuenta dónde llueve y encuentra los extremos', () => {
    const r = resumen(es, NOW);
    expect(r.conLluvia).toBe(3);
    expect(r.lloviendo.map((e) => e.id)).toEqual([1, 2]);
    expect(r.maxHoy?.id).toBe(1);
    expect(r.temp.min?.id).toBe(1);
    expect(r.temp.max?.id).toBe(3);
    expect(r.temp.media).toBe(11);
    expect(r.viento.max?.id).toBe(3);
    expect(r.ultima).toBe(NOW - 60);
  });
  it('dice el estado de la ciudad en una frase', () => {
    expect(frase(resumen(es, NOW))).toEqual({ titulo: 'Llueve en 2 estaciones', detalle: 'En Usme.' });
    const seco = es.map((e) => ({ ...e, lluvia: e.lluvia && { ...e.lluvia, min: 0 } }));
    expect(frase(resumen(seco, NOW)).titulo).toBe('Sin lluvia en la ciudad');
    expect(frase(resumen([], NOW)).titulo).toBe('Sin datos de lluvia');
  });
  it('agrupa por localidad', () => {
    const l = porLocalidad(es, NOW);
    expect(l.map((x) => x.nombre)).toEqual(['Suba', 'Usme']);
    expect(l[1]).toMatchObject({ lloviendo: 2, lluvia: 30, temp: 9.5, viento: null });
    expect(l[0]).toMatchObject({ lloviendo: 0, lluvia: 2 });
  });
  it('ordena de mayor a menor y deja fuera lo que no tiene dato', () => {
    expect(orden(es, 'lluvia', NOW).map((x) => x.e.id)).toEqual([1, 2, 3]);
    expect(orden(es, 'viento', NOW).map((x) => x.e.id)).toEqual([3]);
  });
  it('lluvia intensa: 5 mm en cinco minutos durante la última hora', () => {
    const s = (v: number, edad: number): Serie => ({ id: 1, variable: 'lluvia', paso: 300, puntos: [[NOW - edad, v]] });
    expect(intensa(s(5, 600), NOW)).toBe(true);
    expect(intensa(s(4.9, 600), NOW)).toBe(false);
    expect(intensa(s(8, 7200), NOW)).toBe(false);
  });
});

describe('distancias', () => {
  it('mide en kilómetros y encuentra el más cercano', () => {
    const bolivar = { lat: 4.5981, lon: -74.0761 }, usaquen = { lat: 4.6947, lon: -74.0306 };
    expect(distancia(bolivar, usaquen)).toBeGreaterThan(11);
    expect(distancia(bolivar, usaquen)).toBeLessThan(12.5);
    const c = cercano([{ id: 'a', ...usaquen }, { id: 'b', lat: 4.6, lon: -74.08 }], bolivar);
    expect(c?.x.id).toBe('b');
    expect(cercano([{ id: 'a', ...usaquen }], bolivar, () => false)).toBeNull();
  });
  it('reconoce lo que queda fuera de Bogotá y escribe distancias', () => {
    expect(enBogota({ lat: 4.65, lon: -74.08 })).toBe(true);
    expect(enBogota({ lat: 6.25, lon: -75.56 })).toBe(false);
    expect([0.35, 2.44].map(km)).toEqual(['350 m', '2,4 km']);
  });
});

describe('formato', () => {
  it('escribe cifras con coma y horas de Bogotá', () => {
    expect(num(12.345, 1)).toBe('12,3');
    expect(num(-0.01, 1)).toBe('0,0');
    expect(num(null)).toBe('—');
    expect(hora(NOW)).toBe('22:30');
    expect(cuando(NOW - 60, NOW)).toBe('22:29');
    expect(cuando(NOW - 86400, NOW)).toBe('11 de nov 22:30');
  });
  it('dice la edad en palabras', () => {
    expect([30, 180, 7200, 3 * 86400].map(hace)).toEqual(['hace un momento', 'hace 3 min', 'hace 2 h', 'hace 3 días']);
  });
});

describe('ejes', () => {
  it('usa pasos redondos y arranca en cero cuando se pide', () => {
    expect(paso(9, 3)).toBe(5);
    expect(eje(0, 4.3, 3, true)).toEqual({ min: 0, max: 6, marcas: [0, 2, 4, 6] });
    const e = eje(10.9, 15.5, 3);
    expect(e.min).toBeLessThanOrEqual(10.9);
    expect(e.max).toBeGreaterThanOrEqual(15.5);
  });
  it('marca las horas en punto de Bogotá', () => {
    expect(horas(NOW - 3 * 3600, NOW).map(hora)).toEqual(['20:00', '21:00', '22:00']);
    expect(horas(NOW - 12 * 3600, NOW, 6).map(hora)).toEqual(['12:00', '18:00']);
  });
});

describe('rutas', () => {
  it('cada vista tiene su dirección', () => {
    for (const v of [{ kind: 'home' }, { kind: 'estacion', id: '1500' }, { kind: 'localidad', id: 'Ciudad Bolívar' }, { kind: 'rios' }, { kind: 'pronostico' }] as const) {
      expect(parse(href(v))).toEqual(v);
    }
    expect(parse('#/no-existe')).toEqual({ kind: 'home' });
    expect(parse('#/estacion')).toEqual({ kind: 'home' });
  });
});
