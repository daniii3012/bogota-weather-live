/**
 * Imágenes del mapa dibujadas en un lienzo: etiquetas de valor, flechas de viento y rombos de río.
 * Todas llevan un anillo del color del fondo del mapa: es lo que las separa cuando se montan unas
 * sobre otras o sobre el radar, sin dibujarles un borde.
 */
import type { Map as MLMap } from 'maplibre-gl';

const PR = 2; // densidad de las imágenes

function lienzo(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w * PR;
  c.height = h * PR;
  const g = c.getContext('2d')!;
  g.scale(PR, PR);
  return { c, g };
}

function poner(map: MLMap, id: string, c: HTMLCanvasElement, opciones: Record<string, unknown> = {}) {
  const datos = c.getContext('2d')!.getImageData(0, 0, c.width, c.height);
  if (map.hasImage(id)) map.removeImage(id);
  map.addImage(id, datos, { pixelRatio: PR, ...opciones });
}

/** Etiqueta rectangular que se estira al ancho del texto. */
export function etiqueta(map: MLMap, id: string, color: string, fondo: string) {
  const W = 16, H = 14, A = 2; // A: anillo
  const { c, g } = lienzo(W, H);
  g.fillStyle = fondo;
  g.fillRect(0, 0, W, H);
  g.fillStyle = color;
  g.fillRect(A, A, W - 2 * A, H - 2 * A);
  poner(map, id, c, {
    stretchX: [[6 * PR, 10 * PR]],
    stretchY: [[5 * PR, 9 * PR]],
    content: [A * PR, A * PR, (W - A) * PR, (H - A) * PR],
  });
}

/** Flecha que apunta al norte; el mapa la gira hacia donde va el viento. */
export function flecha(map: MLMap, id: string, color: string, fondo: string) {
  const S = 26;
  const { c, g } = lienzo(S, S);
  const forma = () => {
    g.beginPath();
    g.moveTo(13, 2);    // punta
    g.lineTo(20, 13);
    g.lineTo(15.2, 13);
    g.lineTo(15.2, 24);
    g.lineTo(10.8, 24);
    g.lineTo(10.8, 13);
    g.lineTo(6, 13);
    g.closePath();
  };
  forma();
  g.lineJoin = 'miter';
  g.strokeStyle = fondo;
  g.lineWidth = 4;
  g.stroke();
  forma();
  g.fillStyle = color;
  g.fill();
  poner(map, id, c);
}

/** Rombo: estación de nivel de un río. */
export function rombo(map: MLMap, id: string, color: string, fondo: string) {
  const S = 22;
  const { c, g } = lienzo(S, S);
  const forma = (r: number) => {
    g.beginPath();
    g.moveTo(11, 11 - r); g.lineTo(11 + r, 11); g.lineTo(11, 11 + r); g.lineTo(11 - r, 11);
    g.closePath();
  };
  forma(10);
  g.fillStyle = fondo;
  g.fill();
  forma(7.2);
  g.fillStyle = color;
  g.fill();
  poner(map, id, c);
}
