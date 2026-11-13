<script lang="ts">
  import { app, alternarFavorita, avisar } from '../app/store.svelte';
  import { api } from '../live/api';
  import type { Serie } from '../live/contract';
  import { META, valor, vigente } from '../domain/variables';
  import { intensa } from '../domain/stats';
  import { cuando, hace, num } from '../domain/fmt';
  import Cabecera from './Cabecera.svelte';
  import VarTiles from './VarTiles.svelte';
  import Grafica from '../charts/Grafica.svelte';
  import { fichasEstacion } from './fichas';

  let { id }: { id: number } = $props();
  const e = $derived(app.datos?.estaciones.find((x) => x.id === id) ?? null);
  const v = $derived(app.variable);
  const meta = $derived(META[v]);
  const favorita = $derived(app.favoritas.includes(id));

  // Serie de la variable elegida. Se vuelve a pedir cuando llegan datos nuevos; mientras tanto se
  // conserva la anterior (atenuada si es de otra variable o de otra estación).
  let serie = $state<Serie | null>(null);
  let cargando = $state(false);
  let fallo = $state(false);
  $effect(() => {
    const clave = { id, v, t: app.datos?.t };
    if (!e?.[clave.v]) { serie = null; return; }
    const corte = new AbortController();
    cargando = true;
    api.serie(clave.id, clave.v, corte.signal)
      .then((s) => { serie = s; fallo = false; cargando = false; })
      .catch((err) => { if (err?.name !== 'AbortError') { fallo = true; cargando = false; } });
    return () => corte.abort();
  });
  const propia = $derived(serie && serie.id === id && serie.variable === v ? serie : null);

  // Lluvia en barras de 10 minutos (el origen la da cada 5): se leen mejor en el ancho del panel.
  const puntos = $derived.by((): [number, number][] => {
    if (!serie) return [];
    if (serie.variable !== 'lluvia') return serie.puntos;
    const m = new Map<number, number>();
    for (const [t, x] of serie.puntos) { const k = Math.floor(t / 600) * 600; m.set(k, (m.get(k) ?? 0) + x); }
    return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([t, x]) => [t, Math.round(x * 100) / 100]);
  });
  const t1 = $derived(Math.ceil(app.now / 600) * 600);
  const rango = $derived.by(() => {
    const xs = (propia?.puntos ?? []).map((p) => p[1]);
    return xs.length ? { min: Math.min(...xs), max: Math.max(...xs) } : null;
  });
  const total6h = $derived((propia?.puntos ?? []).reduce((s, p) => s + p[1], 0));
  const lectura = $derived(e?.[v]?.t ?? null);

  async function compartir() {
    const url = location.href, title = `${e?.nombre} · Bogotá Weather Live`;
    try {
      if (navigator.share) await navigator.share({ title, url });
      else { await navigator.clipboard.writeText(url); avisar('Enlace copiado.'); }
    } catch { /* se canceló */ }
  }
</script>

{#if e}
  <Cabecera titulo={e.nombre} sub="{e.localidad}{e.alt ? ` · ${num(e.alt, 0)} m s. n. m.` : ''}">
    {#snippet acciones()}
      <button onclick={() => alternarFavorita(id)} aria-pressed={favorita} aria-label={favorita ? 'Quitar de favoritas' : 'Marcar como favorita'} title={favorita ? 'Quitar de favoritas' : 'Marcar como favorita'}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill={favorita ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M8 1.6l1.9 4.1 4.5.5-3.3 3 .9 4.4L8 11.4l-4 2.2.9-4.4-3.3-3 4.5-.5Z" /></svg>
      </button>
      <button onclick={compartir} aria-label="Compartir esta estación" title="Compartir">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M8 10V1.5M4.8 4.5 8 1.5l3.2 3M3 8v6h10V8" /></svg>
      </button>
    {/snippet}
  </Cabecera>

  <VarTiles fichas={fichasEstacion(e, app.now)} etiqueta="Lecturas de la estación: elige la variable" />

  <section class="sec">
    <header>
      <h3 class="label">{meta.nombre} · últimas 6 horas</h3>
      {#if lectura}<span class="num faint edad">{cuando(lectura, app.now)} · {hace(app.now - lectura)}</span>{/if}
    </header>
    {#if !e[v]}
      <p class="faint">Esta estación no tiene sensor de {meta.nombre.toLowerCase()}.</p>
    {:else}
      {#if lectura && !vigente(lectura, app.now)}
        <p class="aviso"><span class="marca" aria-hidden="true"></span>Sin lecturas recientes: la última es de {cuando(lectura, app.now)}.</p>
      {/if}
      {#if v === 'lluvia' && propia && intensa(propia, app.now)}
        <p class="aviso fuerte"><span class="marca" aria-hidden="true"></span><strong>Lluvia intensa</strong>: 5 mm o más en cinco minutos durante la última hora.</p>
      {/if}
      <Grafica {puntos} tipo={v === 'lluvia' ? 'barras' : 'linea'} tono={meta.tono} unidad={meta.unidad} dec={meta.dec} paso={600}
        t0={t1 - 6 * 3600} {t1} cargando={cargando || !propia} tabla={v === 'lluvia' ? 3600 : 1800}
        nombre="{meta.medida} en {e.nombre} durante las últimas seis horas" />
      {#if fallo && !propia}<p class="faint">No se pudo cargar la serie. Se vuelve a intentar con la próxima actualización.</p>{/if}

      {#if v === 'lluvia' && propia}
        <dl class="cifras">
          <div><dt>10 min</dt><dd>{num(propia.acum?.m10, 1)}</dd></div>
          <div><dt>30 min</dt><dd>{num(propia.acum?.m30, 1)}</dd></div>
          <div><dt>60 min</dt><dd>{num(propia.acum?.m60, 1)}</dd></div>
          <div><dt>6 horas</dt><dd>{num(total6h, 1)}</dd></div>
        </dl>
        <p class="pie faint">Milímetros acumulados. Barras de 10 minutos.</p>
      {:else if propia && rango}
        <dl class="cifras tres">
          <div><dt>Mínima</dt><dd>{num(rango.min, meta.dec)}</dd></div>
          <div><dt>Máxima</dt><dd>{num(rango.max, meta.dec)}</dd></div>
          <div><dt>Ahora</dt><dd>{num(valor(e, v, app.now), meta.dec)}</dd></div>
        </dl>
        <p class="pie faint">{meta.medida}, en {meta.unidad}. Una lectura por minuto.</p>
      {/if}
    {/if}
  </section>

  <section class="sec">
    <header><h3 class="label">Estación</h3></header>
    <dl class="datos">
      <div><dt>Localidad</dt><dd><a href="#/localidad/{encodeURIComponent(e.localidad)}">{e.localidad}</a></dd></div>
      {#if e.alt}<div><dt>Altitud</dt><dd>{num(e.alt, 0)} m s. n. m.</dd></div>{/if}
      {#if e.presion}<div><dt>Presión atmosférica</dt><dd>{num(e.presion, 1)} hPa</dd></div>{/if}
      <div><dt>Coordenadas</dt><dd class="num">{e.lat.toFixed(4)}, {e.lon.toFixed(4)}</dd></div>
    </dl>
    <p class="pie faint">Red hidrometeorológica del IDIGER. Datos crudos, sin validar en su totalidad.</p>
  </section>
{:else if app.datos}
  <Cabecera titulo="Estación no encontrada" />
  <p class="sin dim">No hay ninguna estación con ese identificador. Puede que ya no reporte.</p>
{/if}

<style>
  .edad { font-size: var(--fs-label); white-space: nowrap; }
  .aviso { display: flex; align-items: baseline; gap: var(--sp-2); font-size: var(--fs-small); color: var(--fg-1); }
  .aviso .marca { width: 6px; height: 6px; background: var(--warn); flex: none; transform: translateY(-1px); }
  .aviso.fuerte .marca { background: var(--critical); }
  .aviso strong { color: var(--fg-0); }
  .cifras { margin: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: var(--line-1); border: 1px solid var(--line-1); }
  .cifras.tres { grid-template-columns: repeat(3, 1fr); }
  .cifras div { background: var(--bg-1); padding: var(--sp-2) var(--sp-3); display: grid; gap: 2px; }
  .cifras dt { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--fg-2); }
  .cifras dd { margin: 0; font-size: var(--fs-row); font-weight: 600; }
  .pie { font-size: var(--fs-label); }
  .datos { margin: 0; display: grid; }
  .datos div { display: flex; justify-content: space-between; gap: var(--sp-3); padding: 7px 0; border-top: 1px solid var(--line-1); }
  .datos div:first-child { border-top: 0; padding-top: 0; }
  .datos dt { color: var(--fg-2); }
  .datos dd { margin: 0; text-align: right; }
  .datos .num { font-size: var(--fs-small); }
  .sin { padding: var(--sp-4); }
</style>
