/** Vistas con dirección propia: cada una se puede compartir y el botón atrás funciona. */
export type View =
  | { kind: 'home' }
  | { kind: 'estacion'; id: string }
  | { kind: 'localidad'; id: string }
  | { kind: 'localidades' }
  | { kind: 'rios' }
  | { kind: 'rio'; id: string }
  | { kind: 'pronostico' }
  | { kind: 'alertas' }
  | { kind: 'fuentes' }
  | { kind: 'configuracion' };

const SIMPLES = ['localidades', 'rios', 'pronostico', 'alertas', 'fuentes', 'configuracion'] as const;
const CON_ID = ['estacion', 'localidad', 'rio'] as const;

export function parse(hash = location.hash): View {
  const m = /^#\/([a-z]+)(?:\/(.+))?$/.exec(hash);
  if (!m) return { kind: 'home' };
  const [, seg, id] = m;
  if (!id && (SIMPLES as readonly string[]).includes(seg)) return { kind: seg } as View;
  if (id && (CON_ID as readonly string[]).includes(seg)) return { kind: seg, id: decodeURIComponent(id) } as View;
  return { kind: 'home' };
}

export function href(v: View): string {
  if (v.kind === 'home') return '#/';
  return 'id' in v ? `#/${v.kind}/${encodeURIComponent(v.id)}` : `#/${v.kind}`;
}

export function go(v: View, replace = false) {
  const h = href(v);
  if (location.hash === h) return;
  if (replace) {
    history.replaceState(null, '', h);
    dispatchEvent(new HashChangeEvent('hashchange'));
  } else location.hash = h;
}

/** Llave de una vista: cambia cuando hay que redibujar el panel. */
export const key = (v: View): string => ('id' in v ? `${v.kind}:${v.id}` : v.kind);

// Pasos dados dentro de la página: con al menos uno, «volver» es el botón atrás del navegador; si se
// llegó por un enlace directo, lleva al inicio.
let pasos = 0;
if (typeof addEventListener !== 'undefined') addEventListener('hashchange', () => pasos++);
export function volver() {
  if (pasos > 0) { pasos -= 2; history.back(); }
  else go({ kind: 'home' });
}
