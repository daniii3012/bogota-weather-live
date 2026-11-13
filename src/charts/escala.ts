/** Ejes de las gráficas: marcas en números redondos y horas en punto. */

/** Paso «redondo» (1, 2, 2,5 o 5 × 10ⁿ) para cubrir un rango con unas `n` marcas. */
export function paso(rango: number, n: number): number {
  if (rango <= 0) return 1;
  const bruto = rango / n, base = 10 ** Math.floor(Math.log10(bruto)), f = bruto / base;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * base;
}

/** Dominio redondeado hacia afuera y sus marcas. Con `desdeCero` el eje arranca en 0. */
export function eje(min: number, max: number, n = 3, desdeCero = false): { min: number; max: number; marcas: number[] } {
  if (desdeCero) min = 0;
  if (max - min < 1e-9) { max += 1; if (!desdeCero) min -= 1; }
  const p = paso(max - min, n);
  const a = Math.floor(min / p + 1e-9) * p, b = Math.ceil(max / p - 1e-9) * p;
  const marcas: number[] = [];
  for (let v = a; v <= b + p / 2; v += p) marcas.push(Math.round(v * 1e6) / 1e6);
  return { min: a, max: b, marcas };
}

/** Horas en punto (hora de Bogotá) dentro de un intervalo de tiempo, cada `cada` horas. */
export function horas(t0: number, t1: number, cada = 1): number[] {
  const out: number[] = [];
  // Bogotá va cinco horas detrás de UTC, sin horario de verano: las horas en punto coinciden.
  for (let t = Math.ceil(t0 / 3600) * 3600; t <= t1; t += 3600) {
    const h = ((t / 3600 - 5) % 24 + 24) % 24;
    if (h % cada === 0) out.push(t);
  }
  return out;
}

/** Decimales que hacen falta para escribir las marcas de un eje. */
export const decimales = (marcas: number[]): number => (marcas.some((m) => Math.abs(m - Math.round(m)) > 1e-6) ? (marcas.some((m) => Math.abs(m * 10 - Math.round(m * 10)) > 1e-6) ? 2 : 1) : 0);
