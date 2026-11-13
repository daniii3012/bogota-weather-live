/**
 * Contrato del intermediario (v1): lo que la página recibe. Copia del archivo del mismo nombre en el
 * repositorio del intermediario; se cambian juntos. Todos los tiempos van en segundos Unix.
 */

export type Variable = 'lluvia' | 'temp' | 'hum' | 'viento';

/** Valor con su hora de lectura. */
export interface Lectura { v: number; t: number }

/** Lluvia: milímetros del último minuto y acumulado desde las 00:00. */
export interface Lluvia { min: number; hoy: number; t: number }

/** Viento: metros por segundo y dirección de donde sopla, en grados desde el norte. */
export interface Viento { v: number; dir: number | null; t: number }

export interface Estacion {
  id: number;
  nombre: string;
  localidad: string;
  lat: number;
  lon: number;
  /** Metros sobre el nivel del mar; `null` si el origen no la trae. */
  alt: number | null;
  lluvia: Lluvia | null;
  temp: Lectura | null;
  hum: Lectura | null;
  viento: Viento | null;
  /** Hectopascales, en las pocas estaciones con barómetro. */
  presion: number | null;
}

/** Estado de una fuente: cuándo se leyó del origen y si esa copia es la vigente. */
export interface Fuente { t: number; ok: boolean }

export interface Ahora {
  t: number;
  fuentes: Record<Variable, Fuente | null>;
  estaciones: Estacion[];
}

export interface Serie {
  id: number;
  variable: Variable | 'nivel';
  /** Segundos entre puntos: 300 en lluvia (suma del intervalo), 60 en el resto. En `nivel` los valores
   * son la cota del espejo de agua. */
  paso: number;
  /** [tiempo, valor], del más antiguo al más reciente. */
  puntos: [number, number][];
  /** Solo en lluvia: milímetros de los últimos 10, 30 y 60 minutos y del día. */
  acum?: { m10: number; m30: number; m60: number; dia: number };
}

export interface Radar {
  t: number;
  /** Oeste, sur, este, norte. */
  limites: [number, number, number, number];
  cuadros: { t: number; url: string }[];
}

export type EstadoNivel = 'normal' | 'bajo' | 'medio' | 'alto' | 'sin-umbral' | 'sin-dato';

export interface Rio {
  id: number;
  nombre: string;
  cauce: string;
  localidad: string;
  lat: number;
  lon: number;
  /** Cota del espejo de agua, en metros sobre el nivel del mar. */
  cota: number | null;
  /** Borde libre: metros que faltan para el desbordamiento. */
  borde: number | null;
  t: number | null;
  estado: EstadoNivel;
  umbrales: { bajo: number | null; medio: number | null; alto: number | null; desborde: number | null };
}

export interface Niveles { t: number; rios: Rio[] }

export interface PoligonoAlerta<P> { type: 'Feature'; properties: P; geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown } }

export interface Alertas {
  t: number;
  /** Probabilidad de deslizamiento por lluvia: 2 baja, 3 media, 4 alta. */
  deslizamientos: { fecha: number | null; features: PoligonoAlerta<{ nivel: number; sector: string; localidad: string }>[] };
  /** Días sin lluvia en los últimos 7 (zonas propensas a incendios de la cobertura vegetal). */
  sequia: { fecha: number | null; features: PoligonoAlerta<{ dias: number }>[] };
}

export interface Estado {
  modo: string;
  t: number;
  fuentes: Record<string, { t: number | null; ok: boolean; error: string | null; reintento: number | null }>;
}
