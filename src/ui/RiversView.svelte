<script lang="ts">
  import { app } from '../app/store.svelte';
  import { ESTADO_RIO } from '../map/capas';
  import { num, cuando } from '../domain/fmt';
  import type { EstadoNivel, Rio } from '../live/contract';
  import Cabecera from './Cabecera.svelte';

  // Agrupados por cauce; dentro de cada uno, primero lo que está en alerta.
  const PESO: Record<EstadoNivel, number> = { alto: 0, medio: 1, bajo: 2, normal: 3, 'sin-umbral': 4, 'sin-dato': 5 };
  const grupos = $derived.by(() => {
    const m = new Map<string, Rio[]>();
    for (const r of app.niveles?.rios ?? []) (m.get(r.cauce) ?? m.set(r.cauce, []).get(r.cauce)!).push(r);
    return [...m.entries()]
      .map(([cauce, rios]) => ({ cauce, rios: rios.sort((a, b) => PESO[a.estado] - PESO[b.estado] || a.nombre.localeCompare(b.nombre, 'es')) }))
      .sort((a, b) => PESO[a.rios[0].estado] - PESO[b.rios[0].estado] || a.cauce.localeCompare(b.cauce, 'es'));
  });
  const ultima = $derived(Math.max(0, ...(app.niveles?.rios ?? []).map((r) => r.t ?? 0)));
</script>

<Cabecera titulo="Ríos y quebradas" sub="Niveles de la red del IDIGER" />
{#if app.niveles}
  <section class="intro">
    <p class="dim">El estado compara la altura del agua con los umbrales de cada punto. El <strong>borde libre</strong> es lo que falta para el desbordamiento.</p>
    <ul class="leyenda">
      {#each ['normal', 'bajo', 'medio', 'alto'] as const as e (e)}
        <li><span class="rombo" style:background={ESTADO_RIO[e].color} aria-hidden="true"></span>{ESTADO_RIO[e].texto}</li>
      {/each}
    </ul>
  </section>
  {#each grupos as g (g.cauce)}
    <section class="sec">
      <header><h3 class="label">{g.cauce}</h3></header>
      <ul class="rios">
        {#each g.rios as r (r.id)}
          <li>
            <a href="#/rio/{r.id}">
              <span class="rombo" style:background={ESTADO_RIO[r.estado].color ?? 'var(--fg-3)'} aria-hidden="true"></span>
              <span class="texto"><span class="nombre">{r.nombre}</span><span class="faint sub">{ESTADO_RIO[r.estado].texto} · {r.localidad}</span></span>
              <span class="borde">{#if r.borde !== null}<span class="num">{num(r.borde, 2)}<span class="u">m</span></span><span class="faint sub">borde libre</span>{:else}<span class="faint num">sin dato</span>{/if}</span>
            </a>
          </li>
        {/each}
      </ul>
    </section>
  {/each}
  <p class="pie faint">{#if ultima}Última lectura: {cuando(ultima, app.now)}.{' '}{/if}Datos crudos del IDIGER, sin validar.</p>
{:else}
  <p class="pie faint">Cargando…</p>
{/if}

<style>
  .intro { padding: var(--sp-4); display: grid; gap: var(--sp-3); }
  .intro strong { color: var(--fg-0); font-weight: 600; }
  .leyenda { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px var(--sp-4); font-size: var(--fs-small); color: var(--fg-1); }
  .leyenda li { display: flex; align-items: center; gap: var(--sp-2); }
  .rombo { width: 8px; height: 8px; transform: rotate(45deg); flex: none; margin: 0 3px; }
  .rios { list-style: none; margin: 0 calc(var(--sp-4) * -1); padding: 0; }
  a { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: var(--sp-3); min-height: var(--row); padding: 6px var(--sp-4); text-decoration: none; border-top: 1px solid var(--line-1); transition: background var(--t-out); }
  li:first-child a { border-top: 0; }
  a:hover { background: var(--bg-2); }
  .texto, .borde { display: grid; min-width: 0; }
  .borde { justify-items: end; }
  .nombre { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sub { font-size: var(--fs-label); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .u { color: var(--fg-2); font-size: var(--fs-label); margin-left: 3px; }
  .pie { padding: var(--sp-4); border-top: 1px solid var(--line-1); font-size: var(--fs-label); }
</style>
