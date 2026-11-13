<script lang="ts" generics="T extends string">
  let { opciones, valor, onchange, etiqueta }: { opciones: { id: T; texto: string }[]; valor: T; onchange: (v: T) => void; etiqueta: string } = $props();
</script>

<div class="seg" role="radiogroup" aria-label={etiqueta}>
  {#each opciones as o (o.id)}
    <button role="radio" aria-checked={valor === o.id} class:on={valor === o.id} onclick={() => onchange(o.id)}>{o.texto}</button>
  {/each}
</div>

<style>
  .seg { display: inline-flex; border: 1px solid var(--line-2); }
  button { height: 24px; padding: 0 8px; font-family: var(--font-mono); font-size: var(--fs-label); letter-spacing: 0.04em; color: var(--fg-2); transition: color var(--t-out), background var(--t-out); }
  button + button { border-left: 1px solid var(--line-2); }
  button:hover { color: var(--fg-0); }
  button.on { background: var(--fg-0); color: var(--bg-1); }
  @media (pointer: coarse) { button { height: 32px; padding: 0 12px; } }
</style>
