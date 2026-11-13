# Clima Live

El clima de Bogotá en tiempo real sobre un mapa (no oficial): dónde llueve y cuánto, temperatura,
humedad y viento por estación y por localidad, radar meteorológico animado y vista satelital. Web
instalable (PWA).

**Estado:** en planeación. Todavía no hay código.

## Qué va a tener

- Mapa en vivo con las estaciones de la red hidrometeorológica de Bogotá y el radar del IDIGER.
- Ficha de cada estación con las últimas seis horas.
- Resumen de la ciudad y de cada localidad; búsqueda y estación más cercana.
- Más adelante: satélite GOES-19, pronóstico, niveles de ríos y alertas.

## Partes

- `web/` — la página (Svelte, TypeScript, MapLibre).
- `worker/` — intermediario propio: consulta las fuentes una vez por minuto y reparte la copia, para
  no cargar a los servidores de origen.
- `shared/` — contrato de datos y muestras para las pruebas.

Proyecto personal e independiente, sin fines comerciales; no está afiliado al IDIGER ni reemplaza
sus canales oficiales de alerta. Fuentes y licencias en [`FUENTES.md`](FUENTES.md).
