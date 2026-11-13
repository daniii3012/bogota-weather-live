<script lang="ts">
  let { onclick }: { onclick?: () => void } = $props();
</script>

<button class="brand" {onclick} aria-label="Bogotá Weather Live: inicio">
  <!-- Una línea de nube y tres trazos de lluvia; el del medio, en el azul de la lluvia. -->
  <svg width="18" height="18" viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke-width="7" stroke-linecap="square">
    <path d="M8 18 H56" stroke="currentColor" />
    <path d="M18 32 L12 52" stroke="currentColor" />
    <path d="M35 32 L29 52" stroke="var(--v-lluvia)" />
    <path d="M52 32 L46 52" stroke="currentColor" />
  </svg>
  <span class="word">BOGOTÁ<span class="slash">/</span>WEATHER</span>
</button>

<style>
  .brand { display: inline-flex; align-items: center; gap: 10px; height: 28px; color: var(--fg-0); }
  .word { font-family: var(--font-mono); font-weight: 600; font-size: 13px; letter-spacing: 0.16em; white-space: nowrap; }
  .slash { color: var(--fg-3); margin: 0 1px; }
</style>
