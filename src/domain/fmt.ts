/** Formato de cifras y horas en español de Colombia. Las horas, siempre en hora de Bogotá. */

const NF = new Map<number, Intl.NumberFormat>();
/** Número con coma decimal y los decimales indicados. */
export function num(v: number | null | undefined, dec = 1): string {
  if (v == null || !Number.isFinite(v)) return '—';
  let f = NF.get(dec);
  if (!f) NF.set(dec, (f = new Intl.NumberFormat('es-CO', { minimumFractionDigits: dec, maximumFractionDigits: dec })));
  // «-0,0» no dice nada: sin signo.
  return f.format(Math.abs(v) < 0.5 * 10 ** -dec ? 0 : v);
}

const HM = new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Bogota' });
const DIA = new Intl.DateTimeFormat('es-CO', { weekday: 'long', timeZone: 'America/Bogota' });
const DIA_CORTO = new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: 'numeric', timeZone: 'America/Bogota' });
const FECHA = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', timeZone: 'America/Bogota' });
const YMD = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/Bogota' });

/** «22:27» */
export const hora = (t: number): string => HM.format(t * 1000).replace(/^24/, '00');
/** «jueves» */
export const dia = (t: number): string => DIA.format(t * 1000);
/** «jue 12» */
export const diaCorto = (t: number): string => DIA_CORTO.format(t * 1000).replace('.', '').replace(',', '');
/** «12 de nov» */
export const fecha = (t: number): string => FECHA.format(t * 1000).replace('.', '');
/** «2026-11-12»: para saber si dos instantes son del mismo día en Bogotá. */
export const ymd = (t: number): string => YMD.format(t * 1000);

/** «ahora», «hace 3 min», «hace 2 h», «hace 4 días» */
export function hace(seg: number): string {
  const s = Math.max(0, Math.round(seg));
  if (s < 90) return 'hace un momento';
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  if (s < 2 * 86400) return `hace ${Math.round(s / 3600)} h`;
  return `hace ${Math.round(s / 86400)} días`;
}

/** Hora de una lectura; con la fecha delante si no es de hoy. */
export function cuando(t: number, now: number): string {
  return ymd(t) === ymd(now) ? hora(t) : `${fecha(t)} ${hora(t)}`;
}
