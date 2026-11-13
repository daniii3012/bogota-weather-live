/**
 * Capas propias sobre el mapa base, de abajo hacia arriba: satélite, localidades (relleno), alertas,
 * radar, localidades (borde y nombre), pulso de lluvia, estaciones, viento, ríos, selección y
 * ubicación. Cada método recibe datos del contrato y deja el mapa al día; no guarda más estado.
 */
import type { GeoJSONSource, ImageSource, Map as MLMap, RasterTileSource } from 'maplibre-gl';
import type { Alertas, Estacion, EstadoNivel, Rio, Variable } from '../live/contract';
import { ESTADO, NEUTRO, clase, color, rampa, tinta, type Escala, type Tema } from '../domain/scales';
import { llueve, valor } from '../domain/variables';
import { num } from '../domain/fmt';
import { PALETTES, applyBaseTheme } from './style';
import { etiqueta, flecha, rombo } from './iconos';

type FC = GeoJSON.FeatureCollection;
const VACIO: FC = { type: 'FeatureCollection', features: [] };
const FUENTE = ['Noto Sans Bold'];

/** Color y rótulo de cada estado de un río. */
export const ESTADO_RIO: Record<EstadoNivel, { color: string | null; texto: string }> = {
  normal: { color: ESTADO.ok, texto: 'Normal' },
  bajo: { color: ESTADO.warn, texto: 'Alerta baja' },
  medio: { color: ESTADO.serious, texto: 'Alerta media' },
  alto: { color: ESTADO.critical, texto: 'Alerta alta' },
  'sin-umbral': { color: null, texto: 'Sin umbrales' },
  'sin-dato': { color: null, texto: 'Sin datos' },
};

/** Probabilidad de deslizamiento por lluvia (niveles 2 a 4 del modelo del IDIGER). */
export const NIVEL_DESLIZ: Record<number, { color: string; texto: string }> = {
  2: { color: ESTADO.warn, texto: 'Baja' },
  3: { color: ESTADO.serious, texto: 'Media' },
  4: { color: ESTADO.critical, texto: 'Alta' },
};

/** Capas que responden al toque, de arriba hacia abajo. */
export const TOCABLES = ['est-valor', 'est-flecha', 'est-punto', 'rios-punto'];

export class Capas {
  private map: MLMap;
  private tema: Tema;
  private pulso = 0;
  private hayLluvia = false;
  private quieto = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor(map: MLMap, tema: Tema) {
    this.map = map;
    this.tema = tema;
  }

  private get fondo() { return PALETTES[this.tema].bg; }
  private get tintaMapa() { return this.tema === 'dark' ? '#e9ecef' : '#12171c'; }
  private get tenue() { return this.tema === 'dark' ? '#8a949f' : '#5f6872'; }
  private get azul() { return this.tema === 'dark' ? '#3987e5' : '#2a78d6'; }

  private geo(id: string) { return this.map.getSource(id) as GeoJSONSource | undefined; }

  /** Imágenes de todas las clases de color del tema: una etiqueta y una flecha por color. */
  private imagenes() {
    const m = this.map, f = this.fondo;
    const colores = new Set<string>([NEUTRO[this.tema]]);
    for (const e of ['lluvia', 'temp', 'hum', 'viento'] as Escala[]) for (const c of rampa(e, this.tema)) colores.add(c);
    for (const c of colores) etiqueta(m, `et:${c}`, c, f);
    for (const c of [...rampa('viento', this.tema), NEUTRO[this.tema]]) flecha(m, `fl:${c}`, c, f);
    for (const [estado, { color: c }] of Object.entries(ESTADO_RIO)) rombo(m, `ro:${estado}`, c ?? NEUTRO[this.tema], f);
  }

  montar() {
    const m = this.map;
    this.imagenes();
    for (const id of ['est', 'rios', 'desliz', 'sequia', 'yo', 'loc']) m.addSource(id, { type: 'geojson', data: VACIO });

    // ── Localidades (relleno): invisible salvo al resaltar; recibe el toque.
    m.addLayer({
      id: 'loc-relleno', type: 'fill', source: 'loc',
      paint: { 'fill-color': this.tintaMapa, 'fill-opacity': ['case', ['boolean', ['feature-state', 'activa'], false], 0.1, 0] },
    });
    // ── Alertas.
    m.addLayer({
      id: 'sequia-relleno', type: 'fill', source: 'sequia', layout: { visibility: 'none' },
      paint: { 'fill-color': ['get', 'color'], 'fill-opacity': ['get', 'opacidad'], 'fill-outline-color': this.fondo },
    });
    m.addLayer({
      id: 'desliz-relleno', type: 'fill', source: 'desliz', layout: { visibility: 'none' },
      paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.5 },
    });
    m.addLayer({
      id: 'desliz-linea', type: 'line', source: 'desliz', layout: { visibility: 'none' },
      paint: { 'line-color': ['get', 'color'], 'line-width': 1.5 },
    });
    // ── Localidades (borde y nombre). El radar y el satélite entran por debajo de esta capa.
    m.addLayer({
      id: 'loc-linea', type: 'line', source: 'loc',
      paint: { 'line-color': this.tenue, 'line-opacity': 0.55, 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.6, 13, 1.4] },
    });
    m.addLayer({
      id: 'loc-nombre', type: 'symbol', source: 'loc', minzoom: 9.6, maxzoom: 13.2,
      layout: {
        'text-field': ['get', 'nombre'], 'text-font': ['Noto Sans Regular'], 'text-transform': 'uppercase',
        'text-letter-spacing': 0.14, 'text-size': ['interpolate', ['linear'], ['zoom'], 10, 9.5, 13, 12], 'text-max-width': 7,
      },
      paint: { 'text-color': this.tenue, 'text-halo-color': this.fondo, 'text-halo-width': 1.4 },
    });
    // Los nombres de municipios del mapa base suben encima del radar y del satélite.
    if (m.getLayer('place-town')) m.moveLayer('place-town');

    // ── Estaciones.
    m.addLayer({
      id: 'est-pulso', type: 'circle', source: 'est', filter: ['==', ['get', 'llueve'], 1],
      paint: { 'circle-color': this.azul, 'circle-radius': 10, 'circle-opacity': this.quieto ? 0.3 : 0, 'circle-stroke-width': 0 },
    });
    m.addLayer({
      id: 'est-punto', type: 'circle', source: 'est', filter: ['!=', ['get', 'modo'], 'flecha'],
      paint: {
        'circle-color': ['get', 'color'],
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, ['case', ['==', ['get', 'modo'], 'vacio'], 2.8, 3.4], 13, ['case', ['==', ['get', 'modo'], 'vacio'], 4, 5.2]],
        'circle-stroke-color': this.fondo, 'circle-stroke-width': 2,
      },
    });
    m.addLayer({
      id: 'est-flecha', type: 'symbol', source: 'est', filter: ['==', ['get', 'modo'], 'flecha'],
      layout: {
        'icon-image': ['get', 'img'], 'icon-rotate': ['get', 'giro'], 'icon-rotation-alignment': 'map',
        'icon-size': ['get', 'talla'], 'icon-allow-overlap': true, 'icon-ignore-placement': true,
        'text-field': ['get', 'txt'], 'text-font': FUENTE, 'text-size': 11, 'text-offset': [0, 1.5], 'text-anchor': 'top', 'text-optional': true,
      },
      paint: { 'text-color': this.tintaMapa, 'text-halo-color': this.fondo, 'text-halo-width': 1.6 },
    });
    // Etiqueta con el valor, flotando sobre el punto. Las que no caben se omiten (queda el punto);
    // entran primero las de mayor valor.
    m.addLayer({
      id: 'est-valor', type: 'symbol', source: 'est', filter: ['==', ['get', 'modo'], 'valor'],
      layout: {
        'icon-image': ['get', 'img'], 'icon-text-fit': 'both', 'icon-text-fit-padding': [1, 4, 1, 4],
        'text-field': ['get', 'txt'], 'text-font': FUENTE, 'text-size': 11, 'text-anchor': 'bottom', 'text-offset': [0, -0.75],
        'symbol-sort-key': ['get', 'orden'], 'text-padding': 1,
      },
      paint: { 'text-color': ['get', 'tinta'] },
    });
    // ── Ríos.
    m.addLayer({
      id: 'rios-punto', type: 'symbol', source: 'rios', layout: {
        visibility: 'none', 'icon-image': ['get', 'img'], 'icon-allow-overlap': true, 'icon-ignore-placement': true,
        'text-field': ['step', ['zoom'], '', 11.3, ['get', 'nombre']], 'text-font': ['Noto Sans Regular'], 'text-size': 11,
        'text-anchor': 'top', 'text-offset': [0, 1], 'text-optional': true, 'text-max-width': 8,
      },
      paint: { 'text-color': this.tintaMapa, 'text-halo-color': this.fondo, 'text-halo-width': 1.6 },
    });
    // ── Selección y ubicación.
    m.addLayer({
      id: 'est-sel', type: 'circle', source: 'est', filter: ['==', ['get', 'id'], -1],
      paint: { 'circle-radius': 13, 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': this.tintaMapa, 'circle-stroke-width': 2 },
    });
    m.addLayer({
      id: 'yo-halo', type: 'circle', source: 'yo',
      paint: { 'circle-radius': 16, 'circle-color': this.tintaMapa, 'circle-opacity': 0.14 },
    });
    m.addLayer({
      id: 'yo-punto', type: 'circle', source: 'yo',
      paint: { 'circle-radius': 5.5, 'circle-color': this.tintaMapa, 'circle-stroke-color': this.fondo, 'circle-stroke-width': 2.5 },
    });
    this.animar();
  }

  /** Pulso de las estaciones con lluvia: un anillo que crece y se desvanece. */
  private animar() {
    if (this.quieto) return;
    let antes = 0;
    const paso = (ms: number) => {
      this.pulso = requestAnimationFrame(paso);
      if (ms - antes < 33 || !this.hayLluvia || document.hidden || !this.map.getLayer('est-pulso')) return;
      antes = ms;
      const k = (ms % 1800) / 1800, e = 1 - (1 - k) ** 2;
      this.map.setPaintProperty('est-pulso', 'circle-radius', 5 + e * 15);
      this.map.setPaintProperty('est-pulso', 'circle-opacity', 0.42 * (1 - k));
    };
    this.pulso = requestAnimationFrame(paso);
  }

  desmontar() { cancelAnimationFrame(this.pulso); }

  ponerTema(tema: Tema) {
    this.tema = tema;
    const m = this.map, set = (id: string, p: string, v: unknown) => m.getLayer(id) && m.setPaintProperty(id, p as never, v as never);
    applyBaseTheme(m, tema);
    this.imagenes();
    set('loc-relleno', 'fill-color', this.tintaMapa);
    set('loc-linea', 'line-color', this.tenue);
    for (const id of ['loc-nombre', 'est-flecha', 'rios-punto']) set(id, 'text-halo-color', this.fondo);
    set('loc-nombre', 'text-color', this.tenue);
    for (const id of ['est-flecha', 'rios-punto']) set(id, 'text-color', this.tintaMapa);
    set('est-pulso', 'circle-color', this.azul);
    set('est-punto', 'circle-stroke-color', this.fondo);
    set('est-sel', 'circle-stroke-color', this.tintaMapa);
    set('yo-halo', 'circle-color', this.tintaMapa);
    set('yo-punto', 'circle-color', this.tintaMapa);
    set('yo-punto', 'circle-stroke-color', this.fondo);
    set('sequia-relleno', 'fill-outline-color', this.fondo);
  }

  /** Estaciones con el valor de la variable elegida. */
  estaciones(lista: Estacion[], variable: Variable, now: number) {
    const neutro = NEUTRO[this.tema];
    let lluvia = false;
    // Solo las estaciones que miden esta variable: las demás no tienen nada que decir aquí.
    const features: GeoJSON.Feature[] = lista.filter((e) => e[variable] !== null).map((e) => {
      const v = valor(e, variable, now);
      const ll = variable === 'lluvia' && llueve(e, now);
      lluvia ||= ll;
      // Sin dato, o sin lluvia en el día: punto gris, sin etiqueta.
      const vacio = v === null || (variable === 'lluvia' && v <= 0);
      const c = vacio ? neutro : color(variable, v, this.tema);
      const p: Record<string, unknown> = { id: e.id, nombre: e.nombre, color: c, llueve: ll ? 1 : 0, modo: vacio ? 'vacio' : 'valor' };
      if (!vacio) {
        p.txt = variable === 'temp' ? `${num(v, 1)}°` : num(v, variable === 'hum' ? 0 : 1);
        p.tinta = tinta(c);
        p.img = `et:${c}`;
        p.orden = -v;
        if (variable === 'viento' && e.viento?.dir != null) {
          p.modo = 'flecha';
          p.img = `fl:${c}`;
          // La dirección es de donde sopla; la flecha apunta hacia donde va.
          p.giro = (e.viento.dir + 180) % 360;
          p.talla = 0.75 + 0.14 * clase('viento', v);
        }
      }
      return { type: 'Feature', properties: p, geometry: { type: 'Point', coordinates: [e.lon, e.lat] } };
    });
    this.hayLluvia = lluvia;
    this.geo('est')?.setData({ type: 'FeatureCollection', features });
  }

  seleccion(id: number | null) {
    if (this.map.getLayer('est-sel')) this.map.setFilter('est-sel', ['==', ['get', 'id'], id ?? -1]);
  }

  /** Cuadro del radar: una imagen georreferenciada. `null` lo quita. */
  radar(url: string | null, limites: [number, number, number, number] | null, opacidad: number) {
    const m = this.map, src = m.getSource('radar') as ImageSource | undefined;
    if (!url || !limites) {
      if (m.getLayer('radar')) m.setLayoutProperty('radar', 'visibility', 'none');
      return;
    }
    const [o, s, e, n] = limites;
    const coordinates: [[number, number], [number, number], [number, number], [number, number]] = [[o, n], [e, n], [e, s], [o, s]];
    if (!src) {
      m.addSource('radar', { type: 'image', url, coordinates });
      m.addLayer({ id: 'radar', type: 'raster', source: 'radar', paint: { 'raster-opacity': opacidad, 'raster-fade-duration': 0, 'raster-resampling': 'linear' } }, 'loc-linea');
    } else {
      src.updateImage({ url, coordinates });
      m.setLayoutProperty('radar', 'visibility', 'visible');
      m.setPaintProperty('radar', 'raster-opacity', opacidad);
    }
  }

  /** Imagen del satélite como teselas. `null` la quita. */
  satelite(teselas: string | null, zoomMax = 6) {
    const m = this.map, src = m.getSource('sat') as RasterTileSource | undefined;
    if (!teselas) {
      if (m.getLayer('sat')) { m.removeLayer('sat'); m.removeSource('sat'); }
      return;
    }
    if (src && (src as unknown as { maxzoom: number }).maxzoom === zoomMax) { src.setTiles([teselas]); return; }
    if (m.getLayer('sat')) { m.removeLayer('sat'); m.removeSource('sat'); }
    m.addSource('sat', {
      type: 'raster', tiles: [teselas], tileSize: 256, maxzoom: zoomMax,
      attribution: '<a href="https://www.earthdata.nasa.gov/engage/open-data-services-software/earthdata-developer-portal/gibs-api" target="_blank" rel="noopener">NASA GIBS</a> · NOAA GOES-19',
    });
    m.addLayer({ id: 'sat', type: 'raster', source: 'sat', paint: { 'raster-opacity': 0.9, 'raster-fade-duration': 0 } }, 'loc-relleno');
  }

  localidades(visibles: boolean) {
    for (const id of ['loc-linea', 'loc-nombre']) if (this.map.getLayer(id)) this.map.setLayoutProperty(id, 'visibility', visibles ? 'visible' : 'none');
  }

  private loc: FC = VACIO;
  private activa: number | null = null;

  /** Polígonos de las localidades (se cargan una vez, aparte del mapa base). */
  cargarLocalidades(fc: FC) {
    this.loc = fc;
    this.geo('loc')?.setData(fc);
  }

  /** Resalta una localidad por nombre (o ninguna) y devuelve su encuadre. */
  localidadActiva(nombre: string | null): [[number, number], [number, number]] | null {
    const m = this.map;
    if (this.activa !== null) m.setFeatureState({ source: 'loc', id: this.activa }, { activa: false });
    this.activa = null;
    const f = nombre ? this.loc.features.find((x) => x.properties?.nombre === nombre) : undefined;
    if (!f) return null;
    this.activa = f.id as number;
    m.setFeatureState({ source: 'loc', id: this.activa }, { activa: true });
    return caja(f.geometry);
  }

  rios(lista: Rio[] | null) {
    const m = this.map;
    if (m.getLayer('rios-punto')) m.setLayoutProperty('rios-punto', 'visibility', lista ? 'visible' : 'none');
    this.geo('rios')?.setData(!lista ? VACIO : {
      type: 'FeatureCollection',
      features: lista.map((r) => ({ type: 'Feature', properties: { rio: r.id, nombre: r.nombre, img: `ro:${r.estado}` }, geometry: { type: 'Point', coordinates: [r.lon, r.lat] } })),
    });
  }

  alertas(a: Alertas | null, ver: { deslizamientos: boolean; sequia: boolean }) {
    const m = this.map, vis = (id: string, on: boolean) => m.getLayer(id) && m.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
    vis('desliz-relleno', ver.deslizamientos); vis('desliz-linea', ver.deslizamientos); vis('sequia-relleno', ver.sequia);
    if (!a) return;
    this.geo('desliz')?.setData({
      type: 'FeatureCollection',
      features: a.deslizamientos.features.map((f) => ({ ...f, properties: { ...f.properties, color: NIVEL_DESLIZ[f.properties.nivel]?.color ?? ESTADO.warn } })) as GeoJSON.Feature[],
    });
    this.geo('sequia')?.setData({
      type: 'FeatureCollection',
      // Pocos días sin lluvia no son noticia: esa clase casi no se pinta y la opacidad crece con la sequía.
      features: a.sequia.features.map((f) => ({ ...f, properties: { ...f.properties, color: color('sequia', f.properties.dias, this.tema), opacidad: [0.08, 0.3, 0.45, 0.6][clase('sequia', f.properties.dias)] } })) as GeoJSON.Feature[],
    });
  }

  yo(p: { lat: number; lon: number } | null) {
    this.geo('yo')?.setData(p ? { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [p.lon, p.lat] } }] } : VACIO);
  }
}

/** Caja que encierra una geometría: [[oeste, sur], [este, norte]]. */
function caja(g: GeoJSON.Geometry): [[number, number], [number, number]] | null {
  let o = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  const ver = (c: unknown): void => {
    if (Array.isArray(c) && typeof c[0] === 'number') {
      const [x, y] = c as number[];
      if (x < o) o = x; if (x > e) e = x; if (y < s) s = y; if (y > n) n = y;
    } else if (Array.isArray(c)) c.forEach(ver);
  };
  if ('coordinates' in g) ver(g.coordinates);
  return Number.isFinite(o) ? [[o, s], [e, n]] : null;
}

