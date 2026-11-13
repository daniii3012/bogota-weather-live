<script lang="ts">
  /**
   * Serie de tiempo de una sola variable: barras (lluvia, suma por intervalo) o línea (el resto).
   * Una sola serie y un solo eje; el título de la sección dice qué se mide, así que no lleva leyenda.
   * El puntero, el dedo o las flechas del teclado recorren los puntos y muestran hora y valor; los
   * mismos valores están en la tabla de «Ver datos».
   */
  import { eje, horas, decimales } from './escala';
  import { hora, num } from '../domain/fmt';

  interface Ref { v: number; texto: string; color: string }
  let {
    puntos, tipo, tono, unidad, dec = 1, paso = 60, t0, t1, alto = 136, nombre, cargando = false, refs = [], tabla = 1800,
  }: {
    puntos: [number, number][]; tipo: 'barras' | 'linea'; tono: string; unidad: string; dec?: number;
    /** Segundos que cubre cada barra. */
    paso?: number; t0: number; t1: number; alto?: number; nombre: string; cargando?: boolean;
    /** Líneas de referencia (umbrales): solo se dibujan las que caen dentro del eje. */
    refs?: Ref[];
    /** Cada cuántos segundos va una fila de la tabla de datos. */
    tabla?: number;
  } = $props();

  let ancho = $state(340);
  let activo = $state<number | null>(null);

  const y = $derived.by(() => {
    const vs = puntos.map((p) => p[1]);
    if (!vs.length) return eje(0, 1, 3, true);
    let min = Math.min(...vs), max = Math.max(...vs);
    if (tipo === 'barras') return eje(0, Math.max(max, 1), 3, true);
    // Una referencia cercana (hasta medio rango más allá) entra en el eje; una lejana no lo aplasta.
    const rango = Math.max(max - min, 0.5);
    for (const r of refs) if (r.v > max && r.v - max < rango * 0.6) max = r.v; else if (r.v < min && min - r.v < rango * 0.6) min = r.v;
    const holgura = Math.max((max - min) * 0.12, 10 ** -dec);
    return eje(min - holgura, max + holgura, 3);
  });
  const dy = $derived(decimales(y.marcas));
  // El margen izquierdo se ajusta al rótulo más largo del eje (una cota tiene siete caracteres).
  const M = $derived({ izq: Math.max(34, 12 + 6.2 * Math.max(...y.marcas.map((m) => num(m, dy).length))), der: tipo === 'linea' ? 48 : 10, arriba: 10, abajo: 20 });
  const px = (t: number) => M.izq + ((t - t0) / (t1 - t0)) * (ancho - M.izq - M.der);
  const py = (v: number) => M.arriba + (1 - (v - y.min) / (y.max - y.min)) * (alto - M.arriba - M.abajo);
  const base = $derived(py(y.min));
  // Marcas de hora: tan seguidas como quepan sin montarse (unos 46 px por rótulo).
  const marcasX = $derived.by(() => {
    const caben = Math.max(2, Math.floor((ancho - M.izq - M.der) / 46)), tramo = (t1 - t0) / 3600;
    return horas(t0, t1, [1, 2, 3, 4, 6, 12].find((c) => tramo / c <= caben) ?? 12);
  });
  const linea = $derived(puntos.map(([t, v], i) => `${i ? 'L' : 'M'}${px(t).toFixed(1)} ${py(v).toFixed(1)}`).join(''));
  const area = $derived(puntos.length ? `${linea}L${px(puntos[puntos.length - 1][0]).toFixed(1)} ${base}L${px(puntos[0][0]).toFixed(1)} ${base}Z` : '');
  const fin = $derived(puntos.length ? puntos[puntos.length - 1] : null);
  const refsVisibles = $derived(refs.filter((r) => r.v >= y.min && r.v <= y.max));
  const sel = $derived(activo !== null && puntos[activo] ? puntos[activo] : null);
  // La barra cubre [t, t + paso): su centro es el punto que el cursor busca.
  const centro = (t: number) => (tipo === 'barras' ? t + paso / 2 : t);

  function buscar(clientX: number, el: Element) {
    if (!puntos.length) return;
    const t = t0 + ((clientX - el.getBoundingClientRect().left - M.izq) / (ancho - M.izq - M.der)) * (t1 - t0);
    let mejor = 0, d = Infinity;
    for (let i = 0; i < puntos.length; i++) {
      const dd = Math.abs(centro(puntos[i][0]) - t);
      if (dd < d) { d = dd; mejor = i; }
    }
    activo = mejor;
  }
  function tecla(e: KeyboardEvent) {
    if (!puntos.length) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const i = activo ?? puntos.length - 1;
      activo = Math.max(0, Math.min(puntos.length - 1, i + (e.key === 'ArrowLeft' ? -1 : 1)));
    } else if (e.key === 'Escape') activo = null;
  }

  // Filas de la tabla: en barras, la suma de cada tramo; en línea, el valor al final del tramo.
  const filas = $derived.by(() => {
    const out: { t: number; v: number }[] = [];
    for (let a = Math.floor(t0 / tabla) * tabla; a < t1; a += tabla) {
      const dentro = puntos.filter(([t]) => t >= a && t < a + tabla);
      if (!dentro.length) continue;
      out.push({ t: a, v: tipo === 'barras' ? dentro.reduce((s, p) => s + p[1], 0) : dentro[dentro.length - 1][1] });
    }
    return out;
  });
  const tipX = $derived(sel ? Math.max(M.izq, Math.min(ancho - 96, px(centro(sel[0])) - 44)) : 0);
</script>

<figure class="grafica" class:cargando bind:clientWidth={ancho}>
  {#if puntos.length}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
    <svg width={ancho} height={alto} role="img" aria-label={nombre} tabindex="0"
      onpointermove={(e) => buscar(e.clientX, e.currentTarget)} onpointerdown={(e) => buscar(e.clientX, e.currentTarget)}
      onpointerleave={() => (activo = null)} onkeydown={tecla} onblur={() => (activo = null)}>
      {#each y.marcas as m (m)}
        <line class="rejilla" x1={M.izq} x2={ancho - M.der} y1={py(m)} y2={py(m)} />
        <text class="eje" x={M.izq - 6} y={py(m) + 3.5} text-anchor="end">{num(m, dy)}</text>
      {/each}
      {#each marcasX as t (t)}
        <!-- Una marca pegada al borde derecho se alinea por su final: no se sale de la gráfica. -->
        <text class="eje" x={px(t)} y={alto - 5} text-anchor={px(t) > ancho - 16 ? 'end' : 'middle'}>{hora(t)}</text>
      {/each}
      <line class="base" x1={M.izq} x2={ancho - M.der} y1={base} y2={base} />
      {#each refsVisibles as r (r.texto)}
        <line x1={M.izq} x2={ancho - M.der} y1={py(r.v)} y2={py(r.v)} stroke={r.color} stroke-width="1" />
        <text class="ref" x={M.izq + 4} y={py(r.v) - 4}>{r.texto}</text>
      {/each}

      {#if tipo === 'barras'}
        {#each puntos as [t, v], i (t)}
          {@const x = px(t)}
          {@const w = Math.max(1, px(t + paso) - x - 2)}
          {#if v > 0}
            <rect x={x + 1} y={py(v)} width={w} height={Math.max(1, base - py(v))} fill={tono} opacity={activo === null || activo === i ? 1 : 0.45} />
          {/if}
        {/each}
        {#if sel}
          <rect class="banda" x={px(sel[0])} y={M.arriba} width={Math.max(2, px(sel[0] + paso) - px(sel[0]))} height={base - M.arriba} />
        {/if}
      {:else}
        <path d={area} fill={tono} opacity="0.1" />
        <path d={linea} fill="none" stroke={tono} stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
        {#if sel}
          <line class="cursor" x1={px(sel[0])} x2={px(sel[0])} y1={M.arriba} y2={base} />
          <circle cx={px(sel[0])} cy={py(sel[1])} r="4" fill={tono} class="punto" />
        {:else if fin}
          <circle cx={px(fin[0])} cy={py(fin[1])} r="4" fill={tono} class="punto" />
          <text class="final" x={px(fin[0]) + 9} y={py(fin[1]) + 4}>{num(fin[1], dec)}</text>
        {/if}
      {/if}
    </svg>
    {#if sel}
      <div class="tip" style:left="{tipX}px" aria-hidden="true">
        <strong>{num(sel[1], tipo === 'barras' ? 1 : dec)} {unidad}</strong>
        <span>{hora(sel[0])}{tipo === 'barras' ? `–${hora(sel[0] + paso)}` : ''}</span>
      </div>
    {/if}
    <details>
      <summary>Ver datos</summary>
      <table>
        <thead><tr><th scope="col">Hora</th><th scope="col">{unidad}</th></tr></thead>
        <tbody>
          {#each filas as f (f.t)}
            <tr><td>{hora(f.t)}{tipo === 'barras' ? `–${hora(f.t + tabla)}` : ''}</td><td>{num(f.v, tipo === 'barras' ? 1 : dec)}</td></tr>
          {/each}
        </tbody>
      </table>
    </details>
  {:else}
    <p class="vacio faint" style:height="{alto}px">{cargando ? 'Cargando…' : 'Sin lecturas en las últimas seis horas.'}</p>
  {/if}
</figure>

<style>
  .grafica { margin: 0; position: relative; min-width: 0; transition: opacity var(--t-out); }
  /* Al volver a pedir datos se conserva el dibujo anterior, atenuado: sin saltos. */
  .grafica.cargando { opacity: 0.55; }
  svg { display: block; touch-action: pan-y; outline: none; }
  svg:focus-visible { outline: 1px solid var(--line-2); }
  .rejilla { stroke: var(--line-1); stroke-width: 1; }
  .base { stroke: var(--line-2); stroke-width: 1; }
  .eje { font-family: var(--font-mono); font-size: 10px; fill: var(--fg-2); font-variant-numeric: tabular-nums; }
  .ref { font-family: var(--font-mono); font-size: 9.5px; fill: var(--fg-1); letter-spacing: 0.04em; text-transform: uppercase; }
  .final { font-size: 12px; font-weight: 600; fill: var(--fg-0); }
  /* Anillo del color del panel: el punto se distingue donde cruza la línea. */
  .punto { stroke: var(--bg-1); stroke-width: 2; }
  .cursor { stroke: var(--fg-2); stroke-width: 1; }
  .banda { fill: var(--fg-0); opacity: 0.07; }
  .tip {
    position: absolute; top: -6px; display: grid; justify-items: start; padding: 4px 8px; pointer-events: none;
    background: var(--bg-3); border: 1px solid var(--line-2); box-shadow: var(--shadow); white-space: nowrap; z-index: 1;
  }
  .tip strong { font-size: var(--fs-body); font-weight: 600; }
  .tip span { font-family: var(--font-mono); font-size: 10px; color: var(--fg-1); }
  .vacio { display: flex; align-items: center; justify-content: center; text-align: center; }
  details { margin-top: 2px; }
  summary { font-family: var(--font-mono); font-size: var(--fs-label); letter-spacing: 0.04em; color: var(--fg-2); cursor: pointer; width: fit-content; list-style: none; }
  summary::-webkit-details-marker { display: none; }
  summary:hover { color: var(--fg-0); }
  table { width: 100%; border-collapse: collapse; margin-top: var(--sp-2); font-size: var(--fs-small); }
  th { text-align: left; font-weight: 500; color: var(--fg-2); padding: 4px 0; border-bottom: 1px solid var(--line-1); }
  td { padding: 4px 0; border-bottom: 1px solid var(--line-1); font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
  th:last-child, td:last-child { text-align: right; }
</style>
