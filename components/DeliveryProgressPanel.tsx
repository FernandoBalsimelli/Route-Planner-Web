'use client';
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { parseDeliveryProgress, type DeliveryProgress } from '@/lib/delivery-progress';
import { useShareRequest } from '@/lib/use-share-request';
import NavigationLinks from '@/components/NavigationLinks';
import SavedRouteTraceReview from '@/components/SavedRouteTraceReview';
import { readRoutePreferences, type RoutePreferences } from '@/lib/route-preferences';

export default function DeliveryProgressPanel({ routeId, onClose }: { routeId: string; onClose: () => void }) {
  const [state, setState] = useState<DeliveryProgress | null>(null), [selected, setSelected] = useState<number[]>([]), [message, setMessage] = useState('');
  const [review, setReview] = useState<{ progress: DeliveryProgress; truck: boolean; preferences: RoutePreferences } | null>(null);
  const { busy, error, run } = useShareRequest({ timeout: 'La consulta de avance tardó demasiado. Actualiza antes de guardar otra vez; la solicitud anterior pudo completarse.', connection: 'No se pudo conectar con el avance de entregas.' });
  function read(navigate = false) {
    if (!supabase) return; setMessage(''); setReview(null);
    void run(async signal => {
      const progress = await supabase!.rpc('route_delivery_progress', { p_route_id: routeId }).abortSignal(signal);
      if (progress.error || !navigate) return { data: { progress: progress.data, options: null }, error: progress.error };
      // Read only small operational fields; never download saved geometry here.
      const options = await supabase!.from('saved_routes').select('mode:route_metadata->>mode,preferences:route_metadata->result->preferences').eq('id', routeId).abortSignal(signal).single();
      return { data: { progress: progress.data, options: options.data }, error: options.error };
    }, data => {
      const next = parseDeliveryProgress(data.progress, routeId);
      setState(next); setSelected(next.completedSequences);
      if (navigate && !next.stale) {
        if (!data.options || !['truck', 'delivery'].includes(data.options.mode)) throw Error('Falta el perfil guardado del recorrido. Carga la ruta completa y revisa el vehículo antes de navegar.');
        setReview({ progress: next, truck: data.options.mode === 'truck', preferences: readRoutePreferences(data.options.preferences) });
      }
    });
  }
  useEffect(() => read(), [routeId]); // Parent keys this panel by account and route.
  const dirty = state && (state.stale || JSON.stringify(selected) !== JSON.stringify(state.completedSequences));
  function save() {
    if (!state || !dirty || busy || !supabase) return; setMessage(''); setReview(null);
    void run(signal => supabase!.rpc('route_delivery_progress', { p_route_id: routeId, p_completed: selected, p_expected_revision: state.revision, p_expected_snapshot: state.snapshot }).abortSignal(signal), data => { const next = parseDeliveryProgress(data, routeId); setState(next); setSelected(next.completedSequences); setMessage('Avance guardado en tu cuenta. Puedes recuperarlo al volver a abrir esta ruta.'); });
  }
  return <section className="delivery-progress" aria-label="Avance de entregas">
    <div className="share-heading"><h3>Avance de entregas</h3><button type="button" className="text-button" onClick={onClose}>Cerrar avance</button></div>
    <p>Marca manualmente los puntos que ya completaste y guarda tu selección. El destino también se puede marcar. Esto no certifica una entrega ni recorta la ruta o sus enlaces de navegación.</p>
    <button type="button" disabled={busy} onClick={() => read()}>Actualizar avance</button>
    {busy && <p role="status">Consultando avance…</p>}{error && <p role="alert">{error} Tus cambios locales se conservan; actualizar consulta de nuevo el estado de la cuenta.</p>}
    {state && <><p className="delivery-progress-count">{selected.length} de {state.points.length - 1} puntos seleccionados como completados · Revisión {state.revision}</p>
      {state.stale && <p role="status">Los puntos o su orden cambiaron. El avance anterior no se aplica. Revisa esta lista y guarda una nueva selección; el historial se conserva.</p>}
      <ol className="delivery-progress-list">{state.points.slice(1).map((point, index) => { const sequence = index + 1, title = sequence === state.points.length - 1 ? 'Destino' : `Entrega ${sequence}`; return <li key={sequence}><label><input type="checkbox" disabled={busy} checked={selected.includes(sequence)} aria-label={`${title} completado`} onChange={event => { const checked = event.target.checked; setReview(null); setSelected(values => checked ? [...values, sequence].sort((a, b) => a - b) : values.filter(n => n !== sequence)); setMessage(''); }}/><span><strong>{title}</strong><small>{point.label}</small></span></label></li>; })}</ol>
      <button type="button" className="primary-button" disabled={busy || !dirty} onClick={save}>Guardar avance</button>
      {dirty && <p role="status">Hay cambios sin guardar. Guárdalos antes de cerrar o cambiar de sección.</p>}
      <p className="hint">{state.updatedAt ? `Último guardado: ${new Date(state.updatedAt).toLocaleString('es-MX')}.` : 'Todavía no hay un avance guardado.'} Para navegar, guarda o actualiza tu selección y revisa los puntos; aquí no se omiten entregas automáticamente.</p>
      <button type="button" disabled={busy || !!dirty || !!error || state.stale} onClick={() => read(true)}>Revisar navegación</button>
      {review?.progress === state && !dirty && !busy && !error && !state.stale && <section className="delivery-navigation" aria-label="Navegación de la ruta guardada"><button type="button" className="text-button" onClick={() => setReview(null)}>Cerrar revisión de navegación</button><p>Se consultó el avance de tu cuenta para esta revisión. Los enlaces usan los puntos guardados, sin trazado ni puntos guía del cálculo. Puedes consultar el trazado guardado por separado aquí. Si cambia el avance en otra sesión, vuelve a revisarlo.</p><SavedRouteTraceReview key={`${review.progress.snapshot}-${review.progress.revision}`} progress={review.progress} truck={review.truck} preferences={review.preferences} onStale={() => { setReview(null); setMessage('El recorrido o su avance cambió. Se cerró la revisión y se retiraron sus enlaces. Vuelve a revisar la navegación para consultar los datos actuales.'); }}/><NavigationLinks points={review.progress.points} deliveryProgress={review.progress} truck={review.truck} preferences={review.preferences}/></section>}
      {!!state.history.length && <details><summary>Historial de avance · últimas {state.history.length} revisiones</summary><ol className="delivery-progress-history">{state.history.map(row => <li key={row.revision}><span>Revisión {row.revision} · {row.completedSequences.length} puntos · {new Date(row.createdAt).toLocaleString('es-MX')}{!row.samePoints && <small>Corresponde a otros puntos u orden; no se aplica a la lista actual.</small>}</span>{row.samePoints && <button type="button" disabled={busy} onClick={() => { setReview(null); setSelected(row.completedSequences); setMessage('Selección anterior preparada para revisar. Guarda el avance si quieres recuperarla.'); }}>Revisar selección {row.revision}</button>}</li>)}</ol><p className="hint">Recuperar una selección y guardarla crea otra revisión; no elimina las anteriores.</p></details>}
    </>}{message && <p role="status">{message}</p>}
  </section>;
}
