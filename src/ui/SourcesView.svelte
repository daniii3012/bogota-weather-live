<script lang="ts">
  import Cabecera from './Cabecera.svelte';
</script>

<Cabecera titulo="Fuentes y avisos" />
<section class="sec">
  <header><h3 class="label">Avisos</h3></header>
  <ul class="avisos">
    <li>Esta página <strong>no es oficial</strong> ni está afiliada al IDIGER. No emite alertas ni reemplaza sus canales.</li>
    <li>Los datos del Sistema de Alerta de Bogotá son <strong>crudos</strong>: el IDIGER advierte que no están validados en su totalidad.</li>
    <li>Ante una emergencia, llama a la línea <strong>123</strong>. Canales oficiales: <a href="https://www.sab.gov.co" target="_blank" rel="noopener">sab.gov.co</a> e <a href="https://www.idiger.gov.co" target="_blank" rel="noopener">idiger.gov.co</a>.</li>
    <li>Proyecto personal, sin publicidad ni fines comerciales.</li>
  </ul>
</section>
<section class="sec">
  <header><h3 class="label">Datos del clima</h3></header>
  <dl>
    <div><dt>Lluvia, temperatura, humedad, viento y niveles</dt>
      <dd>Red hidrometeorológica de Bogotá, del <a href="https://www.sab.gov.co" target="_blank" rel="noopener">Sistema de Alerta de Bogotá</a> (IDIGER). Publicados en <a href="https://datosabiertos.bogota.gov.co/dataset/sab-sistema-de-alerta-de-bogota-lluvia-minutal-idiger-bogota-d-c" target="_blank" rel="noopener">Datos Abiertos Bogotá</a> con licencia <a href="https://creativecommons.org/licenses/by-nc/4.0/deed.es" target="_blank" rel="noopener">CC BY-NC 4.0</a>. Aquí se muestran unidos por estación, filtrados por calidad y resumidos por localidad.</dd></div>
    <div><dt>Radar meteorológico</dt><dd>Radar del IDIGER: reflectividad cada tres minutos.</dd></div>
    <div><dt>Alertas</dt><dd>Modelo de deslizamientos por lluvia y días sin lluvia, del IDIGER.</dd></div>
    <div><dt>Satélite</dt><dd>GOES-19 (NOAA), servido como teselas por <a href="https://www.earthdata.nasa.gov/engage/open-data-services-software/earthdata-developer-portal/gibs-api" target="_blank" rel="noopener">NASA GIBS</a>.</dd></div>
    <div><dt>Pronóstico</dt><dd><a href="https://open-meteo.com" target="_blank" rel="noopener">Open-Meteo</a>, licencia CC BY 4.0. Es un modelo numérico, no el pronóstico oficial.</dd></div>
  </dl>
</section>
<section class="sec">
  <header><h3 class="label">Mapa y tecnología</h3></header>
  <dl>
    <div><dt>Mapa base</dt><dd>© colaboradores de <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> (ODbL), teselas de <a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a>, esquema <a href="https://openmaptiles.org" target="_blank" rel="noopener">OpenMapTiles</a>.</dd></div>
    <div><dt>Motor</dt><dd><a href="https://maplibre.org" target="_blank" rel="noopener">MapLibre GL JS</a>, Svelte y Vite.</dd></div>
    <div><dt>Código</dt><dd><a href="https://github.com/daniii3012/bogota-weather-live" target="_blank" rel="noopener">github.com/daniii3012/bogota-weather-live</a></dd></div>
  </dl>
</section>
<section class="sec">
  <header><h3 class="label">Cómo se leen los datos</h3></header>
  <ul class="avisos">
    <li><strong>Lluvia</strong>: milímetros acumulados desde las 00:00. Un milímetro es un litro por metro cuadrado.</li>
    <li>Una lectura con más de <strong>media hora</strong> se muestra como «sin dato»: ya no describe el presente.</li>
    <li>La página consulta una copia que se renueva cada minuto; no carga a los servidores del IDIGER por cada visita.</li>
    <li>Tu ubicación, si la usas, no sale de tu dispositivo.</li>
  </ul>
</section>

<style>
  .avisos { margin: 0; padding: 0; list-style: none; display: grid; gap: var(--sp-2); color: var(--fg-1); }
  .avisos li { padding-left: var(--sp-4); position: relative; }
  .avisos li::before { content: ''; position: absolute; left: 2px; top: 8px; width: 5px; height: 1px; background: var(--fg-2); }
  strong { color: var(--fg-0); font-weight: 600; }
  dl { margin: 0; display: grid; }
  dl div { padding: var(--sp-2) 0; border-top: 1px solid var(--line-1); display: grid; gap: 2px; }
  dl div:first-child { border-top: 0; padding-top: 0; }
  dt { font-weight: 600; }
  dd { margin: 0; color: var(--fg-1); }
  a { color: var(--fg-0); text-underline-offset: 2px; }
</style>
