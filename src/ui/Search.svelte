<script lang="ts">
  import { onMount } from 'svelte';
  import { app } from '../app/store.svelte';
  import { porLocalidad } from '../domain/stats';
  import { META, valor } from '../domain/variables';
  import { num } from '../domain/fmt';

  let q = $state('');
  let i = $state(0);
  let input: HTMLInputElement;
  const plano = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const v = $derived(app.variable);

  interface Item { href: string; nombre: string; sub: string; valor: string }
  const todos = $derived.by((): Item[] => {
    const es = app.datos?.estaciones ?? [];
    const locs: Item[] = porLocalidad(es, app.now).map((l) => ({ href: `#/localidad/${encodeURIComponent(l.nombre)}`, nombre: l.nombre, sub: `Localidad · ${l.estaciones.length} ${l.estaciones.length === 1 ? 'estación' : 'estaciones'}`, valor: '' }));
    const ests: Item[] = es.map((e) => {
      const x = valor(e, v, app.now);
      return { href: `#/estacion/${e.id}`, nombre: e.nombre, sub: `Estación · ${e.localidad}`, valor: x === null ? '' : `${num(x, META[v].dec)} ${META[v].unidad}` };
    });
    const rios: Item[] = (app.niveles?.rios ?? []).map((r) => ({ href: `#/rio/${r.id}`, nombre: r.nombre, sub: `Nivel · ${r.cauce}`, valor: '' }));
    return [...locs, ...ests, ...rios];
  });
  const res = $derived.by(() => {
    const t = plano(q.trim());
    if (!t) return todos.filter((x) => x.sub.startsWith('Localidad'));
    // Primero lo que empieza por lo escrito; después lo que lo contiene.
    const a = todos.filter((x) => plano(x.nombre).startsWith(t)), b = todos.filter((x) => !plano(x.nombre).startsWith(t) && plano(`${x.nombre} ${x.sub}`).includes(t));
    return [...a, ...b].slice(0, 40);
  });
  $effect(() => { void q; i = 0; });

  const cerrar = () => (app.buscando = false);
  function ir(x: Item | undefined) { if (!x) return; location.hash = x.href; cerrar(); }
  function tecla(e: KeyboardEvent) {
    if (e.key === 'Escape') cerrar();
    else if (e.key === 'ArrowDown') { e.preventDefault(); i = Math.min(res.length - 1, i + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); i = Math.max(0, i - 1); }
    else if (e.key === 'Enter') ir(res[i]);
  }
  onMount(() => input.focus());
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="velo" onclick={cerrar}>
  <div class="caja" role="dialog" aria-modal="true" aria-label="Buscar" tabindex="-1" onclick={(e) => e.stopPropagation()}>
    <div class="campo">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5 14 14" /></svg>
      <input bind:this={input} bind:value={q} onkeydown={tecla} placeholder="Estación, localidad o río" aria-label="Buscar estación, localidad o río" autocomplete="off" spellcheck="false" enterkeyhint="go" />
      <button onclick={cerrar} aria-label="Cerrar la búsqueda">Esc</button>
    </div>
    <ul class="scroll" role="listbox" aria-label="Resultados">
      {#each res as x, k (x.href)}
        <li role="option" aria-selected={k === i}>
          <a href={x.href} class:on={k === i} onclick={(e) => { e.preventDefault(); ir(x); }} onpointerenter={() => (i = k)}>
            <span class="texto"><span class="nombre">{x.nombre}</span><span class="faint sub">{x.sub}</span></span>
            {#if x.valor}<span class="num faint">{x.valor}</span>{/if}
          </a>
        </li>
      {:else}
        <li class="nada faint">Nada coincide con «{q}».</li>
      {/each}
    </ul>
  </div>
</div>

<style>
  .velo { position: absolute; inset: 0; z-index: 40; background: var(--scrim); display: flex; justify-content: center; align-items: flex-start; padding: 12vh var(--sp-4) 0; }
  .caja { width: min(520px, 100%); max-height: 70vh; display: flex; flex-direction: column; background: var(--bg-1); border: 1px solid var(--line-2); box-shadow: var(--shadow); }
  .campo { display: flex; align-items: center; gap: var(--sp-3); padding: 0 var(--sp-4); height: 48px; border-bottom: 1px solid var(--line-1); color: var(--fg-2); flex: none; }
  input { flex: 1; min-width: 0; background: none; border: 0; outline: none; font-size: 16px; color: var(--fg-0); }
  input::placeholder { color: var(--fg-2); }
  .campo button { font-family: var(--font-mono); font-size: var(--fs-label); border: 1px solid var(--line-2); padding: 2px 6px; color: var(--fg-2); }
  ul { list-style: none; margin: 0; padding: 0; min-height: 0; }
  a { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3); min-height: 44px; padding: 5px var(--sp-4); text-decoration: none; border-top: 1px solid var(--line-1); }
  li:first-child a { border-top: 0; }
  a.on { background: var(--bg-2); }
  .texto { display: grid; min-width: 0; }
  .nombre, .sub { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sub { font-size: var(--fs-label); }
  .num { font-size: var(--fs-small); white-space: nowrap; }
  .nada { padding: var(--sp-4); }
  @media (max-width: 759px) { .velo { padding-top: calc(var(--safe-top) + 8px); } .caja { max-height: 60vh; } }
</style>
