<script lang="ts">
  import { onMount } from 'svelte';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { MapView } from './map/MapView';
  import { Controller, ctl, setController } from './app/controller.svelte';
  import { app } from './app/store.svelte';
  import { key, volver } from './app/router';
  import { applyTheme } from './app/theme';
  import Panel from './ui/Panel.svelte';
  import HomeView from './ui/HomeView.svelte';
  import StationView from './ui/StationView.svelte';
  import LocalityView from './ui/LocalityView.svelte';
  import LocalitiesView from './ui/LocalitiesView.svelte';
  import RiversView from './ui/RiversView.svelte';
  import RiverView from './ui/RiverView.svelte';
  import ForecastView from './ui/ForecastView.svelte';
  import AlertsView from './ui/AlertsView.svelte';
  import SourcesView from './ui/SourcesView.svelte';
  import SettingsView from './ui/SettingsView.svelte';
  import Search from './ui/Search.svelte';
  import MapControls from './ui/MapControls.svelte';
  import LayersPanel from './ui/LayersPanel.svelte';
  import MapDock from './ui/MapDock.svelte';
  import Aviso from './ui/Aviso.svelte';

  let container: HTMLDivElement;
  let listo = $state(false);
  let fallo = $state<string | null>(null);
  const quieto = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  onMount(() => {
    applyTheme(app.tema);
    let controller: Controller | undefined;
    let view: MapView | undefined;
    const arrancar = (map: MapView['map'] | null) => {
      controller = new Controller(map);
      setController(controller);
      void controller.start();
      listo = map !== null;
    };
    try {
      view = new MapView(container, app.tema);
      (window as unknown as { __map: unknown }).__map = view.map;
      const v = view;
      void v.ready().then(() => arrancar(v.map));
    } catch (e) {
      // Sin WebGL no hay mapa, pero los datos llegan igual y el panel sirve con sus listas y gráficas.
      fallo = e instanceof Error ? e.message : String(e);
      arrancar(null);
    }
    return () => { controller?.stop(); setController(null); view?.map.remove(); };
  });

  function onKey(e: KeyboardEvent) {
    // El destino puede no ser un elemento (la ventana misma): `closest` es opcional.
    const destino = e.target as HTMLElement | null;
    const escribiendo = destino?.closest?.('input, textarea');
    if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !escribiendo)) {
      e.preventDefault();
      app.buscando = true;
      return;
    }
    if (escribiendo || app.buscando) return;
    // Esc cierra primero lo que esté encima (capas) y luego vuelve a la vista anterior.
    if (e.key === 'Escape') {
      if (app.capasAbiertas) app.capasAbiertas = false;
      else if (app.view.kind !== 'home') volver();
    } else if (e.key === '0') ctl()?.ciudad();
    else if (e.key === ' ' && app.capas.radar && !destino?.closest?.('button, a, [role="slider"]')) {
      e.preventDefault();
      ctl()?.animar(!app.animando);
    }
  }
</script>

<svelte:window onkeydown={onKey} />

<h1 class="sr">Bogotá Weather Live: el clima de Bogotá en tiempo real (no oficial)</h1>

<Panel>
  <!-- El inicio nunca se desmonta: al volver está como se dejó (lista, pestaña, desplazamiento). Las
       demás vistas se montan encima y lo ocultan. -->
  <div class="vista" hidden={app.view.kind !== 'home'}><HomeView /></div>
  {#if app.view.kind !== 'home'}
  {#key key(app.view)}
    <div class="vista" in:fly={{ y: quieto ? 0 : 8, duration: quieto ? 1 : 200, easing: cubicOut }}>
      {#if app.view.kind === 'estacion'}
        <StationView id={Number(app.view.id)} />
      {:else if app.view.kind === 'localidad'}
        <LocalityView nombre={app.view.id} />
      {:else if app.view.kind === 'localidades'}
        <LocalitiesView />
      {:else if app.view.kind === 'rios'}
        <RiversView />
      {:else if app.view.kind === 'rio'}
        <RiverView id={Number(app.view.id)} />
      {:else if app.view.kind === 'pronostico'}
        <ForecastView />
      {:else if app.view.kind === 'alertas'}
        <AlertsView />
      {:else if app.view.kind === 'fuentes'}
        <SourcesView />
      {:else if app.view.kind === 'configuracion'}
        <SettingsView />
      {/if}
    </div>
  {/key}
  {/if}
</Panel>

{#if listo}
  <MapDock />
  <MapControls />
  <LayersPanel />
{/if}
<Aviso />
{#if app.buscando}<Search />{/if}
{#if fallo}
  <p class="sinmapa" class:narrow={app.narrow}>No se pudo dibujar el mapa en este navegador. Los datos siguen en el panel.</p>
{/if}

<!-- El mapa va después del panel en el documento (el teclado recorre primero el panel, que es el
     contenido principal); se ve debajo por su z-index. -->
<div class="map" bind:this={container}></div>

<style>
  .map { position: absolute; inset: 0; background: var(--bg-0); z-index: 0; }
  .vista { min-height: 100%; }
  .sinmapa { position: absolute; left: calc(var(--panel-w) + var(--sp-8)); top: var(--sp-6); z-index: 4; color: var(--fg-2); max-width: 320px; }
  .sinmapa.narrow { left: var(--sp-4); top: 72px; }
</style>
