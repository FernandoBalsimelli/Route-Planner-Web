'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type SavedRoute = { id: string; name: string; created_at: string; status?: string; vehicle_id?: string | null; origin: { label?: string; lat?: number; lng?: number } | null; destination: { label?: string; lat?: number; lng?: number } | null; route_metadata?: { mode?: 'delivery' | 'truck'; vehicle?: { heightM?: number; widthM?: number; lengthM?: number; grossWeightT?: number; axleWeightT?: number } | null; result?: import('@/lib/routes').RouteResult } | null };
const COLUMNS = 'id,name,created_at,status,vehicle_id,origin,destination,route_metadata';
export default function SavedRoutesPanel({ user, revision, onLoad }: { user: User | null; revision: number; onLoad: (route: SavedRoute) => Promise<void> }) {
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [trash, setTrash] = useState(false);
  const [limit, setLimit] = useState(20);
  const [hasMore, setHasMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [undo, setUndo] = useState<SavedRoute | null>(null);
  const owner = useRef(user?.id); owner.current = user?.id;
  useEffect(() => { setRoutes([]); setUndo(null); setMessage(''); setTrash(false); setLimit(20); setBusy(false); setHasMore(false); }, [user?.id]);
  useEffect(() => {
    let active = true;
    if (!user || !supabase) return;
    setBusy(true);
    const query = supabase.from('saved_routes').select(COLUMNS).eq('owner_id', user.id);
    void (trash ? query.eq('status', 'archived') : query.neq('status', 'archived')).order('created_at', { ascending: false }).limit(limit + 1).then(({ data, error }) => {
      if (!active) return;
      if (error) setMessage('No se pudieron cargar tus rutas: ' + error.message);
      else { setRoutes((data || []).slice(0, limit) as SavedRoute[]); setHasMore((data || []).length > limit); }
      setBusy(false);
    });
    return () => { active = false; };
  }, [user?.id, trash, limit, revision, refresh]);
  async function setArchived(route: SavedRoute, archived: boolean) {
    if (!user || !supabase || busy) return;
    const ownerId = user.id;
    setBusy(true); setMessage('');
    try {
      const { data, error } = await supabase.from('saved_routes').update({ status: archived ? 'archived' : 'planned', updated_at: new Date().toISOString() }).eq('id', route.id).eq('owner_id', ownerId).select('id').single();
      if (error || !data) throw new Error(error?.message || 'No se encontró la ruta en tu cuenta.');
      if (owner.current !== ownerId) return;
      setUndo(archived ? route : null); setMessage(archived ? 'Ruta eliminada. Puedes recuperarla desde la papelera.' : 'Ruta recuperada.'); setRefresh(value => value + 1);
    } catch (error) { if (owner.current === ownerId) setMessage(error instanceof Error ? error.message : 'No se pudo actualizar la ruta.'); }
    finally { setBusy(false); }
  }
  return <section className="saved-routes" aria-labelledby="saved-routes-title"><div className="saved-routes-heading"><div><p className="eyebrow">TUS RECORRIDOS</p><h2 id="saved-routes-title">Mis rutas guardadas</h2><p>Recupera tus entregas o elimina los recorridos que ya no necesitas.</p></div>{user && <button type="button" disabled={busy} aria-pressed={trash} onClick={() => { setTrash(value => !value); setLimit(20); setMessage(''); }}>{trash ? 'Ver rutas activas' : 'Papelera'}</button>}</div>
    {!user ? <p>Inicia sesión para ver tus rutas.</p> : <>
      {trash && <p className="hint">Las rutas de la papelera conservan sus paradas y se pueden recuperar.</p>}
      {busy && <p role="status">Cargando…</p>}
      {message && <p role="status">{message} {undo && <button type="button" disabled={busy} onClick={() => void setArchived(undo, false)}>Deshacer</button>}</p>}
      <div className="saved-routes-list">{routes.map(route => <article className="saved-route-card" key={route.id}><div><strong>{route.name}</strong><small>{new Date(route.created_at).toLocaleDateString('es-MX')} · {route.route_metadata?.mode === 'truck' ? 'Camión' : 'Reparto'}<br/>{route.origin?.label || 'Origen guardado'} → {route.destination?.label || 'Destino guardado'}</small></div><div className="route-card-actions">{trash ? <button type="button" disabled={busy} aria-label={`Recuperar ${route.name}`} onClick={() => void setArchived(route, false)}>Recuperar</button> : <><button type="button" disabled={busy} onClick={async () => { setBusy(true); setMessage(''); try { await onLoad(route); } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo cargar la ruta.'); } finally { setBusy(false); } }}>Cargar ruta</button><button type="button" className="danger-button" disabled={busy} aria-label={`Eliminar ruta ${route.name}`} onClick={() => void setArchived(route, true)}>Eliminar</button></>}</div></article>)}</div>
      {!busy && !routes.length && <p>{trash ? 'La papelera está vacía.' : 'Todavía no has guardado recorridos.'}</p>}
      {hasMore && <button type="button" disabled={busy} onClick={() => setLimit(value => value + 20)}>Cargar más rutas</button>}
    </>}
  </section>;
}
