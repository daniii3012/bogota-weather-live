<script lang="ts">
  import { app } from '../app/store.svelte';
  import { resumen } from '../domain/stats';
  import { cuando, hace } from '../domain/fmt';

  let { compact = false }: { compact?: boolean } = $props();
  const ultima = $derived(app.datos ? resumen(app.datos.estaciones, app.now).ultima : null);
  const TEXTO = { vivo: 'En vivo', viejo: 'Sin actualizar', error: 'Sin conexión', pausa: 'En pausa', conectando: 'Conectando' } as const;
</script>

<!-- Solo el estado se anuncia al cambiar; la hora se lee al recorrer la página, no como aviso. -->
<div class="status {app.estado}" class:compact>
  <span class="dot" aria-hidden="true"></span>
  <span class="label" role="status" aria-live="polite">{TEXTO[app.estado]}</span>
  {#if ultima}
    <span class="sep" aria-hidden="true">·</span>
    <span class="mono"><span class="sr">datos de las </span>{cuando(ultima, app.now)}</span>
    {#if !compact}
      <span class="sep" aria-hidden="true">·</span>
      <span class="mono faint">{hace(app.now - ultima)}</span>
    {/if}
  {/if}
</div>

<style>
  .status { display: flex; align-items: center; gap: 6px; font-size: var(--fs-small); color: var(--fg-1); white-space: nowrap; min-width: 0; }
  .dot { width: 6px; height: 6px; background: var(--fg-3); flex: none; }
  .vivo .dot { background: var(--ok); animation: latido 2.4s var(--ease-out) infinite; }
  .viejo .dot { background: var(--warn); }
  .error .dot { background: var(--error); }
  .label { color: var(--fg-1); }
  .viejo .label { color: var(--warn); }
  .error .label { color: var(--error); }
  .sep { color: var(--fg-3); }
  .mono { font-size: var(--fs-label); }
  @keyframes latido { 0%, 60%, 100% { opacity: 1; } 30% { opacity: 0.35; } }
  @media (prefers-reduced-motion: reduce) { .vivo .dot { animation: none; } }
</style>
