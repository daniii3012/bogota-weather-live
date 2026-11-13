<script lang="ts">
  import { app } from '../app/store.svelte';
  import { ctl } from '../app/controller.svelte';
  import { NIVEL_DESLIZ } from '../map/capas';
  import { rampa } from '../domain/scales';
  import { fecha } from '../domain/fmt';
  import Cabecera from './Cabecera.svelte';
  import Interruptor from './Interruptor.svelte';

  const a = $derived(app.alertas);
  // Sectores por localidad, de la alerta más alta a la más baja.
  const porLocalidad = $derived.by(() => {
    const m = new Map<string, { nivel: number; sector: string }[]>();
    for (const f of a?.deslizamientos.features ?? []) {
      const loc = f.properties.localidad.toLowerCase().replace(/(^|\s)\p{L}/gu, (c) => c.toUpperCase());
      (m.get(loc) ?? m.set(loc, []).get(loc)!).push({ nivel: f.properties.nivel, sector: f.properties.sector.toLowerCase().replace(/(^|\s)\p{L}/gu, (c) => c.toUpperCase()) });
    }
    return [...m.entries()].map(([loc, s]) => ({ loc, sectores: s.sort((x, y) => y.nivel - x.nivel || x.sector.localeCompare(y.sector, 'es')) })).sort((x, y) => y.sectores[0].nivel - x.sectores[0].nivel || y.sectores.length - x.sectores.length);
  });
  const cuenta = (n: number) => a?.deslizamientos.features.filter((f) => f.properties.nivel === n).length ?? 0;
  const CLASES_SEQUIA = ['0–1', '2–3', '4–5', '6–7'];
</script>

<Cabecera titulo="Alertas" sub="Modelos del IDIGER" />
<p class="nota"><span class="marca" aria-hidden="true"></span>Esta página <strong>no emite alertas</strong>: muestra las capas que publica el IDIGER. Ante una emergencia, llama a la línea <strong>123</strong>.</p>

{#if a}
  <section class="sec">
    <header><h3 class="label">Deslizamientos por lluvia</h3>
      <label class="ver">En el mapa <Interruptor etiqueta="Ver deslizamientos en el mapa" activo={app.capas.deslizamientos} onchange={(x) => ctl()?.capa('deslizamientos', x)} /></label>
    </header>
    <p class="dim">Sectores donde la lluvia acumulada hace probable un deslizamiento.{#if a.deslizamientos.fecha}{' '}Actualizado el {fecha(a.deslizamientos.fecha)}.{/if}</p>
    <ul class="niveles">
      {#each [4, 3, 2] as n (n)}
        <li><span class="rombo" style:background={NIVEL_DESLIZ[n].color} aria-hidden="true"></span>Probabilidad {NIVEL_DESLIZ[n].texto.toLowerCase()}<strong class="num">{cuenta(n)}</strong></li>
      {/each}
    </ul>
    {#each porLocalidad as g (g.loc)}
      <details>
        <summary><span>{g.loc}</span><span class="num faint">{g.sectores.length}</span></summary>
        <ul class="sectores">
          {#each g.sectores as s, i (i)}
            <li><span class="rombo" style:background={NIVEL_DESLIZ[s.nivel]?.color} aria-hidden="true"></span><span class="sector">{s.sector}</span><span class="faint nivel">{NIVEL_DESLIZ[s.nivel]?.texto}</span></li>
          {/each}
        </ul>
      </details>
    {/each}
  </section>

  <section class="sec">
    <header><h3 class="label">Días sin lluvia</h3>
      <label class="ver">En el mapa <Interruptor etiqueta="Ver días sin lluvia en el mapa" activo={app.capas.sequia} onchange={(x) => ctl()?.capa('sequia', x)} /></label>
    </header>
    <p class="dim">Días sin lluvia de los últimos siete. Cuantos más, más propensa está la cobertura vegetal a incendios.{#if a.sequia.fecha}{' '}Actualizado el {fecha(a.sequia.fecha)}.{/if}</p>
    <ul class="escala" aria-label="Escala de días sin lluvia">
      {#each rampa('sequia', app.tema) as c, i (c)}
        <li><span style:background={c}></span>{CLASES_SEQUIA[i]}</li>
      {/each}
    </ul>
  </section>
{:else}
  <p class="solo faint">Cargando…</p>
{/if}

<style>
  .nota { margin: var(--sp-4); padding: var(--sp-2) var(--sp-3); border: 1px solid var(--line-2); font-size: var(--fs-small); color: var(--fg-1); }
  .nota strong { color: var(--fg-0); font-weight: 600; }
  .marca { display: inline-block; width: 6px; height: 6px; background: var(--warn); margin-right: var(--sp-2); vertical-align: 1px; }
  .ver { display: flex; align-items: center; gap: var(--sp-2); font-family: var(--font-mono); font-size: var(--fs-label); letter-spacing: 0.04em; color: var(--fg-2); }
  .niveles, .sectores { list-style: none; margin: 0; padding: 0; display: grid; }
  .niveles li { display: flex; align-items: center; gap: var(--sp-2); padding: 6px 0; border-top: 1px solid var(--line-1); color: var(--fg-1); }
  .niveles li:first-child { border-top: 0; }
  .niveles strong { margin-left: auto; color: var(--fg-0); font-weight: 600; }
  .rombo { width: 8px; height: 8px; transform: rotate(45deg); flex: none; margin: 0 3px; }
  details { border-top: 1px solid var(--line-1); margin: 0 calc(var(--sp-4) * -1); }
  summary { display: flex; justify-content: space-between; align-items: center; min-height: var(--row); padding: 0 var(--sp-4); cursor: pointer; list-style: none; }
  summary::-webkit-details-marker { display: none; }
  summary:hover { background: var(--bg-2); }
  .sectores { padding: 0 var(--sp-4) var(--sp-2); font-size: var(--fs-small); color: var(--fg-1); }
  .sectores li { display: flex; align-items: center; gap: var(--sp-2); padding: 4px 0; }
  .sector { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .nivel { font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; }
  .escala { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 2px; font-family: var(--font-mono); font-size: 10px; color: var(--fg-1); text-align: center; }
  .escala span { display: block; height: 8px; margin-bottom: 4px; }
  .solo { padding: var(--sp-4); }
</style>
