'use client';

import React, { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { useShareRequest } from '@/lib/use-share-request';
import { parseSavedRouteTrace, SavedRouteTraceChangedError, type SavedRouteTrace } from '@/lib/saved-route-trace';
import type { DeliveryProgress } from '@/lib/delivery-progress';
import type { RoutePreferences } from '@/lib/route-preferences';
import SavedTracePointList from '@/components/SavedTracePointList';
import LocationReviewLinks from '@/components/LocationReviewLinks';
import { deliveryPointLabel } from '@/lib/navigation-continuation';

const RouteMap = dynamic(() => import('./RouteMap'), { ssr: false, loading: () => <p role="status">Preparando mapa del trazado guardado…</p> });
const COLUMNS = 'mode:route_metadata->>mode,preferences:route_metadata->result->preferences,polyline:route_metadata->result->>polyline,waypoints:route_metadata->result->waypoints,distanceMeters:route_metadata->result->distanceMeters,durationSeconds:route_metadata->result->durationSeconds';

export default function SavedRouteTraceReview({ progress, truck, preferences, onStale }: { progress: DeliveryProgress; truck: boolean; preferences: RoutePreferences; onStale: () => void }) {
  const [trace, setTrace] = useState<SavedRouteTrace | null>(null);
  const [focus, setFocus] = useState<{ sequence: number; request: number } | null>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  function locate(sequence: number) {
    setFocus(previous => ({ sequence, request: (previous?.request ?? 0) + 1 }));
    mapContainer.current?.scrollIntoView?.({ block: 'nearest', behavior: 'auto' });
  }
  const { busy, error, run } = useShareRequest({ timeout: 'La consulta del trazado tardó demasiado. Reintenta o carga la ruta completa.', connection: 'No se pudo conectar con el trazado guardado.' });
  function load() {
    if (!supabase || busy) return;
    setTrace(null);
    setFocus(null);
    void run<{ record: unknown; progress: unknown }>(async signal => {
      const record = await supabase!.from('saved_routes').select(COLUMNS).eq('id', progress.routeId).neq('status', 'archived').abortSignal(signal).single();
      if (record.error) return { data: { record: null, progress: null }, error: record.error };
      // Refresh after reading geometry to reject a changed route/order/revision.
      const latest = await supabase!.rpc('route_delivery_progress', { p_route_id: progress.routeId }).abortSignal(signal);
      return { data: { record: record.data, progress: latest.data }, error: latest.error };
    }, data => {
      try { setTrace(parseSavedRouteTrace(data.record, data.progress, progress, truck, preferences)); }
      catch (cause) { if (cause instanceof SavedRouteTraceChangedError) onStale(); else throw cause; }
    });
  }
  return <section className="saved-trace-review" aria-label="Trazado guardado junto al avance">
    <button type="button" className="secondary-button" disabled={busy} onClick={() => trace ? setTrace(null) : load()} aria-expanded={Boolean(trace)}>{trace ? 'Ocultar trazado guardado' : 'Ver trazado guardado'}</button>
    {busy && <p role="status">Consultando el cálculo guardado y comprobando su avance…</p>}
    {error && <p role="alert">{error}</p>}
    {trace && <>
      <h4>Trazado guardado completo</h4>
      <p>{(trace.distanceMeters / 1000).toLocaleString('es-MX', { maximumFractionDigits: 1 })} km · {Math.round(trace.durationSeconds / 60)} min estimados en el cálculo guardado · Avance consultado, revisión {progress.revision}.</p>
      <p className="hint">Incluye origen, todas las entregas y destino en su orden original. No es un cálculo actualizado desde tu posición ni un trazado recortado al elegir «Retomar desde». Compara los puntos de abajo antes de abrir Google.</p>
      <div ref={mapContainer}><RouteMap polyline={trace.polyline} waypoints={trace.waypoints} completedSequences={progress.completedSequences} focus={focus}/></div>
      {focus && <p role="status">Punto elegido en el mapa: {deliveryPointLabel(focus.sequence, trace.waypoints.length)}. Sólo cambia la vista; no el avance ni la navegación.</p>}
      {focus && <aside className="saved-access-review" aria-label="Acceso del punto elegido">
        <strong>Revisar acceso · {deliveryPointLabel(focus.sequence, trace.waypoints.length)}</strong>
        <p>{trace.waypoints[focus.sequence].label}</p>
        <small>{trace.waypoints[focus.sequence].lat.toFixed(6)}, {trace.waypoints[focus.sequence].lng.toFixed(6)}</small>
        <LocationReviewLinks point={trace.waypoints[focus.sequence]} mapLabel="Ver punto en Google Maps"/>
        <p className="hint">Si necesitas corregir el acceso, carga la ruta y revisa el punto antes de volver a calcular. Esta consulta conserva el punto guardado.</p>
      </aside>}
      <SavedTracePointList points={trace.waypoints} completed={progress.completedSequences} focused={focus?.sequence ?? null} onFocus={locate} onShowAll={() => setFocus(null)}/>
      <p className="hint">Ubicar sólo cambia la vista del mapa. No selecciona «Retomar desde», no recalcula ni marca una entrega.</p>
      <p className="navigation-note">Las marcas corresponden al avance consultado; no certifican una entrega. Si cambia en otra sesión, vuelve a revisar. Google recalcula entre puntos y no recibe este trazado ni las restricciones HGV; esta vista tampoco acredita circulación segura o legal.</p>
    </>}
  </section>;
}
