'use client';
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { parseDeliveryProgress, type DeliveryProgress } from '@/lib/delivery-progress';
import { useShareRequest } from '@/lib/use-share-request';

export default function DeliveryProgressPanel({ routeId, onClose }: { routeId: string; onClose: () => void }) {
  const [state, setState] = useState<DeliveryProgress | null>(null), [selected, setSelected] = useState<number[]>([]), [message, setMessage] = useState('');
  const { busy, error, run } = useShareRequest({ timeout: 'La consulta de avance tardó demasiado. Actualiza antes de guardar otra vez; la solicitud anterior pudo completarse.', connection: 'No se pudo conectar con el avance de entregas.' });
  function read() {
    if (!supabase) return; setMessage('');
    void run(signal => supabase!.rpc('route_delivery_progress', { p_route_id: routeId }).abortSignal(signal), data => { const next = parseDeliveryProgress(data, routeId); setState(next); setSelected(next.completedSequences); });
  }
  useEffect(read, [routeId]); // Parent keys this panel by account and route.
  const dirty = state && (state.stale || JSON.stringify(selected) !== JSON.stringify(state.completedSequences));
  function save() {
    if (!state || !dirty || busy || !supabase) return; setMessage('');
    void run(signal => supabase!.rpc('route_delivery_progress', { p_route_id: routeId, p_completed: selected, p_expected_revision: state.revision, p_expected_snapshot: state.snapshot }).abortSignal(signal), data => { const next = parseDeliveryProgress(data, routeId); setState(next); setSelected(next.completedSequences); setMessage('Avance guardado en tu cuenta. Puedes recuperarlo al volver a abrir esta ruta.'); });
  }
  return <section className="delivery-progress" aria-label="Avance de entregas">
    <div className="share-heading"><h3>Avance de entregas</h3><button type="button" className="text-button" onClick={onClose}>Cerrar avance</button></div>
    <p>Marca manualmente los puntos que ya completaste y guarda tu selección. El destino también se puede marcar. Esto no certifica una entrega ni recorta la ruta o sus enlaces de navegación.</p>
    <button type="button" disabled={busy} onClick={read}>Actualizar avance</button>
    {busy && <p role="status">Consultando avance…</p>}{error && <p role="alert">{error} Tus cambios locales se conservan; actualizar consulta de nuevo el estado de la cuenta.</p>}
    {state && <><p className="delivery-progress-count">{selected.length} de {state.points.length - 1} puntos seleccionados como completados · Revisión {state.revision}</p>
      {state.stale && <p role="status">Los puntos o su orden cambiaron. El avance anterior no se aplica. Revisa esta lista y guarda una nueva selección; el historial se conserva.</p>}
      <ol className="delivery-progress-list">{state.points.slice(1).map((point, index) => { const sequence = index + 1, title = sequence === state.points.length - 1 ? 'Destino' : `Entrega ${sequence}`; return <li key={sequence}><label><input type="checkbox" disabled={busy} checked={selected.includes(sequence)} aria-label={`${title} completado`} onChange={event => { const checked = event.target.checked; setSelected(values => checked ? [...values, sequence].sort((a, b) => a - b) : values.filter(n => n !== sequence)); setMessage(''); }}/><span><strong>{title}</strong><small>{point.label}</small></span></label></li>; })}</ol>
      <button type="button" className="primary-button" disabled={busy || !dirty} onClick={save}>Guardar avance</button>
      {dirty && <p role="status">Hay cambios sin guardar. Guárdalos antes de cerrar o cambiar de sección.</p>}
      <p className="hint">{state.updatedAt ? `Último guardado: ${new Date(state.updatedAt).toLocaleString('es-MX')}.` : 'Todavía no hay un avance guardado.'} Para navegar, carga la ruta completa y revisa «Retomar desde»; aquí no se omiten puntos automáticamente.</p>
      {!!state.history.length && <details><summary>Historial de avance · últimas {state.history.length} revisiones</summary><ol className="delivery-progress-history">{state.history.map(row => <li key={row.revision}><span>Revisión {row.revision} · {row.completedSequences.length} puntos · {new Date(row.createdAt).toLocaleString('es-MX')}{!row.samePoints && <small>Corresponde a otros puntos u orden; no se aplica a la lista actual.</small>}</span>{row.samePoints && <button type="button" disabled={busy} onClick={() => { setSelected(row.completedSequences); setMessage('Selección anterior preparada para revisar. Guarda el avance si quieres recuperarla.'); }}>Revisar selección {row.revision}</button>}</li>)}</ol><p className="hint">Recuperar una selección y guardarla crea otra revisión; no elimina las anteriores.</p></details>}
    </>}{message && <p role="status">{message}</p>}
  </section>;
}
