<script lang="ts">
  import { app } from '../app/store.svelte';
  import { ctl, traerPronostico } from '../app/controller.svelte';
  import { frase, orden, porLocalidad, resumen } from '../domain/stats';
  import { META, llueve, intensidad, rumbo, valor } from '../domain/variables';
  import { hora, num } from '../domain/fmt';
  import { km } from '../domain/geo';
  import { cielo } from '../live/external';
  import { ESTADO_RIO, NIVEL_DESLIZ } from '../map/capas';
  import type { EstadoNivel } from '../live/contract';
  import VarTiles from './VarTiles.svelte';
  import Filas from './Filas.svelte';
  import Segmentos from './Segmentos.svelte';
  import Cielo from './Cielo.svelte';
  import { fichasCiudad, filaEstacion, filaLocalidad, tope } from './fichas';

  const es = $derived(app.datos?.estaciones ?? []);
  const r = $derived(resumen(es, app.now));
  const v = $derived(app.variable);
  const meta = $derived(META[v]);

  let por = $state<'estaciones' | 'localidades'>('estaciones');
  let todas = $state(false);
  const CORTAS = 6;

  // Lista de la variable elegida. En lluvia solo entran las estaciones donde ha llovido hoy.
  const filasEst = $derived(orden(es, v, app.now).filter((x) => v !== 'lluvia' || x.v > 0).map((x) => filaEstacion(x.e, v, app.now)));
  const filasLoc = $derived(porLocalidad(es, app.now).filter((l) => l[v] !== null && (v !== 'lluvia' || l[v]! > 0)).sort((a, b) => b[v]! - a[v]!).map((l) => filaLocalidad(l, v)));
  const filas = $derived(por === 'estaciones' ? filasEst : filasLoc);
  const max = $derived(tope(v, filas.map((f) => f.v ?? 0)));

  const titular = $derived.by(() => {
    if (v === 'lluvia') return frase(r);
    if (v === 'temp') {
      const a = r.temp.min, b = r.temp.max;
      if (!a || !b) return { titulo: 'Sin datos de temperatura', detalle: 'Las estaciones no han reportado en la última media hora.' };
      return { titulo: `Entre ${num(valor(a, 'temp', app.now), 1)}° y ${num(valor(b, 'temp', app.now), 1)}°`, detalle: `La más fría, ${a.nombre} (${a.localidad}); la más cálida, ${b.nombre} (${b.localidad}).` };
    }
    if (v === 'hum') {
      if (r.hum.media === null) return { titulo: 'Sin datos de humedad', detalle: 'Las estaciones no han reportado en la última media hora.' };
      return { titulo: `Humedad media del ${num(r.hum.media, 0)} %`, detalle: r.hum.media >= 85 ? 'Aire muy húmedo en la ciudad.' : r.hum.media >= 60 ? 'Humedad habitual para Bogotá.' : 'Aire seco para Bogotá.' };
    }
    const m = r.viento.max;
    if (!m?.viento) return { titulo: 'Sin datos de viento', detalle: 'Las estaciones no han reportado en la última media hora.' };
    return { titulo: `Viento de hasta ${num(m.viento.v, 1)} m/s`, detalle: `En ${m.nombre} (${m.localidad})${m.viento.dir !== null ? `, del ${rumbo(m.viento.dir)}` : ''}.` };
  });

  // Estación más cercana a la ubicación, con lo que pasa ahí.
  const cerca = $derived(app.yo && app.datos ? ctl()?.cercana(v) ?? null : null);
  const cercaTexto = $derived.by(() => {
    if (!cerca) return '';
    const e = cerca.x, x = valor(e, v, app.now);
    if (v === 'lluvia') return llueve(e, app.now) ? `Llueve: ${intensidad(e.lluvia!.min)} · ${num(x, 1)} mm hoy` : x ? `Sin lluvia ahora · ${num(x, 1)} mm hoy` : 'Sin lluvia hoy';
    return `${num(x, meta.dec)} ${meta.unidad}`;
  });

  const favoritas = $derived(es.filter((e) => app.favoritas.includes(e.id)).map((e) => filaEstacion(e, v, app.now)));

  // Próximas seis horas del pronóstico.
  const horas = $derived((app.pronostico?.horas ?? []).filter((h) => h.t > app.now - 1800).slice(0, 6));

  const ORDEN_RIO: EstadoNivel[] = ['alto', 'medio', 'bajo', 'normal', 'sin-umbral', 'sin-dato'];
  const rios = $derived(ORDEN_RIO.map((e) => ({ e, n: app.niveles?.rios.filter((x) => x.estado === e).length ?? 0 })).filter((x) => x.n));
  const desliz = $derived([4, 3, 2].map((n) => ({ n, c: app.alertas?.deslizamientos.features.filter((f) => f.properties.nivel === n).length ?? 0 })).filter((x) => x.c));

  // El inicio queda siempre montado: el pronóstico se revisa al abrir y cada diez minutos (la función
  // no pide nada si el que tiene es de hace menos de media hora).
  $effect(() => { void Math.floor(app.now / 600); void traerPronostico(); });
</script>

{#if app.datos}
  <VarTiles fichas={fichasCiudad(r, app.now)} etiqueta="Clima de la ciudad: elige la variable del mapa" />

  <section class="titular">
    <h2>{titular.titulo}</h2>
    <p class="dim">{titular.detalle}</p>
    {#if cerca}
      <a class="cerca" href="#/estacion/{cerca.x.id}">
        <span class="label">Cerca de ti · {km(cerca.km)}</span>
        <span class="donde">{cerca.x.nombre}</span>
        <span class="dim">{cercaTexto}</span>
      </a>
    {:else}
      <button class="ubicar" onclick={() => ctl()?.ubicar()} disabled={app.ubicando}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><circle cx="8" cy="8" r="4" /><path d="M8 0v3M8 13v3M0 8h3M13 8h3" /></svg>
        {app.ubicando ? 'Buscando tu ubicación…' : v === 'lluvia' ? '¿Llueve donde estoy?' : '¿Cómo está donde estoy?'}
      </button>
    {/if}
  </section>

  {#if favoritas.length}
    <section class="sec">
      <header><h3 class="label">Favoritas</h3></header>
      <Filas filas={favoritas} max={tope(v, favoritas.map((f) => f.v ?? 0))} tono={meta.tono} unidad={meta.unidad} />
    </section>
  {/if}

  <section class="sec">
    <header>
      <h3 class="label">{meta.medida}</h3>
      <Segmentos etiqueta="Agrupar por" valor={por} onchange={(x) => { por = x; todas = false; }} opciones={[{ id: 'estaciones', texto: 'Estaciones' }, { id: 'localidades', texto: 'Localidades' }]} />
    </header>
    <Filas filas={todas ? filas : filas.slice(0, CORTAS)} {max} tono={meta.tono} unidad={meta.unidad}
      vacio={v === 'lluvia' ? 'Ninguna estación ha registrado lluvia hoy.' : 'Sin lecturas en la última media hora.'} />
    {#if filas.length > CORTAS}
      <button class="mas" onclick={() => (todas = !todas)}>{todas ? 'Ver menos' : `Ver las ${filas.length}`}</button>
    {/if}
  </section>

  <section class="sec">
    <header><h3 class="label">Próximas horas</h3><a href="#/pronostico">7 días →</a></header>
    {#if horas.length}
      <ol class="horas">
        {#each horas as h (h.t)}
          {@const c = cielo(h.codigo)}
          <li title={c.texto}>
            <span class="num faint">{hora(h.t).slice(0, 2)} h</span>
            <Cielo tipo={c.tipo} />
            <span class="prob num" class:alta={h.prob >= 50}>{h.prob}%</span>
            <span class="temp">{num(h.temp, 0)}°</span>
          </li>
        {/each}
      </ol>
      <p class="pie faint">Probabilidad de lluvia y temperatura. Modelo numérico, no oficial.</p>
    {:else}
      <p class="faint">{app.pronosticoError ? 'No se pudo cargar el pronóstico.' : 'Cargando…'}</p>
    {/if}
  </section>

  <section class="sec">
    <header><h3 class="label">Ríos y quebradas</h3><a href="#/rios">Ver niveles →</a></header>
    {#if rios.length}
      <ul class="estados">
        {#each rios as x (x.e)}
          <li><span class="rombo" style:background={ESTADO_RIO[x.e].color ?? 'var(--fg-3)'} aria-hidden="true"></span><strong>{x.n}</strong> {ESTADO_RIO[x.e].texto.toLowerCase()}</li>
        {/each}
      </ul>
    {:else}
      <p class="faint">Cargando…</p>
    {/if}
  </section>

  <section class="sec">
    <header><h3 class="label">Alertas del IDIGER</h3><a href="#/alertas">Ver alertas →</a></header>
    {#if app.alertas}
      {#if desliz.length}
        <ul class="estados">
          {#each desliz as d (d.n)}
            <li><span class="rombo" style:background={NIVEL_DESLIZ[d.n].color} aria-hidden="true"></span><strong>{d.c}</strong> {d.c === 1 ? 'sector' : 'sectores'} con probabilidad {NIVEL_DESLIZ[d.n].texto.toLowerCase()} de deslizamiento</li>
          {/each}
        </ul>
      {:else}
        <p class="dim">Sin sectores en alerta por deslizamiento.</p>
      {/if}
    {:else}
      <p class="faint">Cargando…</p>
    {/if}
  </section>

  <footer class="pie-movil">
    <p class="faint">Proyecto no oficial. Datos crudos del IDIGER, sin validar. No reemplaza los canales oficiales de alerta.</p>
    <nav><a href="#/fuentes">Fuentes y avisos</a><a href="#/configuracion">Configuración</a></nav>
  </footer>
{:else}
  <div class="espera">
    <span class="label">{app.estado === 'error' ? 'Sin conexión con los datos' : 'Cargando el clima de Bogotá'}</span>
    {#if app.estado === 'error'}<p class="faint">Se vuelve a intentar cada 15 segundos.</p>{:else}<span class="bar"><span></span></span>{/if}
  </div>
{/if}

<style>
  .titular { padding: var(--sp-4); display: grid; gap: var(--sp-2); }
  h2 { font-size: var(--fs-title); font-weight: 600; line-height: 1.2; letter-spacing: -0.01em; }
  .ubicar, .cerca { margin-top: var(--sp-2); border: 1px solid var(--line-2); text-decoration: none; transition: border-color var(--t-out), background var(--t-out); }
  .ubicar { display: flex; align-items: center; gap: var(--sp-2); height: 36px; padding: 0 var(--sp-3); color: var(--fg-1); font-size: var(--fs-body); }
  .ubicar:hover, .cerca:hover { border-color: var(--fg-3); background: var(--bg-2); color: var(--fg-0); }
  .cerca { display: grid; gap: 2px; padding: var(--sp-2) var(--sp-3); }
  .donde { font-size: var(--fs-row); font-weight: 600; }
  .mas { height: 32px; font-family: var(--font-mono); font-size: var(--fs-label); letter-spacing: 0.04em; color: var(--fg-2); justify-self: start; }
  .mas:hover { color: var(--fg-0); }

  .horas { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(6, 1fr); gap: 1px; background: var(--line-1); border: 1px solid var(--line-1); }
  .horas li { display: grid; justify-items: center; gap: 4px; padding: var(--sp-2) 0; background: var(--bg-1); color: var(--fg-1); }
  .horas .num { font-size: var(--fs-label); }
  .prob { color: var(--fg-2); }
  .prob.alta { color: var(--fg-0); font-weight: 600; }
  .temp { font-size: var(--fs-row); font-weight: 600; color: var(--fg-0); }
  .pie { font-size: var(--fs-label); }

  .estados { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; color: var(--fg-1); }
  .estados li { display: flex; align-items: center; gap: var(--sp-2); }
  .estados strong { color: var(--fg-0); font-weight: 600; }
  .rombo { width: 8px; height: 8px; transform: rotate(45deg); flex: none; margin: 0 2px; }

  .pie-movil { padding: var(--sp-4); border-top: 1px solid var(--line-1); display: grid; gap: var(--sp-3); font-size: var(--fs-small); }
  .pie-movil nav { display: flex; gap: var(--sp-4); }
  .pie-movil a { color: var(--fg-1); }
  @media (min-width: 760px) { .pie-movil nav { display: none; } }

  .espera { display: grid; gap: var(--sp-3); justify-items: start; padding: var(--sp-6) var(--sp-4); }
  .bar { width: 160px; height: 1px; background: var(--line-2); position: relative; overflow: hidden; }
  .bar span { position: absolute; top: 0; bottom: 0; width: 40%; background: var(--fg-0); animation: carga 1.1s var(--ease-out) infinite; }
  @keyframes carga { from { left: -40%; } to { left: 100%; } }
</style>
