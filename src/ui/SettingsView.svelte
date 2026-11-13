<script lang="ts">
  import { app } from '../app/store.svelte';
  import { ctl } from '../app/controller.svelte';
  import { themePref, type ThemePref } from '../app/theme';
  import { API_BASE } from '../live/api';
  import { cuando } from '../domain/fmt';
  import Cabecera from './Cabecera.svelte';
  import Segmentos from './Segmentos.svelte';

  let tema = $state<ThemePref>(themePref());
  const FUENTES = { lluvia: 'Lluvia', temp: 'Temperatura', hum: 'Humedad', viento: 'Viento' } as const;
</script>

<Cabecera titulo="Configuración" />
<section class="sec">
  <header><h3 class="label">Tema</h3></header>
  <Segmentos etiqueta="Tema" valor={tema} onchange={(t) => { tema = t; ctl()?.tema(t); }}
    opciones={[{ id: 'system', texto: 'Del sistema' }, { id: 'dark', texto: 'Oscuro' }, { id: 'light', texto: 'Claro' }]} />
</section>
<section class="sec">
  <header><h3 class="label">Estado de los datos</h3></header>
  <dl>
    {#each Object.entries(FUENTES) as [k, nombre] (k)}
      {@const f = app.datos?.fuentes[k as keyof typeof FUENTES]}
      <div><dt>{nombre}</dt><dd class="num" class:mal={!f?.ok}>{f ? `${f.ok ? 'al día' : 'copia vencida'} · ${cuando(f.t, app.now)}` : 'sin respuesta'}</dd></div>
    {/each}
    <div><dt>Radar</dt><dd class="num">{app.radar?.cuadros.length ? `último cuadro ${cuando(app.radar.cuadros[app.radar.cuadros.length - 1].t, app.now)}` : 'sin cuadros'}</dd></div>
  </dl>
  <p class="faint pie">Hora en que el intermediario leyó cada fuente del IDIGER. Lluvia cada minuto; lo demás cada tres.</p>
</section>
<section class="sec">
  <header><h3 class="label">Acerca de</h3></header>
  <p class="dim">Bogotá Weather Live, versión {__APP_VERSION__}. Proyecto no oficial y sin fines comerciales.</p>
  <p class="faint pie num">{API_BASE}</p>
  <p><a href="#/fuentes">Fuentes y avisos →</a></p>
</section>

<style>
  dl { margin: 0; display: grid; }
  dl div { display: flex; justify-content: space-between; gap: var(--sp-3); padding: 7px 0; border-top: 1px solid var(--line-1); }
  dl div:first-child { border-top: 0; padding-top: 0; }
  dt { color: var(--fg-2); }
  dd { margin: 0; font-size: var(--fs-small); }
  .mal { color: var(--warn); }
  .pie { font-size: var(--fs-label); overflow-wrap: anywhere; }
  a { color: var(--fg-0); }
</style>
