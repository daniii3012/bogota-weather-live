<script lang="ts">
  let { activo, onchange, etiqueta }: { activo: boolean; onchange: (v: boolean) => void; etiqueta: string } = $props();
</script>

<button class="int" class:on={activo} role="switch" aria-checked={activo} aria-label={etiqueta} onclick={() => onchange(!activo)}><span></span></button>

<style>
  .int { width: 30px; height: 16px; border: 1px solid var(--line-2); background: var(--bg-3); position: relative; flex: none; transition: background var(--t-out), border-color var(--t-out); }
  .int span { position: absolute; top: 2px; left: 2px; width: 10px; height: 10px; background: var(--fg-2); transition: transform var(--t-in) var(--ease-out), background var(--t-out); }
  .int.on { background: var(--fg-0); border-color: var(--fg-0); }
  .int.on span { transform: translateX(14px); background: var(--bg-1); }
  @media (pointer: coarse) { .int { width: 38px; height: 22px; } .int span { top: 3px; left: 3px; width: 14px; height: 14px; } .int.on span { transform: translateX(16px); } }
</style>
