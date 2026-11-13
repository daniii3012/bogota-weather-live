/** Estado de la aplicación. Un solo objeto reactivo que leen las vistas y escribe el controlador. */
import type { Ahora, Alertas, Niveles, Radar, Variable } from '../live/contract';
import type { Producto, Pronostico } from '../live/external';
import { anotar, parse, type View } from './router';
import { effective, type Theme } from './theme';

export type Estado = 'conectando' | 'vivo' | 'viejo' | 'error' | 'pausa';

export interface Capas {
  radar: boolean;
  satelite: Producto | null;
  localidades: boolean;
  rios: boolean;
  deslizamientos: boolean;
  sequia: boolean;
}

interface Prefs {
  variable: Variable;
  capas: Capas;
  opacidadRadar: number;
  favoritas: number[];
}

const KEY = 'bwl:prefs:v1';
const KEY_DATOS = 'bwl:ahora:v1';
const POR_DEFECTO: Prefs = {
  variable: 'lluvia',
  capas: { radar: true, satelite: null, localidades: true, rios: false, deslizamientos: false, sequia: false },
  opacidadRadar: 0.75,
  favoritas: [],
};

function leerPrefs(): Prefs {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Prefs> | null;
    if (!p) return structuredClone(POR_DEFECTO);
    // El satélite no se recuerda: es una vista ocasional y cambia los límites del mapa.
    return { ...POR_DEFECTO, ...p, capas: { ...POR_DEFECTO.capas, ...p.capas, satelite: null } };
  } catch { return structuredClone(POR_DEFECTO); }
}

/** Últimos datos recibidos: se muestran al abrir sin conexión, con su edad. */
function leerDatos(): Ahora | null {
  try { return JSON.parse(localStorage.getItem(KEY_DATOS) ?? 'null') as Ahora | null; } catch { return null; }
}

/** Alto de la hoja inferior asomada (teléfono): la manija y las cuatro fichas. */
export const HOJA_ASOMADA = 198;

const inicial = (typeof location !== 'undefined' ? parse() : { kind: 'home' }) as View;
anotar(inicial);

const prefs = typeof localStorage !== 'undefined' ? leerPrefs() : structuredClone(POR_DEFECTO);

export const app = $state({
  view: inicial,
  /** ¿Se llegó a la vista actual retrocediendo? Entonces se muestra como se dejó. */
  atras: false,
  tema: (typeof document !== 'undefined' ? effective() : 'dark') as Theme,
  /** Segundos Unix; avanza cada 15 s para que las edades se actualicen solas. */
  now: Date.now() / 1000,
  narrow: typeof innerWidth !== 'undefined' ? innerWidth < 760 : false,
  sheetHeight: 0,
  topbarH: 0,

  variable: prefs.variable,
  capas: prefs.capas,
  opacidadRadar: prefs.opacidadRadar,
  favoritas: prefs.favoritas,

  datos: (typeof localStorage !== 'undefined' ? leerDatos() : null) as Ahora | null,
  estado: 'conectando' as Estado,

  radar: null as Radar | null,
  /** Cuadro del radar a la vista y si la animación corre. */
  cuadro: 0,
  animando: false,
  /** Cuadros ya descargados (los que se pueden mostrar sin esperar). */
  cuadrosListos: 0,

  /** Instantes del satélite y cuál está a la vista. */
  satTiempos: [] as number[],
  satIndice: 0,

  niveles: null as Niveles | null,
  alertas: null as Alertas | null,
  pronostico: null as Pronostico | null,
  pronosticoError: false,

  /** Estación resaltada desde una lista (al pasar el puntero). */
  resaltada: null as number | null,
  /** Ubicación del dispositivo, si se pidió. */
  yo: null as { lat: number; lon: number } | null,
  ubicando: false,
  aviso: null as string | null,

  buscando: false,
  capasAbiertas: false,
  /** Rumbo del mapa, para la brújula. */
  rumbo: 0,
});

export function guardarPrefs() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ variable: app.variable, capas: app.capas, opacidadRadar: app.opacidadRadar, favoritas: app.favoritas } satisfies Prefs));
  } catch { /* modo privado */ }
}

export function guardarDatos(d: Ahora) {
  try { localStorage.setItem(KEY_DATOS, JSON.stringify(d)); } catch { /* sin espacio */ }
}

export function alternarFavorita(id: number) {
  app.favoritas = app.favoritas.includes(id) ? app.favoritas.filter((x) => x !== id) : [...app.favoritas, id];
  guardarPrefs();
}

let avisoT: ReturnType<typeof setTimeout> | undefined;
/** Mensaje breve sobre el mapa. */
export function avisar(texto: string, ms = 4000) {
  app.aviso = texto;
  clearTimeout(avisoT);
  avisoT = setTimeout(() => (app.aviso = null), ms);
}
