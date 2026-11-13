<script lang="ts">
  import { app } from '../app/store.svelte';
  import { porLocalidad } from '../domain/stats';
  import { META, valor } from '../domain/variables';
  import Cabecera from './Cabecera.svelte';
  import VarTiles from './VarTiles.svelte';
  import Filas from './Filas.svelte';
  import { fichasLocalidad, filaEstacion, tope } from './fichas';

  let { nombre }: { nombre: string } = $props();
  const l = $derived(porLocalidad(app.datos?.estaciones ?? [], app.now).find((x) => x.nombre === nombre) ?? null);
  const v = $derived(app.variable);
  // Todas las estaciones de la localidad: primero las que tienen dato, de mayor a menor.
  const filas = $derived(
    (l?.estaciones ?? [])
      .map((e) => ({ e, x: valor(e, v, app.now) }))
      .sort((a, b) => (b.x ?? -Infinity) - (a.x ?? -Infinity) || a.e.nombre.localeCompare(b.e.nombre, 'es'))
      .map(({ e }) => filaEstacion(e, v, app.now, e.alt ? `${e.alt} m s. n. m.` : 'Estación')),
  );
</script>

{#if l}
  <Cabecera titulo={l.nombre} sub="{l.estaciones.length} {l.estaciones.length === 1 ? 'estación' : 'estaciones'}" />
  <VarTiles fichas={fichasLocalidad(l)} etiqueta="Clima de la localidad: elige la variable" />
  <section class="sec">
    <header><h3 class="label">{META[v].medida}</h3><a href="#/localidades">Todas las localidades →</a></header>
    <Filas {filas} max={tope(v, filas.map((f) => f.v ?? 0))} tono={META[v].tono} unidad={META[v].unidad} />
  </section>
{:else if app.datos}
  <Cabecera titulo={nombre} sub="Sin estaciones" />
  <p class="sin dim">Esta localidad no tiene estaciones de la red hidrometeorológica.</p>
  <section class="sec"><a href="#/localidades">Ver todas las localidades →</a></section>
{/if}

<style>
  .sin { padding: var(--sp-4); }
</style>
