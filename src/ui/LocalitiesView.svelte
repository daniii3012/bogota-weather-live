<script lang="ts">
  import { app } from '../app/store.svelte';
  import { porLocalidad } from '../domain/stats';
  import { META } from '../domain/variables';
  import Cabecera from './Cabecera.svelte';
  import VarTiles from './VarTiles.svelte';
  import Filas from './Filas.svelte';
  import { resumen } from '../domain/stats';
  import { fichasCiudad, filaLocalidad, tope } from './fichas';

  const v = $derived(app.variable);
  const es = $derived(app.datos?.estaciones ?? []);
  const filas = $derived(porLocalidad(es, app.now).sort((a, b) => (b[v] ?? -Infinity) - (a[v] ?? -Infinity) || a.nombre.localeCompare(b.nombre, 'es')).map((l) => filaLocalidad(l, v)));
  const NOTA = { lluvia: 'Mayor acumulado del día entre las estaciones de cada localidad.', temp: 'Temperatura media de las estaciones de cada localidad.', hum: 'Humedad media de las estaciones de cada localidad.', viento: 'Viento máximo entre las estaciones de cada localidad.' } as const;
</script>

<Cabecera titulo="Localidades" sub="{filas.length} con estaciones" />
<VarTiles fichas={fichasCiudad(resumen(es, app.now), app.now)} />
<section class="sec">
  <header><h3 class="label">{META[v].medida}</h3></header>
  <Filas {filas} max={tope(v, filas.map((f) => f.v ?? 0))} tono={META[v].tono} unidad={META[v].unidad} />
  <p class="faint pie">{NOTA[v]}</p>
</section>

<style>
  .pie { font-size: var(--fs-label); }
</style>
