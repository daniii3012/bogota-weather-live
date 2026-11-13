<script lang="ts" module>
  /** Una fila de la lista: nombre, contexto, valor y, si llueve ahí ahora, la marca. */
  export interface Fila { href: string; nombre: string; sub: string; v: number | null; txt: string; llueve?: boolean; estacion?: number }
</script>

<script lang="ts">
  import { app } from '../app/store.svelte';

  // Barras desde cero, todas del mismo tono: ordenan y comparan; el color no repite lo que ya dice el largo.
  let { filas, max, tono, unidad, vacio = 'Sin datos.' }: { filas: Fila[]; max: number; tono: string; unidad: string; vacio?: string } = $props();
</script>

{#if filas.length}
  <ol class="filas" style:--tono={tono}>
    {#each filas as f (f.href)}
      <li>
        <a href={f.href} onpointerenter={() => (app.resaltada = f.estacion ?? null)} onpointerleave={() => (app.resaltada = null)}>
          <span class="texto">
            <span class="nombre">{#if f.llueve}<span class="gota" title="Llueve ahora" aria-label="Llueve ahora"></span>{/if}{f.nombre}</span>
            <span class="sub faint">{f.sub}</span>
          </span>
          <span class="barra" aria-hidden="true">{#if f.v !== null && f.v > 0}<span style:width="{Math.max(2, Math.min(100, (f.v / max) * 100))}%"></span>{/if}</span>
          <span class="valor num" class:faint={f.v === null}>{f.txt}{#if f.v !== null}<span class="u">{unidad}</span>{/if}</span>
        </a>
      </li>
    {/each}
  </ol>
{:else}
  <p class="faint">{vacio}</p>
{/if}

<style>
  .filas { list-style: none; margin: 0 calc(var(--sp-4) * -1); padding: 0; }
  a {
    display: grid; grid-template-columns: minmax(0, 1fr) 64px 76px; align-items: center; gap: var(--sp-3);
    min-height: var(--row); padding: 5px var(--sp-4); text-decoration: none; border-top: 1px solid var(--line-1);
    transition: background var(--t-out);
  }
  li:first-child a { border-top: 0; }
  a:hover { background: var(--bg-2); }
  .texto { display: grid; min-width: 0; }
  .nombre { font-size: var(--fs-body); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sub { font-size: var(--fs-label); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .gota { display: inline-block; width: 6px; height: 6px; margin-right: 6px; background: var(--v-lluvia); vertical-align: 2px; animation: latido 1.8s var(--ease-out) infinite; }
  .barra { height: 4px; background: var(--bg-3); display: block; }
  .barra span { display: block; height: 100%; background: var(--tono); }
  .valor { text-align: right; font-size: var(--fs-body); white-space: nowrap; }
  .u { color: var(--fg-2); font-size: var(--fs-label); margin-left: 3px; }
  @keyframes latido { 0%, 60%, 100% { opacity: 1; } 30% { opacity: 0.25; } }
  @media (prefers-reduced-motion: reduce) { .gota { animation: none; } }
</style>
