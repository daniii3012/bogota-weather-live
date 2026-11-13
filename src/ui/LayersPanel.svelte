<script lang="ts">
  import { app } from '../app/store.svelte';
  import { ctl } from '../app/controller.svelte';
  import type { Producto } from '../live/external';
  import Interruptor from './Interruptor.svelte';
  import Segmentos from './Segmentos.svelte';

  type Sat = Producto | 'no';
</script>

{#if app.capasAbiertas}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="fondo" onclick={() => (app.capasAbiertas = false)}></div>
  <section class="capas" class:narrow={app.narrow} style:--sheet="{app.sheetHeight}px" aria-label="Capas del mapa">
    <h3 class="label">Capas</h3>
    <div class="fila">
      <span class="texto"><span>Radar del IDIGER</span><span class="faint sub">Lluvia que cae ahora, cada 3 min</span></span>
      <Interruptor etiqueta="Radar" activo={app.capas.radar} onchange={(x) => ctl()?.capa('radar', x)} />
    </div>
    {#if app.capas.radar}
      <label class="fila rango"><span class="faint sub">Opacidad del radar</span>
        <input type="range" min="0.2" max="1" step="0.05" value={app.opacidadRadar} oninput={(e) => ctl()?.opacidad(Number(e.currentTarget.value))} />
      </label>
    {/if}
    <div class="fila">
      <span class="texto"><span>Localidades</span><span class="faint sub">Límites y nombres</span></span>
      <Interruptor etiqueta="Localidades" activo={app.capas.localidades} onchange={(x) => ctl()?.capa('localidades', x)} />
    </div>
    <div class="fila">
      <span class="texto"><span>Ríos y quebradas</span><span class="faint sub">Niveles y su estado</span></span>
      <Interruptor etiqueta="Ríos y quebradas" activo={app.capas.rios} onchange={(x) => ctl()?.capa('rios', x)} />
    </div>
    <div class="fila">
      <span class="texto"><span>Deslizamientos</span><span class="faint sub">Sectores en alerta por lluvia</span></span>
      <Interruptor etiqueta="Deslizamientos" activo={app.capas.deslizamientos} onchange={(x) => ctl()?.capa('deslizamientos', x)} />
    </div>
    <div class="fila">
      <span class="texto"><span>Días sin lluvia</span><span class="faint sub">Zonas propensas a incendios</span></span>
      <Interruptor etiqueta="Días sin lluvia" activo={app.capas.sequia} onchange={(x) => ctl()?.capa('sequia', x)} />
    </div>
    <div class="fila sat">
      <span class="texto"><span>Satélite GOES-19</span><span class="faint sub">Nubes sobre la región, cada 10 min</span></span>
      <Segmentos etiqueta="Satélite" valor={(app.capas.satelite ?? 'no') as Sat} onchange={(x) => ctl()?.capa('satelite', x === 'no' ? null : x)}
        opciones={[{ id: 'no', texto: 'No' }, { id: 'color', texto: 'Color' }, { id: 'ir', texto: 'Infrarrojo' }]} />
    </div>
  </section>
{/if}

<style>
  .fondo { position: absolute; inset: 0; z-index: 6; }
  .capas { position: absolute; right: calc(var(--sp-4) + 44px); bottom: calc(var(--sp-6) + 20px); width: 292px; z-index: 7; background: var(--bg-1); border: 1px solid var(--line-2); box-shadow: var(--shadow); padding: var(--sp-3) var(--sp-4); display: grid; }
  .capas.narrow { right: calc(var(--sp-3) + 52px); bottom: calc(var(--sheet) + var(--sp-3)); width: min(292px, calc(100vw - 80px)); }
  h3 { margin-bottom: var(--sp-2); }
  .fila { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3); min-height: 44px; border-top: 1px solid var(--line-1); }
  .texto { display: grid; min-width: 0; }
  .sub { font-size: var(--fs-label); }
  .rango { min-height: 32px; border-top: 0; margin-top: -6px; }
  input[type='range'] { width: 120px; accent-color: var(--fg-0); }
  .sat { flex-direction: column; align-items: stretch; gap: var(--sp-2); padding: var(--sp-2) 0; }
</style>
