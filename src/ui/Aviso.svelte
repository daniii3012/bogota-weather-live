<script lang="ts">
  import { app } from '../app/store.svelte';
</script>

{#if app.aviso}
  <div class="aviso" class:narrow={app.narrow} style:--top="{app.topbarH}px" role="status">{app.aviso}</div>
{/if}

<style>
  .aviso { position: absolute; left: calc(50% + 202px); transform: translateX(-50%); top: var(--sp-4); z-index: 30; max-width: min(420px, calc(100vw - 32px)); padding: var(--sp-2) var(--sp-3); background: var(--bg-3); border: 1px solid var(--line-2); box-shadow: var(--shadow); font-size: var(--fs-body); }
  .aviso.narrow { left: 50%; top: calc(var(--top) + var(--sp-2)); }
</style>
