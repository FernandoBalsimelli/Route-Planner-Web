'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import RouteShareLinks from '@/components/RouteShareLinks';
import DeliveryProgressPanel from '@/components/DeliveryProgressPanel';
import { literalRouteNamePattern, SAVED_ROUTE_SEARCH_DEBOUNCE_MS, SAVED_ROUTE_QUERY_TIMEOUT_MS } from '@/lib/saved-route-search';

export type SavedRoute = { id: string; name: string; created_at: string; mode?: 'delivery' | 'truck'; status?: string; vehicle_id?: string | null; origin: { label?: string; lat?: number; lng?: number } | null; destination: { label?: string; lat?: number; lng?: number } | null; route_metadata?: { mode?: 'delivery' | 'truck'; vehicle?: { heightM?: number; widthM?: number; lengthM?: number; grossWeightT?: number; axleWeightT?: number; axleCount?: number; configuration?: string; payloadCapacityT?: number } | null; result?: import('@/lib/routes').RouteResult } | null };
// Fetch large geometry/instructions only when the operator opens that route.
const COLUMNS = 'id,name,created_at,status,vehicle_id,origin,destination,mode:route_metadata->>mode';
export default function SavedRoutesPanel({ user, revision, onLoad, active = true }: { user: User | null; revision: number; onLoad: (route: SavedRoute) => Promise<void>; active?: boolean }) {
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [trash, setTrash] = useState(false);
  const [shareRoute, setShareRoute] = useState<string | null>(null);
  const [progressRoute, setProgressRoute] = useState<string | null>(null);
  const [limit, setLimit] = useState(20);
  const [hasMore, setHasMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [queryError, setQueryError] = useState('');
  const [message, setMessage] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [undo, setUndo] = useState<SavedRoute | null>(null);
  const owner = useRef(user?.id); owner.current = user?.id;
  const lifetime = useRef(0);
  useEffect(() => () => { lifetime.current += 1; }, [user?.id, active]);
  useEffect(() => { if (!active) { setBusy(false); setShareRoute(null); setProgressRoute(null); } }, [active]);
  useEffect(() => { setShareRoute(null); setProgressRoute(null); }, [user?.id, trash, search]);
  useEffect(() => { setRoutes([]); setUndo(null); setMessage(''); setTrash(false); setLimit(20); setBusy(false); setLoading(false); setHasMore(false); setSearch(''); setQueryError(''); }, [user?.id]);
  useEffect(() => {
    let live = true;
    if (!active || !user || !supabase) { setLoading(false); return; }
    const controller = new AbortController();
    let deadline: ReturnType<typeof setTimeout> | undefined;
    let debounce: ReturnType<typeof setTimeout> | undefined;
    setLoading(true); setQueryError(''); setRoutes([]); setHasMore(false);
    const execute = () => {
      deadline = setTimeout(() => {
        controller.abort();
        if (live) { setLoading(false); setQueryError('La consulta de tus rutas tardó demasiado. Reintenta la búsqueda.'); }
      }, SAVED_ROUTE_QUERY_TIMEOUT_MS);
      let query = supabase!.from('saved_routes').select(COLUMNS).eq('owner_id', user.id);
      if (search.trim()) query = query.filter('name', 'imatch', literalRouteNamePattern(search));
      void Promise.resolve((trash ? query.eq('status', 'archived') : query.neq('status', 'archived')).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(limit + 1).abortSignal(controller.signal)).then(({ data, error }) => {
        if (!live || controller.signal.aborted) return;
        if (error) setQueryError('No se pudieron cargar tus rutas: ' + error.message);
        else { setRoutes((data || []).slice(0, limit) as SavedRoute[]); setHasMore((data || []).length > limit); }
      }).catch(() => {
        if (live && !controller.signal.aborted) setQueryError('No se pudo conectar con tus rutas guardadas. Reintenta la búsqueda.');
      }).finally(() => {
        clearTimeout(deadline);
        if (live && !controller.signal.aborted) setLoading(false);
      });
    };
    if (search.trim()) debounce = setTimeout(execute, SAVED_ROUTE_SEARCH_DEBOUNCE_MS);
    else execute();
    return () => { live = false; clearTimeout(debounce); clearTimeout(deadline); controller.abort(); };
  }, [user?.id, trash, search, limit, revision, refresh, active]);
  const pending = busy || loading;
  async function setArchived(route: SavedRoute, archived: boolean) {
    if (!active || !user || !supabase || pending) return;
    const ownerId = user.id;
    const generation = lifetime.current;
    setBusy(true); setMessage('');
    try {
      const { data, error } = await supabase.from('saved_routes').update({ status: archived ? 'archived' : 'planned', updated_at: new Date().toISOString() }).eq('id', route.id).eq('owner_id', ownerId).select('id').single();
      if (error || !data) throw new Error(error?.message || 'No se encontró la ruta en tu cuenta.');
      if (owner.current !== ownerId || lifetime.current !== generation) return;
      setUndo(archived ? route : null); setMessage(archived ? 'Ruta eliminada. Puedes recuperarla desde la papelera.' : 'Ruta recuperada.'); setRefresh(value => value + 1);
    } catch (error) { if (owner.current === ownerId && lifetime.current === generation) setMessage(error instanceof Error ? error.message : 'No se pudo actualizar la ruta.'); }
    finally { if (owner.current === ownerId && lifetime.current === generation) setBusy(false); }
  }
  async function load(route: SavedRoute) {
    if (!active || !user || !supabase || pending) return;
    const ownerId = user.id;
    const generation = lifetime.current;
    setBusy(true); setMessage('');
    try {
      const { data, error } = await supabase.from('saved_routes').select('id,name,created_at,status,vehicle_id,origin,destination,route_metadata').eq('id', route.id).eq('owner_id', ownerId).single();
      if (error || !data) throw new Error('No se pudo cargar la ruta: ' + (error?.message || 'No se encontró el registro.'));
      if (owner.current === ownerId && lifetime.current === generation) await onLoad(data as SavedRoute);
    } catch (error) { if (owner.current === ownerId && lifetime.current === generation) setMessage(error instanceof Error ? error.message : 'No se pudo cargar la ruta.'); }
    finally { if (owner.current === ownerId && lifetime.current === generation) setBusy(false); }
  }
  return <section className="saved-routes" aria-labelledby="saved-routes-title"><div className="saved-routes-heading"><div><p className="eyebrow">TUS RECORRIDOS</p><h2 id="saved-routes-title">Mis rutas guardadas</h2><p>Recupera tus entregas o elimina los recorridos que ya no necesitas.</p></div>{user && <button type="button" disabled={busy} aria-pressed={trash} onClick={() => { setTrash(value => !value); setLimit(20); setMessage(''); }}>{trash ? 'Ver rutas activas' : 'Papelera'}</button>}</div>
    {!user ? <p>Inicia sesión para ver tus rutas.</p> : <>
      <div className="saved-route-search"><label>Buscar rutas por nombre<input type="search" aria-label="Buscar rutas por nombre" maxLength={120} autoComplete="off" value={search} disabled={busy} onChange={event => { setSearch(event.target.value); setLimit(20); }}/></label>{search && <button type="button" className="text-button" disabled={busy} onClick={() => { setSearch(''); setLimit(20); }}>Limpiar búsqueda</button>}</div>
      {trash && <p className="hint">Las rutas de la papelera conservan sus paradas y se pueden recuperar.</p>}
      {pending && <p role="status">{loading ? 'Buscando rutas…' : 'Actualizando…'}</p>}
      {queryError && <p role="alert">{queryError} <button type="button" disabled={pending} onClick={() => setRefresh(value => value + 1)}>Reintentar búsqueda de rutas</button></p>}
      {message && <p role="status">{message} {undo && <button type="button" disabled={pending} onClick={() => void setArchived(undo, false)}>Deshacer</button>}</p>}
      <div className="saved-routes-list" aria-busy={loading}>{routes.map(route => <article className="saved-route-card" key={route.id}><div><strong>{route.name}</strong><small>{new Date(route.created_at).toLocaleDateString('es-MX')} · {route.mode === 'truck' ? 'Camión' : 'Reparto'}<br/>{route.origin?.label || 'Origen guardado'} → {route.destination?.label || 'Destino guardado'}</small></div><div className="route-card-actions">{trash ? <button type="button" disabled={pending} aria-label={`Recuperar ${route.name}`} onClick={() => void setArchived(route, false)}>Recuperar</button> : <><button type="button" disabled={pending} onClick={() => void load(route)}>Cargar ruta</button><button type="button" disabled={pending} aria-expanded={progressRoute === route.id} onClick={() => setProgressRoute(value => value === route.id ? null : route.id)}>Entregas</button><button type="button" disabled={pending} aria-expanded={shareRoute === route.id} onClick={() => setShareRoute(value => value === route.id ? null : route.id)}>Compartir puntos</button><button type="button" className="danger-button" disabled={pending} aria-label={`Eliminar ruta ${route.name}`} onClick={() => void setArchived(route, true)}>Eliminar</button></>}</div>{active && !trash && shareRoute === route.id && user && <RouteShareLinks key={`${user.id}-${route.id}`} routeId={route.id} ownerId={user.id} onClose={() => setShareRoute(null)}/>}{active && !trash && progressRoute === route.id && user && <DeliveryProgressPanel key={`progress-${user.id}-${route.id}`} routeId={route.id} onClose={() => setProgressRoute(null)}/>}</article>)}</div>
      {!pending && !queryError && !routes.length && <p>{search.trim() ? trash ? 'No hay rutas en la papelera con este nombre.' : 'No hay rutas activas con este nombre.' : trash ? 'La papelera está vacía.' : 'Todavía no has guardado recorridos.'}</p>}
      {hasMore && <button type="button" disabled={pending} onClick={() => setLimit(value => value + 20)}>Cargar más rutas</button>}
    </>}
  </section>;
}
