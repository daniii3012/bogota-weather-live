<script lang="ts" module>
  import type { Variable } from '../live/contract';
  /** Lo que muestra una ficha: la cifra, su unidad y una línea de contexto. */
  export interface Ficha { valor: string; unidad: string; nota: string; sinDato?: boolean }
  export type Fichas = Record<Variable, Ficha>;
</script>

<script lang="ts">
  import { app } from '../app/store.svelte';
  import { ctl } from '../app/controller.svelte';
  import { META, VARIABLES } from '../domain/variables';

  let { fichas, etiqueta = 'Variable del mapa' }: { fichas: Fichas; etiqueta?: string } = $props();
</script>

<!-- Las cuatro fichas son a la vez el resumen y el selector: la elegida es la que pinta el mapa. -->
<div class="fichas" role="radiogroup" aria-label={etiqueta}>
  {#each VARIABLES as v (v)}
    {@const f = fichas[v]}
    <button class="ficha" class:on={app.variable === v} class:vacia={f.sinDato} role="radio" aria-checked={app.variable === v}
      style:--tono={META[v].tono} onclick={() => ctl()?.variable(v)}>
      <span class="nombre label"><span class="marca" aria-hidden="true"></span>{META[v].nombre}</span>
      <span class="cifra"><span class="valor">{f.valor}</span><span class="unidad">{f.unidad}</span></span>
      <span class="nota">{f.nota}</span>
    </button>
  {/each}
</div>

<style>
  /* Rejilla de 2 × 2 separada por líneas de 1 px (el fondo de la rejilla). */
  .fichas { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--line-1); border-bottom: 1px solid var(--line-1); }
  .ficha {
    display: grid; gap: 3px; align-content: start; height: 88px; padding: 10px var(--sp-4) 8px;
    background: var(--bg-1); position: relative; min-width: 0;
    transition: background var(--t-out);
  }
  .ficha:hover { background: var(--bg-2); }
  .ficha.on { background: var(--bg-2); }
  /* La elegida: barra del tono de la variable arriba. */
  .ficha.on::before { content: ''; position: absolute; left: 0; right: 0; top: 0; height: 2px; background: var(--tono); }
  .nombre { display: flex; align-items: center; gap: 6px; }
  .on .nombre { color: var(--fg-0); }
  .marca { width: 6px; height: 6px; background: var(--tono); flex: none; }
  .cifra { display: flex; align-items: baseline; gap: 5px; min-width: 0; }
  .valor { font-size: var(--fs-figure); font-weight: 600; line-height: 1.1; letter-spacing: -0.02em; }
  .unidad { font-size: var(--fs-small); color: var(--fg-2); white-space: nowrap; }
  .nota { font-size: var(--fs-small); line-height: 1.4; color: var(--fg-1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .vacia .valor { color: var(--fg-3); }
  .ficha:focus-visible { outline-offset: -2px; z-index: 1; }
</style>
