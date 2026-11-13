/** Distancias sobre el mapa. */

const R_KM = 6371;
const rad = (g: number) => (g * Math.PI) / 180;

/** Distancia en kilómetros entre dos puntos (fórmula del semiverseno). */
export function distancia(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.sqrt(h));
}

/** El más cercano de una lista que cumpla la condición, con su distancia. */
export function cercano<T extends { lat: number; lon: number }>(lista: T[], a: { lat: number; lon: number }, sirve: (x: T) => boolean = () => true): { x: T; km: number } | null {
  let mejor: { x: T; km: number } | null = null;
  for (const x of lista) {
    if (!sirve(x)) continue;
    const km = distancia(a, x);
    if (!mejor || km < mejor.km) mejor = { x, km };
  }
  return mejor;
}

/** Bogotá y sus alrededores: fuera de aquí la estación más cercana no dice nada de donde uno está. */
export const enBogota = (p: { lat: number; lon: number }): boolean => p.lat > 3.7 && p.lat < 5.0 && p.lon > -74.5 && p.lon < -73.9;

/** «350 m», «2,4 km» */
export const km = (d: number): string => (d < 1 ? `${Math.round(d * 100) * 10} m` : `${d.toFixed(1).replace('.', ',')} km`);
