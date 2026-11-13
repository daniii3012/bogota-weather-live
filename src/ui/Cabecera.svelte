<script lang="ts">
  import type { Snippet } from 'svelte';
  import { go, volver } from '../app/router';

  let { titulo, sub = '', acciones }: { titulo: string; sub?: string; acciones?: Snippet } = $props();
</script>

<header class="cab">
  <button class="volver" onclick={volver} aria-label="Volver">
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M8.5 2 3.5 7l5 5" /></svg>
  </button>
  <div class="tit">
    <h2>{titulo}</h2>
    {#if sub}<p class="faint">{sub}</p>{/if}
  </div>
  {#if acciones}<div class="acc">{@render acciones()}</div>{/if}
  <button class="cerrar" onclick={() => go({ kind: 'home' })} aria-label="Cerrar y volver al inicio">
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M2.5 2.5l9 9M11.5 2.5l-9 9" /></svg>
  </button>
</header>

<style>
  .cab { display: flex; align-items: center; gap: var(--sp-2); padding: var(--sp-3) var(--sp-3) var(--sp-3) var(--sp-2); position: sticky; top: 0; background: var(--bg-1); z-index: 2; border-bottom: 1px solid var(--line-1); }
  .tit { flex: 1; min-width: 0; }
  h2 { font-size: var(--fs-row); font-weight: 600; line-height: 1.25; overflow-wrap: anywhere; }
  p { font-size: var(--fs-small); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .acc { display: flex; gap: 2px; flex: none; }
  button, .acc :global(button) { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; color: var(--fg-1); flex: none; transition: color var(--t-out), background var(--t-out); }
  button:hover, .acc :global(button:hover) { color: var(--fg-0); background: var(--bg-2); }
  @media (pointer: coarse) { button, .acc :global(button) { width: 40px; height: 40px; } }
</style>
