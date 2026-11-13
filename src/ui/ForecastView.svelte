<script lang="ts">
  import { onMount } from 'svelte';
  import { app } from '../app/store.svelte';
  import { traerPronostico } from '../app/controller.svelte';
  import { cielo } from '../live/external';
  import { dia, diaCorto, hora, num, ymd } from '../domain/fmt';
  import Cabecera from './Cabecera.svelte';
  import Cielo from './Cielo.svelte';
  import Grafica from '../charts/Grafica.svelte';

  onMount(() => { void traerPronostico(); });
  const p = $derived(app.pronostico);
  // Las próximas 24 horas, desde la hora en curso.
  const horas = $derived((p?.horas ?? []).filter((h) => h.t > app.now - 3600).slice(0, 24));
  const t0 = $derived(horas[0]?.t ?? 0), t1 = $derived(horas.length ? horas[horas.length - 1].t + 3600 : 1);
  const dias = $derived(p?.dias ?? []);
  // Rango de temperaturas de la semana: cada día se dibuja dentro de él.
  const semana = $derived(dias.length ? { min: Math.min(...dias.map((d) => d.min)), max: Math.max(...dias.map((d) => d.max)) } : { min: 0, max: 1 });
  const pos = (v: number) => ((v - semana.min) / (semana.max - semana.min || 1)) * 100;
</script>

<Cabecera titulo="Pronóstico" sub="Bogotá · próximos 7 días" />
{#if p}
  <p class="nota"><span class="marca" aria-hidden="true"></span>Modelo numérico de Open-Meteo: <strong>no es el pronóstico oficial</strong>. El del IDIGER se publica a diario en <a href="https://www.sab.gov.co/pronostico" target="_blank" rel="noopener">sab.gov.co</a>.</p>

  <section class="sec">
    <header><h3 class="label">Probabilidad de lluvia · 24 horas</h3></header>
    <Grafica puntos={horas.map((h) => [h.t, h.prob])} tipo="barras" tono="var(--v-lluvia)" unidad="%" dec={0} paso={3600} {t0} {t1} alto={120} tabla={3600}
      nombre="Probabilidad de lluvia por hora en las próximas 24 horas" />
  </section>
  <section class="sec">
    <header><h3 class="label">Temperatura · 24 horas</h3></header>
    <Grafica puntos={horas.map((h) => [h.t, h.temp])} tipo="linea" tono="var(--v-temp)" unidad="°C" dec={1} {t0} t1={t1 - 3600} alto={120} tabla={3600}
      nombre="Temperatura por hora en las próximas 24 horas" />
  </section>

  <section class="sec">
    <header><h3 class="label">Por día</h3></header>
    <ol class="dias">
      {#each dias as d (d.t)}
        {@const c = cielo(d.codigo)}
        <li>
          <span class="dia">{ymd(d.t + 43200) === ymd(app.now) ? 'Hoy' : dia(d.t + 43200)}<span class="faint fecha">{diaCorto(d.t + 43200).split(' ')[1]}</span></span>
          <span class="cielo dim"><Cielo tipo={c.tipo} /><span>{c.texto}</span></span>
          <span class="lluvia num">{d.prob}%<span class="faint mm">{num(d.mm, 1)} mm</span></span>
          <span class="temps num">
            <span class="faint">{num(d.min, 0)}°</span>
            <span class="rango" aria-hidden="true"><span style:left="{pos(d.min)}%" style:width="{Math.max(4, pos(d.max) - pos(d.min))}%"></span></span>
            <span>{num(d.max, 0)}°</span>
          </span>
        </li>
      {/each}
    </ol>
    <p class="pie faint">Probabilidad máxima de lluvia y milímetros esperados; temperatura mínima y máxima. Actualizado a las {hora(p.t)}.</p>
  </section>
{:else}
  <p class="pie faint solo">{app.pronosticoError ? 'No se pudo cargar el pronóstico. Revisa la conexión.' : 'Cargando…'}</p>
{/if}

<style>
  .nota { margin: var(--sp-4); padding: var(--sp-2) var(--sp-3); border: 1px solid var(--line-2); font-size: var(--fs-small); color: var(--fg-1); }
  .nota strong { color: var(--fg-0); font-weight: 600; }
  .marca { display: inline-block; width: 6px; height: 6px; background: var(--warn); margin-right: var(--sp-2); vertical-align: 1px; }
  .dias { list-style: none; margin: 0; padding: 0; }
  .dias li { display: grid; grid-template-columns: 78px minmax(0, 1fr) 54px 112px; align-items: center; gap: var(--sp-2); min-height: 44px; border-top: 1px solid var(--line-1); }
  .dias li:first-child { border-top: 0; }
  .dia { display: grid; text-transform: capitalize; }
  .fecha { font-family: var(--font-mono); font-size: 10px; }
  .cielo { display: flex; align-items: center; gap: 6px; min-width: 0; font-size: var(--fs-small); }
  .cielo span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .lluvia { display: grid; justify-items: end; font-size: var(--fs-small); }
  .mm { font-size: 10px; }
  .temps { display: grid; grid-template-columns: 24px 1fr 24px; align-items: center; gap: 6px; font-size: var(--fs-small); text-align: right; }
  .rango { position: relative; height: 4px; background: var(--bg-3); }
  .rango span { position: absolute; top: 0; bottom: 0; background: var(--v-temp); }
  .pie { font-size: var(--fs-label); }
  .solo { padding: var(--sp-4); }
  @media (max-width: 420px) { .dias li { grid-template-columns: 64px minmax(0, 1fr) 46px 96px; } .cielo span { display: none; } }
</style>
