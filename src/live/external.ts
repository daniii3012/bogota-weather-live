/**
 * Fuentes que la página consulta directamente (traen CORS y caché propios): el pronóstico de
 * Open-Meteo y las imágenes de GOES-19 que sirve NASA GIBS.
 */

// ── Pronóstico ──────────────────────────────────────────────────────────────────────────────
export interface Pronostico {
  /** Cuándo se pidió (segundos Unix). */
  t: number;
  horas: { t: number; temp: number; prob: number; mm: number; codigo: number }[];
  dias: { t: number; min: number; max: number; mm: number; prob: number; codigo: number }[];
}

const CENTRO = { lat: 4.65, lon: -74.08 };
const KEY_PRON = 'bwl:pronostico:v1';
const VIGENCIA_PRON = 30 * 60;

export async function pronostico(now: number): Promise<Pronostico> {
  try {
    const guardado = JSON.parse(localStorage.getItem(KEY_PRON) ?? 'null') as Pronostico | null;
    if (guardado && now - guardado.t < VIGENCIA_PRON) return guardado;
  } catch { /* sin almacenamiento */ }
  const q = new URLSearchParams({
    latitude: String(CENTRO.lat), longitude: String(CENTRO.lon),
    hourly: 'temperature_2m,precipitation_probability,precipitation,weather_code',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max',
    timezone: 'America/Bogota', timeformat: 'unixtime', forecast_days: '7',
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${q}`, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`pronóstico ${res.status}`);
  const d = (await res.json()) as { hourly: Record<string, number[]>; daily: Record<string, number[]> };
  const h = d.hourly, dd = d.daily;
  const out: Pronostico = {
    t: Math.round(now),
    horas: h.time.map((t, i) => ({ t, temp: h.temperature_2m[i], prob: h.precipitation_probability[i] ?? 0, mm: h.precipitation[i] ?? 0, codigo: h.weather_code[i] })),
    dias: dd.time.map((t, i) => ({ t, min: dd.temperature_2m_min[i], max: dd.temperature_2m_max[i], mm: dd.precipitation_sum[i] ?? 0, prob: dd.precipitation_probability_max[i] ?? 0, codigo: dd.weather_code[i] })),
  };
  try { localStorage.setItem(KEY_PRON, JSON.stringify(out)); } catch { /* sin almacenamiento */ }
  return out;
}

export type Cielo = 'despejado' | 'parcial' | 'nublado' | 'niebla' | 'llovizna' | 'lluvia' | 'aguacero' | 'tormenta';

/** Código de tiempo de la OMM → qué cielo es y cómo se dice. */
export function cielo(codigo: number): { tipo: Cielo; texto: string } {
  if (codigo === 0) return { tipo: 'despejado', texto: 'Despejado' };
  if (codigo <= 2) return { tipo: 'parcial', texto: 'Parcialmente nublado' };
  if (codigo === 3) return { tipo: 'nublado', texto: 'Nublado' };
  if (codigo <= 48) return { tipo: 'niebla', texto: 'Niebla' };
  if (codigo <= 57) return { tipo: 'llovizna', texto: 'Llovizna' };
  if (codigo <= 65) return { tipo: 'lluvia', texto: codigo === 65 ? 'Lluvia fuerte' : 'Lluvia' };
  if (codigo <= 77) return { tipo: 'lluvia', texto: 'Lluvia helada' };
  if (codigo <= 82) return { tipo: 'aguacero', texto: codigo === 82 ? 'Aguaceros fuertes' : 'Aguaceros' };
  return { tipo: 'tormenta', texto: 'Tormenta' };
}

// ── Satélite ────────────────────────────────────────────────────────────────────────────────
export type Producto = 'color' | 'ir';

export const PRODUCTOS: Record<Producto, { nombre: string; capa: string; matriz: string; zoom: number }> = {
  color: { nombre: 'Color', capa: 'GOES-East_ABI_GeoColor', matriz: 'GoogleMapsCompatible_Level7', zoom: 7 },
  ir: { nombre: 'Infrarrojo', capa: 'GOES-East_ABI_Band13_Clean_Infrared', matriz: 'GoogleMapsCompatible_Level6', zoom: 6 },
};

const GIBS = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best';
/** Segundos Unix → «2026-11-13T03:00:00Z» (sin milésimas: el servicio no las acepta). */
const iso = (t: number) => new Date(Math.round(t) * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z');

/** Plantilla de teselas de un producto en un instante (segundos Unix, múltiplo de 10 minutos). */
export function teselas(p: Producto, t: number | null): string {
  const d = PRODUCTOS[p];
  return `${GIBS}/${d.capa}/default/${t === null ? 'default' : iso(t)}/${d.matriz}/{z}/{y}/{x}.png`;
}

/** Instantes disponibles de un producto en las últimas horas, del más antiguo al más reciente. */
export async function tiemposSatelite(p: Producto, now: number, horas = 2): Promise<number[]> {
  const d = PRODUCTOS[p];
  // El intervalo va en múltiplos de diez minutos y sin codificar: así lo espera el servicio.
  const desde = Math.floor((now - horas * 3600 - 3600) / 600) * 600, hasta = Math.ceil((now + 600) / 600) * 600;
  const q = `SERVICE=WMTS&REQUEST=DescribeDomains&VERSION=1.0.0&LAYER=${d.capa}&TILEMATRIXSET=${d.matriz}&TIME=${iso(desde)}/${iso(hasta)}`;
  const res = await fetch(`${GIBS}/wmts.cgi?${q}`, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`satélite ${res.status}`);
  const dominio = /<Domain>([^<]*)<\/Domain>/.exec(await res.text())?.[1] ?? '';
  const out: number[] = [];
  for (const tramo of dominio.split(',')) {
    const [a, b] = tramo.split('/');
    const t0 = Date.parse(a) / 1000, t1 = Date.parse(b) / 1000;
    if (!Number.isFinite(t0) || !Number.isFinite(t1)) continue;
    for (let t = t0; t <= t1; t += 600) out.push(t);
  }
  return out.filter((t) => t >= now - horas * 3600 - 3600).slice(-(horas * 6));
}
