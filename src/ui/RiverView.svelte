<script lang="ts">
  import { app } from '../app/store.svelte';
  import { api } from '../live/api';
  import type { Serie } from '../live/contract';
  import { ESTADO } from '../domain/scales';
  import { ESTADO_RIO } from '../map/capas';
  import { cuando, hace, num } from '../domain/fmt';
  import Cabecera from './Cabecera.svelte';
  import Grafica from '../charts/Grafica.svelte';

  let { id }: { id: number } = $props();
  const r = $derived(app.niveles?.rios.find((x) => x.id === id) ?? null);

  let serie = $state<Serie | null>(null);
  let cargando = $state(false);
  $effect(() => {
    const clave = { id, t: app.niveles?.t };
    if (!r) return;
    const corte = new AbortController();
    cargando = true;
    api.serieNivel(clave.id, corte.signal).then((s) => { serie = s; cargando = false; }).catch((e) => { if (e?.name !== 'AbortError') cargando = false; });
    return () => corte.abort();
  });
  const propia = $derived(serie && serie.id === id ? serie : null);
  const t1 = $derived(Math.ceil(app.now / 600) * 600);

  // Niveles de alerta que este punto tiene definidos, con su cota.
  const NIVELES = [{ n: 'bajo', texto: 'Alerta baja', color: ESTADO.warn }, { n: 'medio', texto: 'Alerta media', color: ESTADO.serious }, { n: 'alto', texto: 'Alerta alta', color: ESTADO.critical }] as const;
  const u = $derived(r?.umbrales ?? null);
  const refs = $derived(NIVELES.flatMap((m) => { const v = u?.[m.n]; return v == null ? [] : [{ texto: m.texto as string, color: m.color as string, v }]; }));
  // Medidor: desde algo por debajo del agua (o del primer nivel de alerta) hasta el desbordamiento.
  const medidor = $derived.by(() => {
    if (!r || r.cota === null || u?.desborde == null) return null;
    const piso = Math.min(r.cota, u.bajo ?? r.cota) - 0.6, techo = u.desborde;
    const pos = (v: number) => Math.max(0, Math.min(100, ((v - piso) / (techo - piso)) * 100));
    return { agua: pos(r.cota), marcas: refs.map((x) => ({ n: x.texto, x: pos(x.v), c: x.color })) };
  });
  const DESCRIPCION = {
    normal: 'El agua está por debajo de todos los niveles de alerta.',
    bajo: 'El agua superó el primer nivel de alerta.',
    medio: 'El agua superó el nivel medio de alerta.',
    alto: 'El agua superó el nivel alto de alerta: está cerca del desbordamiento.',
    'sin-umbral': 'Este punto no tiene niveles de alerta definidos; solo se informa la altura del agua.',
    'sin-dato': 'La estación no ha reportado en el último día.',
  } as const;
</script>

{#if r}
  <Cabecera titulo={r.nombre} sub="{r.cauce} · {r.localidad}" />
  <section class="estado">
    <p class="rotulo"><span class="rombo" style:background={ESTADO_RIO[r.estado].color ?? 'var(--fg-3)'} aria-hidden="true"></span><strong>{ESTADO_RIO[r.estado].texto}</strong></p>
    <p class="dim">{DESCRIPCION[r.estado]}</p>
    {#if r.t}<p class="num faint edad">Lectura de las {cuando(r.t, app.now)} · {hace(app.now - r.t)}</p>{/if}
  </section>

  {#if r.cota !== null}
    <section class="sec">
      <header><h3 class="label">Altura del agua</h3></header>
      <dl class="cifras">
        <div><dt>Borde libre</dt><dd>{num(r.borde, 2)}<span class="u">m</span></dd></div>
        <div><dt>Cota del agua</dt><dd>{num(r.cota, 2)}<span class="u">m s. n. m.</span></dd></div>
      </dl>
      {#if medidor}
        <!-- Una sola barra con sus marcas: dónde está el agua frente a cada nivel de alerta. -->
        <div class="medidor" role="img" aria-label="El agua está a {num(r.borde, 2)} metros del desbordamiento">
          <div class="pista"><div class="agua" style:width="{medidor.agua}%"></div>
            {#each medidor.marcas as m (m.n)}<span class="marca" style:left="{m.x}%" style:background={m.c}></span>{/each}
          </div>
          <div class="pies"><span>Agua</span><span>Desbordamiento</span></div>
        </div>
        <ul class="umbrales">
          {#each refs as x (x.texto)}
            <li><span class="linea" style:background={x.color} aria-hidden="true"></span>{x.texto}<span class="num">{num(x.v, 2)} m</span></li>
          {/each}
          <li><span class="linea" style:background="var(--fg-0)" aria-hidden="true"></span>Desbordamiento<span class="num">{num(u?.desborde, 2)} m</span></li>
        </ul>
      {/if}
    </section>
    <section class="sec">
      <header><h3 class="label">Cota del agua · últimas 6 horas</h3></header>
      <Grafica puntos={propia?.puntos ?? []} tipo="linea" tono="var(--v-nivel)" unidad="m s. n. m." dec={2} t0={t1 - 6 * 3600} {t1} cargando={cargando || !propia} {refs}
        nombre="Cota del agua en {r.nombre} durante las últimas seis horas" />
      <p class="pie faint">Metros sobre el nivel del mar. Datos crudos del IDIGER, sin validar.</p>
    </section>
  {/if}
{:else if app.niveles}
  <Cabecera titulo="Punto no encontrado" />
  <p class="sin dim">No hay ninguna estación de nivel con ese identificador.</p>
{:else}
  <Cabecera titulo="Ríos y quebradas" />
  <p class="sin faint">Cargando…</p>
{/if}

<style>
  .estado { padding: var(--sp-4); display: grid; gap: var(--sp-2); }
  .rotulo { display: flex; align-items: center; gap: var(--sp-2); font-size: var(--fs-title); line-height: 1.2; }
  .rotulo strong { font-weight: 600; }
  .rombo { width: 10px; height: 10px; transform: rotate(45deg); flex: none; margin: 0 4px; }
  .edad { font-size: var(--fs-label); }
  .cifras { margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--line-1); border: 1px solid var(--line-1); }
  .cifras div { background: var(--bg-1); padding: var(--sp-2) var(--sp-3); display: grid; gap: 2px; }
  .cifras dt { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--fg-2); }
  .cifras dd { margin: 0; font-size: var(--fs-title); font-weight: 600; }
  .u { font-size: var(--fs-label); font-weight: 400; color: var(--fg-2); margin-left: 4px; }
  .medidor { display: grid; gap: 4px; }
  .pista { position: relative; height: 8px; background: var(--bg-3); }
  .agua { height: 100%; background: var(--v-nivel); }
  .marca { position: absolute; top: -4px; bottom: -4px; width: 2px; transform: translateX(-1px); }
  .pies { display: flex; justify-content: space-between; font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.04em; color: var(--fg-2); text-transform: uppercase; }
  .umbrales { list-style: none; margin: 0; padding: 0; display: grid; font-size: var(--fs-small); color: var(--fg-1); }
  .umbrales li { display: flex; align-items: center; gap: var(--sp-2); padding: 5px 0; border-top: 1px solid var(--line-1); }
  .umbrales li:first-child { border-top: 0; }
  .umbrales .num { margin-left: auto; color: var(--fg-0); }
  .linea { width: 12px; height: 2px; flex: none; }
  .pie { font-size: var(--fs-label); }
  .sin { padding: var(--sp-4); }
</style>
