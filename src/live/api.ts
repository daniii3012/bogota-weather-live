/** Cliente del intermediario. Su dirección se da en compilación (`VITE_API_BASE`) o en la URL (`?api=`). */
import type { Ahora, Alertas, Niveles, Radar, Serie, Variable } from './contract';

const param = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('api') : null;
export const API_BASE = (param || import.meta.env.VITE_API_BASE || 'http://localhost:8787').replace(/\/+$/, '');

export class ApiError extends Error {
  status: number;
  constructor(status: number) { super(`intermediario ${status}`); this.status = status; }
}

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(API_BASE + path, { signal: signal ?? AbortSignal.timeout(20000) });
  if (!res.ok) throw new ApiError(res.status);
  return (await res.json()) as T;
}

export const api = {
  ahora: () => get<Ahora>('/v1/ahora'),
  serie: (id: number, variable: Variable, signal?: AbortSignal) => get<Serie>(`/v1/estaciones/${id}/serie?variable=${variable}`, signal),
  radar: () => get<Radar>('/v1/radar'),
  niveles: () => get<Niveles>('/v1/niveles'),
  serieNivel: (id: number, signal?: AbortSignal) => get<Serie>(`/v1/niveles/${id}/serie`, signal),
  alertas: () => get<Alertas>('/v1/alertas'),
  /** Dirección completa de un recurso del intermediario (los cuadros del radar). */
  url: (path: string) => API_BASE + path,
};
