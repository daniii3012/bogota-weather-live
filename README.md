# Bogotá Weather Live

El clima de Bogotá en tiempo real sobre un mapa (no oficial): dónde llueve y cuánto, temperatura,
humedad y viento por estación y por localidad, radar meteorológico animado, niveles de ríos, alertas
y pronóstico. Web instalable (PWA), pensada para el teléfono y para el computador.

**En línea:** <https://daniii3012.github.io/bogota-weather-live/>

- Mapa en vivo con las estaciones de la red hidrometeorológica de Bogotá: el valor de cada una va
  sobre el mapa y las que tienen lluvia ahora laten.
- Radar del IDIGER con la última media hora animada.
- Ficha de cada estación con las últimas seis horas; resumen de la ciudad y de cada localidad;
  buscador y estación más cercana a tu ubicación.
- Niveles de ríos y quebradas frente a sus umbrales, alertas de deslizamiento por lluvia y días sin
  lluvia.
- Pronóstico por hora y por día, y satélite GOES-19 como capa opcional para ver la región.
- Temas claro y oscuro; abre sin conexión con los últimos datos y su edad.

## Desarrollo

```sh
npm install
npm run dev          # http://localhost:5173
```

La página lee los datos de un intermediario propio, que consulta las fuentes una vez por minuto y
reparte la copia; su dirección se da en compilación (`VITE_API_BASE`) o en la URL (`?api=`). Sin
ninguna de las dos busca uno local en `http://localhost:8787`.

Comprobaciones: `npm run check` (tipos), `npm test` (lógica) y `node tests/visual/tour.mjs` (capturas
de escritorio y móvil con el Chrome instalado). Las escalas de color salen de `tools/palette.mjs`.

Proyecto personal e independiente, sin fines comerciales; no está afiliado al IDIGER ni reemplaza sus
canales oficiales de alerta. Fuentes y licencias en [`FUENTES.md`](FUENTES.md).
