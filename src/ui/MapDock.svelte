<script lang="ts">
  /**
   * Lo que acompaña al mapa abajo a la izquierda: la línea de tiempo del radar (y la del satélite) y la
   * leyenda de lo que está a la vista. En el teléfono va sobre la hoja inferior.
   */
  import { app } from '../app/store.svelte';
  import { ctl } from '../app/controller.svelte';
  import { META } from '../domain/variables';
  import { NEUTRO, rampa, rotulos } from '../domain/scales';
  import { cuando, hace } from '../domain/fmt';
  import { PRODUCTOS } from '../live/external';
  import { NIVEL_DESLIZ } from '../map/capas';

  const v = $derived(app.variable);
  const colores = $derived(rampa(v, app.tema));
  const textos = $derived(rotulos(v));
  const QUE = { lluvia: 'mm hoy', temp: '°C', hum: '% de humedad', viento: 'm/s' } as const;

  const cuadros = $derived(app.capas.radar ? app.radar?.cuadros ?? [] : []);
  const actual = $derived(cuadros[app.cuadro] ?? null);
  const ultimo = $derived(cuadros.length ? cuadros[cuadros.length - 1].t : null);
  // El radar publica cada tres minutos: con más de un cuarto de hora, está detenido.
  const radarViejo = $derived(ultimo !== null && app.now - ultimo > 15 * 60);

  const sat = $derived(app.capas.satelite);
  const satT = $derived(app.satTiempos[app.satIndice] ?? null);

  // Arrastrar sobre la línea de tiempo recorre los cuadros.
  function recorrer(e: PointerEvent, n: number, poner: (i: number) => void) {
    if (e.type === 'pointermove' && e.buttons === 0) return;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    poner(Math.max(0, Math.min(n - 1, Math.floor(((e.clientX - r.left) / r.width) * n))));
  }
  function teclaRadar(e: KeyboardEvent) {
    if (e.key === 'ArrowLeft') ctl()?.cuadro(Math.max(0, app.cuadro - 1));
    else if (e.key === 'ArrowRight') ctl()?.cuadro(Math.min(cuadros.length - 1, app.cuadro + 1));
  }
  function teclaSat(e: KeyboardEvent) {
    if (e.key === 'ArrowLeft') app.satIndice = Math.max(0, app.satIndice - 1);
    else if (e.key === 'ArrowRight') app.satIndice = Math.min(app.satTiempos.length - 1, app.satIndice + 1);
  }
  // En el teléfono la leyenda muestra solo la escala de la variable; al tocarla se abren las demás.
  let abierta = $state(false);
  const extras = $derived(cuadros.length > 0 || app.capas.deslizamientos || app.capas.sequia);

  // Escala de reflectividad del radar del IDIGER, de 5 a 66 dBZ (la de su leyenda oficial).
  const RADAR = 'linear-gradient(90deg,#40e8d0 0%,#2fd45a 8%,#8be02a 25%,#f2e21c 38%,#f59a1b 49%,#ee4b2b 61%,#d81b60 74%,#a02bd8 87%,#5b3fe0 100%)';
</script>

<div class="dock" class:narrow={app.narrow} style:--sheet="{app.sheetHeight}px">
  {#if sat}
    <div class="tiempo">
      <div class="cab">
        <span class="label">Satélite · {PRODUCTOS[sat].nombre}</span>
        <span class="mono hora">{satT ? cuando(satT, app.now) : 'última imagen'}</span>
        {#if satT}<span class="mono faint">{hace(app.now - satT)}</span>{/if}
        <button class="texto" onclick={() => ctl()?.region()}>País</button>
        <button class="texto" onclick={() => ctl()?.ciudad()}>Bogotá</button>
      </div>
      {#if app.satTiempos.length > 1}
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <div class="pista" role="slider" tabindex="0" aria-label="Hora de la imagen del satélite" aria-valuemin={0} aria-valuemax={app.satTiempos.length - 1} aria-valuenow={app.satIndice} aria-valuetext={satT ? cuando(satT, app.now) : ''}
          onpointerdown={(e) => recorrer(e, app.satTiempos.length, (i) => (app.satIndice = i))} onpointermove={(e) => recorrer(e, app.satTiempos.length, (i) => (app.satIndice = i))} onkeydown={teclaSat}>
          {#each app.satTiempos as t, i (t)}<span class:on={i === app.satIndice} class:listo={true}></span>{/each}
        </div>
      {/if}
    </div>
  {/if}

  {#if cuadros.length}
    <div class="tiempo">
      <div class="cab">
        <button class="play" onclick={() => ctl()?.animar(!app.animando)} aria-label={app.animando ? 'Pausar el radar' : 'Reproducir el radar'} aria-pressed={app.animando}>
          {#if app.animando}
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M1.5 1h2.4v8H1.5zM6.1 1h2.4v8H6.1z" fill="currentColor" /></svg>
          {:else}
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 1l7 4-7 4z" fill="currentColor" /></svg>
          {/if}
        </button>
        <span class="label" class:viejo={radarViejo}>{radarViejo ? 'Radar sin actualizar' : 'Radar'}</span>
        {#if actual}
          <span class="mono hora">{cuando(actual.t, app.now)}</span>
          <span class="mono faint">{hace(app.now - actual.t)}</span>
        {/if}
      </div>
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <div class="pista" role="slider" tabindex="0" aria-label="Cuadro del radar" aria-valuemin={0} aria-valuemax={cuadros.length - 1} aria-valuenow={app.cuadro} aria-valuetext={actual ? cuando(actual.t, app.now) : ''}
        onpointerdown={(e) => recorrer(e, cuadros.length, (i) => ctl()?.cuadro(i))} onpointermove={(e) => recorrer(e, cuadros.length, (i) => ctl()?.cuadro(i))} onkeydown={teclaRadar}>
        {#each cuadros as c, i (c.t)}<span class:on={i === app.cuadro} class:listo={i >= cuadros.length - app.cuadrosListos}></span>{/each}
      </div>
    </div>
  {/if}

  <div class="leyenda">
    <div class="esc">
      <span class="label titulo">{META[v].nombre} <span class="que">· {QUE[v]}</span>
        {#if app.narrow && extras}<button class="mas" onclick={() => (abierta = !abierta)} aria-expanded={abierta} aria-label={abierta ? 'Ocultar las demás escalas' : 'Ver las demás escalas'}>{abierta ? '−' : '+'}</button>{/if}
      </span>
      <ol class="clases" style:--n={colores.length + (v === 'lluvia' ? 1 : 0)}>
        {#if v === 'lluvia'}<li><span style:background={NEUTRO[app.tema]}></span>0</li>{/if}
        {#each colores as c, i (c)}<li><span style:background={c}></span>{textos[i]}</li>{/each}
      </ol>
    </div>
    {#if cuadros.length && (!app.narrow || abierta)}
      <div class="esc">
        <span class="label">Radar <span class="que">· intensidad</span></span>
        <div class="grad" style:background={RADAR}></div>
        <div class="extremos"><span>ligera</span><span>moderada</span><span>fuerte</span><span>muy fuerte</span></div>
      </div>
    {/if}
    {#if app.capas.deslizamientos && (!app.narrow || abierta)}
      <div class="esc">
        <span class="label">Deslizamientos <span class="que">· probabilidad</span></span>
        <ol class="clases" style:--n={3}>
          {#each [2, 3, 4] as n (n)}<li><span style:background={NIVEL_DESLIZ[n].color}></span>{NIVEL_DESLIZ[n].texto}</li>{/each}
        </ol>
      </div>
    {/if}
    {#if app.capas.sequia && (!app.narrow || abierta)}
      <div class="esc">
        <span class="label">Días sin lluvia <span class="que">· de 7</span></span>
        <ol class="clases" style:--n={4}>
          {#each rampa('sequia', app.tema) as c, i (c)}<li><span style:background={c}></span>{['0–1', '2–3', '4–5', '6–7'][i]}</li>{/each}
        </ol>
      </div>
    {/if}
  </div>
</div>

<style>
  .dock { position: absolute; left: calc(var(--panel-w) + var(--sp-6)); bottom: var(--sp-3); width: 348px; display: grid; gap: var(--sp-2); z-index: 5; }
  .dock.narrow { left: var(--sp-3); right: calc(var(--sp-3) + 52px); width: auto; bottom: calc(var(--sheet) + var(--sp-3)); transition: bottom 260ms var(--ease-out); }
  .tiempo, .leyenda { background: var(--glass); border: 1px solid var(--line-2); box-shadow: var(--shadow); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
  .tiempo { padding: 6px var(--sp-2) var(--sp-2); display: grid; gap: 6px; }
  .cab { display: flex; align-items: center; gap: var(--sp-2); min-height: 24px; }
  .play { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; background: var(--fg-0); color: var(--bg-1); flex: none; }
  .hora { font-size: var(--fs-small); color: var(--fg-0); }
  .cab .faint { font-size: var(--fs-label); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
  .viejo { color: var(--warn); }
  .texto { font-family: var(--font-mono); font-size: var(--fs-label); letter-spacing: 0.04em; color: var(--fg-1); border: 1px solid var(--line-2); padding: 1px 6px; flex: none; }
  .texto:hover { color: var(--fg-0); border-color: var(--fg-3); }
  /* Un trazo por cuadro: los descargados, grises; el que se ve, en la tinta principal. */
  .pista { display: flex; gap: 2px; height: 18px; align-items: center; cursor: pointer; touch-action: none; }
  .pista span { flex: 1; height: 6px; background: var(--line-2); transition: height var(--t-out), background var(--t-out); }
  .pista span.listo { background: var(--fg-3); }
  .pista span.on { background: var(--fg-0); height: 14px; }
  .pista:focus-visible { outline-offset: 2px; }

  .leyenda { padding: var(--sp-2); display: grid; gap: var(--sp-2); }
  .esc { display: grid; gap: 4px; }
  .que { color: var(--fg-3); }
  .clases { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(var(--n), 1fr); gap: 2px; font-family: var(--font-mono); font-size: 10px; color: var(--fg-1); text-align: center; white-space: nowrap; }
  .clases span { display: block; height: 6px; margin-bottom: 3px; }
  .grad { height: 6px; }
  .extremos { display: flex; justify-content: space-between; font-family: var(--font-mono); font-size: 10px; color: var(--fg-1); }
  .titulo { display: flex; align-items: center; gap: 6px; }
  .mas { margin-left: auto; width: 24px; height: 18px; border: 1px solid var(--line-2); color: var(--fg-1); font-family: var(--font-mono); font-size: 12px; line-height: 1; display: flex; align-items: center; justify-content: center; }
  @media (pointer: coarse) { .play { width: 32px; height: 32px; } .pista { height: 26px; } }
  /* Teléfono: el radar en una sola fila (botón, hora y línea de tiempo) para tapar menos mapa. */
  .narrow .tiempo { grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: var(--sp-2); padding: 6px var(--sp-2); }
  .narrow .tiempo .cab .label:not(.viejo), .narrow .tiempo .cab .faint { display: none; }
  .narrow .leyenda { padding: 6px var(--sp-2); }
</style>
