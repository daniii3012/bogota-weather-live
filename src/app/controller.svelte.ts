/**
 * Controlador: trae los datos, mantiene el mapa al día con el estado y atiende lo que se hace sobre
 * el mapa. Las vistas solo leen `app` y llaman a estas funciones.
 */
import type { Map as MLMap, MapMouseEvent } from 'maplibre-gl';
import { api } from '../live/api';
import { PRODUCTOS, pronostico, teselas, tiemposSatelite, type Producto } from '../live/external';
import type { Estacion, Variable } from '../live/contract';
import { Capas, TOCABLES } from '../map/capas';
import { BOUNDS, HOME, REGION, SABANA, ZOOM_MIN, ZOOM_MIN_SAT } from '../map/MapView';
import { cercano, enBogota } from '../domain/geo';
import { resumen } from '../domain/stats';
import { valor } from '../domain/variables';
import { app, avisar, guardarDatos, guardarPrefs, type Capas as CapasEstado } from './store.svelte';
import { go, parse } from './router';
import { applyTheme, effective, onSystemChange, saveThemePref, type ThemePref } from './theme';

const CADA = { ahora: 60, radar: 60, niveles: 180, alertas: 1800 };
/** Con datos de más de cinco minutos, la página avisa que no está al día. */
const VIEJO_S = 5 * 60;
const LADO_RADAR = 1024;

export class Controller {
  /** Sin mapa (un navegador sin WebGL) los datos y el panel siguen funcionando. */
  private map: MLMap | null;
  private capas: Capas | null;
  private relojes: ReturnType<typeof setInterval>[] = [];
  private ultimo = { ahora: 0, radar: 0, niveles: 0, alertas: 0 };
  /** Cuadros del radar ya descargados: tiempo → dirección local de la imagen. */
  private cuadros = new Map<number, string>();
  private animacion: ReturnType<typeof setTimeout> | undefined;
  private parar: (() => void) | undefined;

  constructor(map: MLMap | null) {
    this.map = map;
    this.capas = map ? new Capas(map, app.tema) : null;
  }

  async start() {
    const map = this.map, capas = this.capas;
    if (map && capas) {
      capas.montar();
      void fetch('./geo/localidades.json').then((r) => r.json()).then((fc) => { capas.cargarLocalidades(fc); this.enfocar(); }).catch(() => undefined);
      map.on('click', (e) => this.toque(e));
      map.on('mousemove', (e) => { map.getCanvas().style.cursor = this.bajo(e) ? 'pointer' : ''; });
    }

    const alCambiarHash = () => (app.view = parse());
    const alVolver = () => { if (!document.hidden) this.refrescar(); };
    const alMedir = () => (app.narrow = innerWidth < 760);
    addEventListener('hashchange', alCambiarHash);
    addEventListener('resize', alMedir);
    document.addEventListener('visibilitychange', alVolver);
    addEventListener('online', alVolver);
    onSystemChange(() => this.tema());

    this.relojes.push(setInterval(() => { app.now = Date.now() / 1000; this.refrescar(); }, 15000));
    const quitar = $effect.root(() => this.efectos());
    this.parar = () => {
      quitar();
      removeEventListener('hashchange', alCambiarHash);
      removeEventListener('resize', alMedir);
      document.removeEventListener('visibilitychange', alVolver);
      removeEventListener('online', alVolver);
    };
    this.refrescar();
  }

  stop() {
    this.parar?.();
    this.relojes.forEach(clearInterval);
    clearTimeout(this.animacion);
    this.capas?.desmontar();
    for (const u of this.cuadros.values()) URL.revokeObjectURL(u);
  }

  /** El mapa sigue al estado: cada efecto vuelve a correr cuando cambia lo que lee. */
  private efectos() {
    const map = this.map, capas = this.capas;
    if (!map || !capas) return;
    $effect(() => { if (app.datos) capas.estaciones(app.datos.estaciones, app.variable, Math.floor(app.now / 60) * 60); });
    $effect(() => { capas.seleccion(app.view.kind === 'estacion' ? Number(app.view.id) : app.resaltada); });
    $effect(() => { void app.view; this.enfocar(); });
    $effect(() => { capas.localidades(app.capas.localidades); });
    $effect(() => { capas.yo(app.yo); });
    $effect(() => {
      const ver = app.capas.rios || app.view.kind === 'rios' || app.view.kind === 'rio';
      capas.rios(ver && app.niveles ? app.niveles.rios : null);
    });
    $effect(() => {
      capas.alertas(app.alertas, { deslizamientos: app.capas.deslizamientos, sequia: app.capas.sequia });
    });
    // Radar: el cuadro a la vista, si ya está descargado.
    $effect(() => {
      const r = app.radar, c = r?.cuadros[app.cuadro];
      void app.cuadrosListos;
      const url = app.capas.radar && c ? this.cuadros.get(c.t) : undefined;
      capas.radar(url ?? null, r?.limites ?? null, app.opacidadRadar);
    });
    // Satélite: al encenderlo el mapa deja alejarse hasta ver la región.
    $effect(() => {
      const p = app.capas.satelite;
      const t = app.satTiempos[app.satIndice] ?? null;
      capas.satelite(p ? teselas(p, t) : null, p ? PRODUCTOS[p].zoom : undefined);
    });
    $effect(() => {
      const sat = !!app.capas.satelite;
      map.setMaxBounds(sat ? null : BOUNDS);
      map.setMinZoom(sat ? ZOOM_MIN_SAT : ZOOM_MIN);
    });
    // Márgenes del mapa: lo que tapan el panel (escritorio) o la barra y la hoja (teléfono).
    $effect(() => {
      const pad = app.narrow ? { top: app.topbarH + 8, bottom: Math.min(app.sheetHeight, innerHeight * 0.5) + 104, left: 0, right: 0 } : { top: 0, bottom: 0, left: 404, right: 0 };
      map.setPadding(pad);
    });
  }

  // ── Datos ───────────────────────────────────────────────────────────────────────────────────
  /** Pide lo que ya venció. Con la pestaña oculta no se pide nada. */
  private refrescar() {
    if (document.hidden) { app.estado = app.datos ? 'pausa' : app.estado; return; }
    const now = Date.now() / 1000, toca = (k: keyof typeof CADA) => now - this.ultimo[k] >= CADA[k] - 2;
    if (toca('ahora')) { this.ultimo.ahora = now; void this.traerAhora(); }
    else this.estado();
    if (this.map && app.capas.radar && toca('radar')) { this.ultimo.radar = now; void this.traerRadar(); }
    const rios = app.capas.rios || app.view.kind === 'rios' || app.view.kind === 'rio' || app.view.kind === 'home';
    if (rios && toca('niveles')) { this.ultimo.niveles = now; void api.niveles().then((n) => { app.niveles = n; }).catch(() => { this.ultimo.niveles = now - CADA.niveles + 30; }); }
    const alertas = app.capas.deslizamientos || app.capas.sequia || app.view.kind === 'alertas' || app.view.kind === 'home';
    if (alertas && toca('alertas')) { this.ultimo.alertas = now; void api.alertas().then((a) => { app.alertas = a; }).catch(() => { this.ultimo.alertas = now - CADA.alertas + 60; }); }
  }

  private async traerAhora() {
    try {
      const d = await api.ahora();
      app.datos = d;
      guardarDatos(d);
    } catch {
      // Sin respuesta: se reintenta en el siguiente paso del reloj (15 s), no antes.
      this.ultimo.ahora = Date.now() / 1000 - CADA.ahora + 15;
      if (!app.datos) app.estado = 'error';
    }
    this.estado();
  }

  /** El estado se decide por la edad de la lectura más reciente, no por la de la respuesta. */
  private estado() {
    if (!app.datos) return;
    const ultima = resumen(app.datos.estaciones, app.now).ultima;
    app.estado = ultima !== null && app.now - ultima < VIEJO_S ? 'vivo' : 'viejo';
  }

  private async traerRadar() {
    try {
      const r = await api.radar();
      const alFinal = !app.radar || app.cuadro >= app.radar.cuadros.length - 1;
      app.radar = r;
      if (alFinal && !app.animando) app.cuadro = Math.max(0, r.cuadros.length - 1);
      else app.cuadro = Math.min(app.cuadro, Math.max(0, r.cuadros.length - 1));
      // Se descargan primero los más recientes: el último es el que se ve al abrir.
      const vigentes = new Set(r.cuadros.map((c) => c.t));
      for (const [t, u] of this.cuadros) if (!vigentes.has(t)) { URL.revokeObjectURL(u); this.cuadros.delete(t); }
      for (const c of [...r.cuadros].reverse()) {
        if (this.cuadros.has(c.t)) continue;
        try {
          this.cuadros.set(c.t, await descargarCuadro(api.url(c.url)));
          app.cuadrosListos = this.cuadros.size;
        } catch { /* ese cuadro queda pendiente para la próxima vuelta */ }
      }
    } catch {
      this.ultimo.radar = Date.now() / 1000 - CADA.radar + 20;
    }
  }


  // ── Acciones ────────────────────────────────────────────────────────────────────────────────
  variable(v: Variable) { app.variable = v; guardarPrefs(); }

  capa<K extends keyof CapasEstado>(k: K, v: CapasEstado[K]) {
    app.capas[k] = v;
    guardarPrefs();
    if (k === 'radar' && !v) this.animar(false);
    if (k === 'satelite') void this.satelite(v as Producto | null);
    this.refrescar();
  }

  private async satelite(p: Producto | null) {
    if (!p) { app.satTiempos = []; app.satIndice = 0; this.ciudad(); return; }
    if (this.map && this.map.getZoom() > 8) {
      // Los límites se sueltan aquí mismo: el efecto que los maneja corre después y frenaría el vuelo.
      this.map.setMaxBounds(null);
      this.map.setMinZoom(ZOOM_MIN_SAT);
      this.map.easeTo({ center: SABANA.center, zoom: app.narrow ? SABANA.zoom - 0.7 : SABANA.zoom, duration: 900 });
    }
    try {
      const ts = await tiemposSatelite(p, Date.now() / 1000);
      if (app.capas.satelite !== p) return;
      app.satTiempos = ts;
      app.satIndice = Math.max(0, ts.length - 1);
    } catch { app.satTiempos = []; avisar('No se pudieron leer las horas del satélite; se muestra la última imagen.'); }
  }

  opacidad(v: number) { app.opacidadRadar = v; guardarPrefs(); }

  /** Animación del radar: avanza por los cuadros descargados y se detiene un momento en el último. */
  animar(on: boolean) {
    clearTimeout(this.animacion);
    app.animando = on;
    if (!on) return;
    const paso = () => {
      const n = app.radar?.cuadros.length ?? 0;
      if (!app.animando || n < 2) { app.animando = false; return; }
      let i = (app.cuadro + 1) % n;
      // Los cuadros que aún no bajaron se saltan.
      for (let k = 0; k < n && !this.cuadros.has(app.radar!.cuadros[i].t); k++) i = (i + 1) % n;
      app.cuadro = i;
      this.animacion = setTimeout(paso, i === n - 1 ? 1600 : 420);
    };
    if (app.radar && app.cuadro >= app.radar.cuadros.length - 1) app.cuadro = 0;
    this.animacion = setTimeout(paso, 420);
  }

  cuadro(i: number) { this.animar(false); app.cuadro = i; }

  zoom(d: number) { this.map?.easeTo({ zoom: this.map.getZoom() + d, duration: 250 }); }

  ciudad() { this.map?.easeTo({ center: HOME.center, zoom: app.narrow ? HOME.zoom - 1 : HOME.zoom, duration: 700 }); }

  region() { this.map?.easeTo({ ...REGION, duration: 900 }); }

  /** Ubicación del dispositivo: centra el mapa y deja la marca. No sale del dispositivo. */
  ubicar() {
    if (!navigator.geolocation) { avisar('Este navegador no da la ubicación.'); return; }
    app.ubicando = true;
    navigator.geolocation.getCurrentPosition(
      (p) => {
        app.ubicando = false;
        const yo = { lat: p.coords.latitude, lon: p.coords.longitude };
        if (!enBogota(yo)) { avisar('Tu ubicación está fuera de Bogotá: aquí solo hay estaciones de la ciudad.'); return; }
        app.yo = yo;
        this.map?.easeTo({ center: [yo.lon, yo.lat], zoom: Math.max(this.map.getZoom(), 12.5), duration: 800 });
      },
      (e) => { app.ubicando = false; avisar(e.code === e.PERMISSION_DENIED ? 'Sin permiso para usar la ubicación.' : 'No se pudo obtener la ubicación.'); },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 120000 },
    );
  }

  /** Estación con dato vigente más cercana a la ubicación. */
  cercana(v: Variable = 'lluvia'): { x: Estacion; km: number } | null {
    return app.yo && app.datos ? cercano(app.datos.estaciones, app.yo, (e) => valor(e, v, app.now) !== null) : null;
  }

  tema(p?: ThemePref) {
    if (p) saveThemePref(p);
    const t = effective();
    app.tema = t;
    applyTheme(t);
    if (!this.capas) return;
    this.capas.ponerTema(t);
    // Los colores de las estaciones dependen del tema: se vuelven a dibujar.
    if (app.datos) this.capas.estaciones(app.datos.estaciones, app.variable, Math.floor(app.now / 60) * 60);
    this.capas.alertas(app.alertas, { deslizamientos: app.capas.deslizamientos, sequia: app.capas.sequia });
  }

  // ── Mapa ────────────────────────────────────────────────────────────────────────────────────
  /** Lo que hay bajo el puntero: estación, río o localidad. Con el dedo, el área es más generosa. */
  private bajo(e: MapMouseEvent): { estacion?: number; rio?: number; localidad?: string } | null {
    const map = this.map;
    if (!map) return null;
    const r = matchMedia('(pointer: coarse)').matches ? 14 : 6, { x, y } = e.point;
    const capas = TOCABLES.filter((id) => map.getLayer(id));
    const fs = map.queryRenderedFeatures([[x - r, y - r], [x + r, y + r]], { layers: capas });
    if (fs.length) {
      // De los que caen en el área, el más cercano al punto tocado.
      let mejor = fs[0], d = Infinity;
      for (const f of fs) {
        if (f.geometry.type !== 'Point') continue;
        const p = map.project(f.geometry.coordinates as [number, number]), dd = (p.x - x) ** 2 + (p.y - y) ** 2;
        if (dd < d) { d = dd; mejor = f; }
      }
      return mejor.properties?.rio !== undefined ? { rio: Number(mejor.properties.rio) } : { estacion: Number(mejor.properties?.id) };
    }
    if (!app.capas.localidades) return null;
    const loc = map.queryRenderedFeatures(e.point, { layers: ['loc-relleno'] })[0];
    return loc ? { localidad: String(loc.properties?.nombre) } : null;
  }

  private toque(e: MapMouseEvent) {
    const b = this.bajo(e);
    if (!b) return;
    if (b.estacion !== undefined) go({ kind: 'estacion', id: String(b.estacion) });
    else if (b.rio !== undefined) go({ kind: 'rio', id: String(b.rio) });
    else if (b.localidad) go({ kind: 'localidad', id: b.localidad });
  }

  /** Lleva el mapa a lo que muestra la vista: una estación, un río o una localidad. */
  private enfocar() {
    const map = this.map, v = app.view;
    if (!map || !this.capas) return;
    const caja = this.capas.localidadActiva(v.kind === 'localidad' ? v.id : null);
    if (v.kind === 'estacion') {
      const e = app.datos?.estaciones.find((x) => x.id === Number(v.id));
      if (e) map.easeTo({ center: [e.lon, e.lat], zoom: Math.max(map.getZoom(), 12.2), duration: 700 });
    } else if (v.kind === 'rio') {
      const r = app.niveles?.rios.find((x) => x.id === Number(v.id));
      if (r) map.easeTo({ center: [r.lon, r.lat], zoom: Math.max(map.getZoom(), 12.2), duration: 700 });
    } else if (caja) {
      map.fitBounds(caja, { padding: 40, maxZoom: 13, duration: 700 });
    }
  }
}

/** Descarga un cuadro del radar y lo reduce: el original mide 2310 px de lado y no hace falta tanto. */
async function descargarCuadro(url: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(String(res.status));
  const blob = await res.blob();
  try {
    const bmp = await createImageBitmap(blob);
    if (bmp.width <= LADO_RADAR) { bmp.close(); return URL.createObjectURL(blob); }
    const c = document.createElement('canvas');
    c.width = c.height = LADO_RADAR;
    const g = c.getContext('2d')!;
    g.imageSmoothingQuality = 'medium';
    g.drawImage(bmp, 0, 0, LADO_RADAR, LADO_RADAR);
    bmp.close();
    const chico = await new Promise<Blob | null>((ok) => c.toBlob(ok, 'image/png'));
    return URL.createObjectURL(chico ?? blob);
  } catch {
    return URL.createObjectURL(blob);
  }
}

/** Pronóstico: se pide al abrir una vista que lo muestra y se guarda media hora. */
export async function traerPronostico() {
  if (app.pronostico && app.now - app.pronostico.t < 1800) return;
  try { app.pronostico = await pronostico(Date.now() / 1000); app.pronosticoError = false; }
  catch { app.pronosticoError = true; }
}

let actual: Controller | null = null;
export const ctl = (): Controller | null => actual;
export const setController = (c: Controller | null) => { actual = c; };
