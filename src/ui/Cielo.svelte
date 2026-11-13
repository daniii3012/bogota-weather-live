<script lang="ts">
  import type { Cielo } from '../live/external';
  let { tipo, lado = 20 }: { tipo: Cielo; lado?: number } = $props();
  const NUBE = 'M5.5 12.5h9a3 3 0 0 0 .4-5.97A4.5 4.5 0 0 0 6.3 7.6 2.6 2.6 0 0 0 5.5 12.5Z';
</script>

<!-- Trazos rectos y finos, del mismo gris que el texto: el icono acompaña, no compite con el dato. -->
<svg width={lado} height={lado} viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="square" aria-hidden="true">
  {#if tipo === 'despejado'}
    <circle cx="10" cy="10" r="3.6" /><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.4 4.4l1.4 1.4M14.2 14.2l1.4 1.4M4.4 15.6l1.4-1.4M14.2 5.8l1.4-1.4" />
  {:else if tipo === 'parcial'}
    <circle cx="13.5" cy="6" r="2.6" /><path d="M13.5 1.4v1M18.1 6h-1M16.8 2.7l-.7.7" /><path d="M4.5 15.5h8a2.7 2.7 0 0 0 .3-5.38A4 4 0 0 0 5.2 11.1a2.3 2.3 0 0 0-.7 4.4Z" />
  {:else if tipo === 'nublado'}
    <path d={NUBE} transform="translate(0 1.5)" />
  {:else if tipo === 'niebla'}
    <path d="M3 6.5h14M5 10h12M3 13.5h10M15.5 13.5H17" />
  {:else if tipo === 'llovizna'}
    <path d={NUBE} transform="translate(0 -2)" /><path d="M7 14v1.2M10 15v1.2M13 14v1.2" />
  {:else if tipo === 'lluvia'}
    <path d={NUBE} transform="translate(0 -2)" /><path d="M7.5 13.5 6.6 16.5M10.7 13.5l-.9 3M13.9 13.5l-.9 3" />
  {:else if tipo === 'aguacero'}
    <path d={NUBE} transform="translate(0 -2.5)" /><path d="M6.6 12.6 5.2 17M9.4 12.6 8 17M12.2 12.6 10.8 17M15 12.6 13.6 17" />
  {:else}
    <path d={NUBE} transform="translate(0 -2.5)" /><path d="M10.8 12 8.6 15.2h2.6L9.4 18.4" />
  {/if}
</svg>
