'use client';
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { parseSharedRoute, validShareToken, type SharedRouteDraft } from '@/lib/route-sharing';
import { useShareRequest } from '@/lib/use-share-request';
import { operatingSummary } from '@/lib/vehicle-operating';
import { roadPreferencesLabel } from '@/lib/route-preferences';
const RouteMap = dynamic(() => import('@/components/RouteMap'), { ssr: false });
export default function SharedRouteReview({ token, onUse, onClose }: { token: string; onUse: (draft: SharedRouteDraft) => void; onClose: () => void }) {
  const [shared, setShared] = useState<ReturnType<typeof parseSharedRoute> | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const { busy, error, run } = useShareRequest();
  function read(use = false) {
    if (!validShareToken(token) || !supabase) return;
    setUnavailable(false);
    void run(signal => supabase!.rpc('read_route_share_link', { p_token: token }).abortSignal(signal), data => {
      if (!data) { setShared(null); setUnavailable(true); return; }
      const result = parseSharedRoute(data); setShared(result);
      if (use) onUse(result.draft); // Recheck expiry and revocation before importing.
    });
  }
  useEffect(() => read(), [token]);
  const draft = shared?.draft;
  const points = draft ? [{ ...draft.origin, type: 'origin' }, ...draft.stops.map(p => ({ ...p, type: 'stop' })), { ...draft.destination, type: 'destination' }] : [];
  return <section className="workspace shared-route-review" aria-labelledby="shared-route-title">
    <div className="share-heading"><div><p className="eyebrow">RECORRIDO COMPARTIDO</p><h1 id="shared-route-title">Revisa los puntos</h1></div><button type="button" onClick={onClose}>Cerrar sin importar</button></div>
    <p>El enlace permite ver una copia del recorrido. Compartirlo de nuevo permite que otras personas vean los mismos datos.</p>
    {!validShareToken(token) ? <p role="alert">El enlace compartido no es válido. Pide al remitente que lo copie completo.</p> : !supabase ? <p role="alert">La conexión para abrir enlaces compartidos no está configurada.</p> : unavailable ? <p role="alert">El enlace no está disponible: puede haber caducado, haber sido revocado o pertenecer a una ruta eliminada.</p> : null}
    {busy && <p role="status">Comprobando enlace…</p>}{error && <p role="alert">{error}</p>}
    {(error || unavailable) && <button type="button" disabled={busy} onClick={() => read()}>Reintentar abrir enlace</button>}
    {draft && <><h2>{draft.name}</h2><p>{draft.mode === 'truck' ? 'Camión' : 'Reparto'} · {points.length} puntos · Caduca {new Date(shared.expiresAt).toLocaleString('es-MX')}</p>
      <div className="shared-route-grid"><div className="shared-route-map"><RouteMap planning waypoints={points}/></div><ol className="shared-route-points">{points.map((p, index) => <li key={index}><strong>{index === 0 ? 'Origen' : index === points.length - 1 ? 'Destino' : `Entrega ${index}`}</strong><span>{p.label}</span><small>{p.lat.toFixed(6)}, {p.lng.toFixed(6)}</small></li>)}</ol></div>
      {draft.vehicle && <p>Medidas: {draft.vehicle.heightM} m de alto · {draft.vehicle.widthM} m de ancho · {draft.vehicle.lengthM} m de largo · Peso bruto {draft.vehicle.grossWeightT} t · Máximo por eje {draft.vehicle.axleWeightT} t. {operatingSummary(draft.vehicle)}</p>}
      <p>{roadPreferencesLabel(draft.preferences) || 'Sin preferencias para evitar peajes o autopistas.'}</p>
      <p>Corrobora las ubicaciones y el acceso de descarga. Al usar estos puntos reemplazarás el borrador abierto. Se conserva el orden y tendrás que calcular un recorrido nuevo con tus datos. El enlace no contiene un trazado calculado ni una autorización de circulación para camiones.</p>
      <button type="button" className="primary-button" disabled={busy} onClick={() => read(true)}>Usar estos puntos</button>
    </>}
  </section>;
}
