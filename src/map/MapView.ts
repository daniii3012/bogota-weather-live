import { Map as MLMap, AttributionControl, setWorkerUrl, type LngLatBoundsLike } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import { darkStyle } from './style';
import type { Theme } from '../app/theme';

setWorkerUrl(workerUrl);

/** Bogotá con Sumapaz y la sabana cercana: el mapa no se aleja de aquí (salvo con el satélite). */
export const BOUNDS: LngLatBoundsLike = [[-75.3, 3.3], [-73.0, 5.6]];
/** La ciudad urbana: el encuadre de inicio. */
export const HOME = { center: [-74.11, 4.64] as [number, number], zoom: 10.6 };
/** Vistas del satélite: la sabana y sus alrededores (la que abre) y el país. */
export const SABANA = { center: [-74.1, 4.75] as [number, number], zoom: 7.3 };
export const REGION = { center: [-73.6, 5.0] as [number, number], zoom: 5.5 };
export const ZOOM_MIN = 8.4;
export const ZOOM_MIN_SAT = 4.5;

export class MapView {
  readonly map: MLMap;

  constructor(container: HTMLElement, theme: Theme) {
    const narrow = container.clientWidth < 760;
    this.map = new MLMap({
      container,
      style: darkStyle(theme),
      center: HOME.center,
      zoom: narrow ? HOME.zoom - 1 : HOME.zoom,
      // En móvil, densidad de píxeles hasta 2: se ve igual de nítido y el teléfono trabaja la mitad.
      pixelRatio: matchMedia('(pointer: coarse)').matches ? Math.min(2, devicePixelRatio || 1) : devicePixelRatio || 1,
      minZoom: ZOOM_MIN,
      maxZoom: 17,
      maxBounds: BOUNDS,
      attributionControl: false,
      // El mapa es plano y con el norte arriba: el viento y el radar se leen sin girar la cabeza.
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      fadeDuration: 150,
      canvasContextAttributes: { antialias: true },
      locale: {
        'Map.Title': 'Mapa del clima de Bogotá en vivo',
        'AttributionControl.ToggleAttribution': 'Mostrar u ocultar atribución',
      },
    });
    this.map.touchZoomRotate.disableRotation();
    this.map.keyboard.disableRotation();
    // El lienzo no se puede recorrer estación por estación: lo mismo está en el panel, que sí se lee.
    this.map.getCanvas().setAttribute('aria-label', 'Mapa del clima de Bogotá en vivo. Las estaciones y sus valores también están en el panel.');
    this.map.addControl(new AttributionControl({ compact: true }), 'bottom-right');
  }

  ready(): Promise<void> {
    return this.map.loaded() ? Promise.resolve() : new Promise((r) => this.map.once('load', () => r()));
  }
}
