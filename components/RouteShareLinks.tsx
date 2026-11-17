'use client';
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SHARE_METADATA_COLUMNS, validShareToken } from '@/lib/route-sharing';
import { useShareRequest } from '@/lib/use-share-request';

type Link = { id: string; created_at: string; expires_at: string; revoked_at: string | null };
const date = (value: string) => new Date(value).toLocaleString('es-MX');
export default function RouteShareLinks({ routeId, ownerId, onClose }: { routeId: string; ownerId: string; onClose: () => void }) {
  const [links, setLinks] = useState<Link[]>([]), [hours, setHours] = useState('24'), [consent, setConsent] = useState(false);
  const [created, setCreated] = useState<{ id: string; url: string; expiresAt: string } | null>(null), [message, setMessage] = useState('');
  const { busy, error, run } = useShareRequest();
  function refresh() {
    if (!supabase) return;
    // Keep every potentially active link ahead of expired/revoked history, even
    // after many previous shares. The server allows at most ten active links.
    void run(signal => supabase!.from('route_share_links').select(SHARE_METADATA_COLUMNS).eq('owner_id', ownerId).eq('route_id', routeId).order('revoked_at', { ascending: true, nullsFirst: true }).order('expires_at', { ascending: false }).order('created_at', { ascending: false }).limit(50).abortSignal(signal), data => setLinks((data || []) as Link[]));
  }
  useEffect(refresh, [routeId, ownerId]); // Keyed by owner and route in the parent.
  function create() {
    if (!consent || busy || !supabase) return;
    setCreated(null); setMessage('');
    void run(signal => supabase!.rpc('create_route_share_link', { p_route_id: routeId, p_expires_hours: Number(hours) }).abortSignal(signal), data => {
      if (!data || !validShareToken(data.token) || typeof data.id !== 'string' || !Number.isFinite(Date.parse(data.expiresAt))) throw new Error('El servidor no confirmó el enlace. Actualiza la lista antes de reintentar.');
      setCreated({ id: data.id, url: `${window.location.origin}/#compartir=${data.token}`, expiresAt: data.expiresAt });
      setLinks(items => [{ id: data.id, created_at: new Date().toISOString(), expires_at: data.expiresAt, revoked_at: null }, ...items]);
      setConsent(false);
    });
  }
  function revoke(id: string) {
    if (busy || !supabase) return;
    setMessage('');
    void run(signal => supabase!.rpc('revoke_route_share_link', { p_share_id: id }).abortSignal(signal), ok => {
      if (!ok) throw new Error('No se encontró este enlace en tu cuenta. Actualiza la lista.');
      setLinks(items => items.map(item => item.id === id ? { ...item, revoked_at: new Date().toISOString() } : item));
      setCreated(item => item?.id === id ? null : item); setMessage('Enlace revocado. Las copias que alguien ya haya importado se conservan en su dispositivo.');
    });
  }
  return <section className="route-share-manager" aria-label="Compartir puntos de la ruta">
    <div className="share-heading"><h3>Compartir puntos</h3><button type="button" className="text-button" onClick={onClose}>Cerrar enlaces</button></div>
    <p>Se comparte una copia de las ubicaciones en su orden actual, las preferencias de carretera y las medidas del camión. El receptor deberá revisarlas y calcular su recorrido. Los cambios posteriores a la ruta no actualizan la copia.</p>
    <label>El enlace caduca en<select value={hours} disabled={busy} onChange={event => setHours(event.target.value)}><option value="1">1 hora</option><option value="24">24 horas</option><option value="72">3 días</option><option value="168">7 días</option></select></label>
    <label className="share-consent"><input type="checkbox" checked={consent} disabled={busy} onChange={event => setConsent(event.target.checked)}/><span>Permito que cualquier persona con el enlace vea el nombre, las ubicaciones y los parámetros compartidos del vehículo.</span></label>
    <button type="button" disabled={busy || !consent} onClick={create}>Crear enlace</button>
    {created && <div className="share-created"><label>Enlace para compartir<input readOnly value={created.url} onFocus={event => event.target.select()}/></label><small>Caduca: {date(created.expiresAt)}. Cópialo ahora; no guardamos el enlace completo y al cerrar dejará de mostrarse.</small><button type="button" onClick={() => { void navigator.clipboard?.writeText(created.url).then(() => setMessage('Enlace copiado. Envíalo sólo a quien deba recibir los puntos.'), () => setMessage('No se pudo copiar. Selecciona el enlace y cópialo manualmente.')); }}>Copiar enlace</button></div>}
    <div className="share-heading"><h4>Enlaces activos y recientes</h4><button type="button" className="text-button" disabled={busy} onClick={refresh}>Actualizar enlaces</button></div>
    <p className="hint">Hasta 10 enlaces activos por ruta; esta cifra no limita las entregas. Al eliminar la ruta se revocan sus enlaces, incluso si después la recuperas.</p>
    <ul className="share-link-list">{links.map(link => <li key={link.id}><span>{link.revoked_at ? 'Revocado' : Date.parse(link.expires_at) <= Date.now() ? 'Caducado' : 'Activo'} · Creado {date(link.created_at)}<small>Caduca {date(link.expires_at)}</small></span>{!link.revoked_at && Date.parse(link.expires_at) > Date.now() && <button type="button" disabled={busy} onClick={() => revoke(link.id)}>Revocar enlace</button>}</li>)}</ul>
    {!busy && !error && !links.length && <p>No hay enlaces para esta ruta.</p>}
    {busy && <p role="status">Consultando enlaces…</p>}{error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
  </section>;
}
