'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { User } from '@supabase/supabase-js';
import AccountPanel from '@/components/AccountPanel';
import { supabase } from '@/lib/supabase';

type Stop = { id: string; value: string };
type VehicleProfile = { id: string; name: string; vehicle_type: 'delivery' | 'car' | 'truck'; height_m: number | null; width_m: number | null; length_m: number | null; gross_weight_t: number | null; axle_weight_t: number | null };
type SavedRoute = { id: string; name: string; created_at: string; origin: { label?: string; lat?: number; lng?: number } | null; destination: { label?: string; lat?: number; lng?: number } | null; route_metadata?: { mode?: 'delivery' | 'truck'; vehicle?: { heightM?: number; widthM?: number; lengthM?: number; grossWeightT?: number; axleWeightT?: number } | null; result?: RouteResult } | null };
type RouteResult = { distanceMeters: number; durationSeconds: number; polyline?: string; optimized?: boolean; sections: Array<{ summary?: { length?: number; duration?: number }; actions?: Array<{ instruction?: string; action?: string }> }>; notices?: Array<{ title?: string; code?: string; severity?: string; details?: string }>; waypoints?: Array<{ lat: number; lng: number; label?: string; type: string }> };
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://route-planner-api-fernandobalsimellis-projects.vercel.app';
const RouteMap = dynamic(() => import('@/components/RouteMap'), { ssr: false, loading: () => <div className="route-map-loading">Cargando mapa…</div> });

function formatDistance(meters: number) { return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`; }
function formatDuration(seconds: number) { const mins = Math.round(seconds / 60); const hours = Math.floor(mins / 60); return hours ? `${hours} h ${mins % 60} min` : `${mins} min`; }

export default function Home() {
  const [mode, setMode] = useState<'delivery' | 'truck'>('delivery');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [stops, setStops] = useState<Stop[]>([]);
  const [optimizeStops, setOptimizeStops] = useState(false);
  const [vehicle, setVehicle] = useState({ height: '4.0', width: '2.5', length: '18', grossWeight: '40', axleWeight: '10' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<RouteResult | null>(null);
  const [providerStatus, setProviderStatus] = useState<'unknown' | 'ready' | 'missing'>('unknown');
  const [user, setUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [savedRoutesLoading, setSavedRoutesLoading] = useState(false);
  const [savedRoutesError, setSavedRoutesError] = useState('');
  const [vehicleProfiles, setVehicleProfiles] = useState<VehicleProfile[]>([]);
  const [selectedVehicleProfileId, setSelectedVehicleProfileId] = useState('');
  const [vehicleProfileName, setVehicleProfileName] = useState('');
  const [vehicleProfileSaving, setVehicleProfileSaving] = useState(false);
  const [vehicleProfileMessage, setVehicleProfileMessage] = useState('');
  const canPlan = origin.trim().length > 2 && destination.trim().length > 2 && !loading;
  const mapsUrl = useMemo(() => {
    const routePoints = result?.waypoints?.length
      ? result.waypoints.map(point => point.label || (point.lat + ', ' + point.lng))
      : [origin, ...stops.map(s => s.value), destination];
    const points = routePoints.filter(Boolean);
    if (points.length < 2) return '';
    return 'https://www.google.com/maps/dir/' + points.map(encodeURIComponent).join('/');
  }, [origin, destination, stops, result]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user || !supabase) { setSavedRoutes([]); setSavedRoutesError(''); return; }
      setSavedRoutesLoading(true);
      setSavedRoutesError('');
      const [{ data, error }, { data: profiles, error: profilesError }] = await Promise.all([
        supabase.from('saved_routes').select('id,name,created_at,origin,destination,route_metadata').order('created_at', { ascending: false }).limit(10),
        supabase.from('vehicles').select('id,name,vehicle_type,height_m,width_m,length_m,gross_weight_t,axle_weight_t').eq('vehicle_type', 'truck').order('created_at', { ascending: false }).limit(20),
      ]);
      if (!cancelled) {
        if (error) setSavedRoutesError('No se pudieron cargar tus rutas: ' + error.message);
        else setSavedRoutes((data || []) as SavedRoute[]);
        if (profilesError) setVehicleProfileMessage('No se pudieron cargar los perfiles: ' + profilesError.message);
        else setVehicleProfiles((profiles || []) as VehicleProfile[]);
        setSavedRoutesLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [user]);

  function changeMode(nextMode: 'delivery' | 'truck') { setMode(nextMode); setResult(null); if (nextMode === 'truck') setOptimizeStops(false); }
  function addStop() { setStops(items => [...items, { id: crypto.randomUUID(), value: '' }]); setResult(null); }
  function updateStop(id: string, value: string) { setStops(items => items.map(s => s.id === id ? { ...s, value } : s)); setResult(null); }
  function removeStop(id: string) { setStops(items => items.filter(s => s.id !== id)); setResult(null); }

  function loadVehicleProfile(profileId: string) {
    const profile = vehicleProfiles.find(item => item.id === profileId);
    setSelectedVehicleProfileId(profileId);
    if (!profile) return;
    setMode('truck');
    setResult(null);
    setVehicle({
      height: String(profile.height_m ?? 4),
      width: String(profile.width_m ?? 2.5),
      length: String(profile.length_m ?? 18),
      grossWeight: String(profile.gross_weight_t ?? 40),
      axleWeight: String(profile.axle_weight_t ?? 10),
    });
    setVehicleProfileMessage('Perfil "' + profile.name + '" cargado.');
  }

  async function saveVehicleProfile() {
    if (!user || !supabase) { setVehicleProfileMessage('Inicia sesión para guardar perfiles.'); return; }
    setVehicleProfileSaving(true);
    setVehicleProfileMessage('');
    try {
      const { data, error } = await supabase.from('vehicles').insert({
        owner_id: user.id,
        name: vehicleProfileName.trim() || 'Camión ' + (vehicleProfiles.length + 1),
        vehicle_type: 'truck',
        height_m: Number(vehicle.height),
        width_m: Number(vehicle.width),
        length_m: Number(vehicle.length),
        gross_weight_t: Number(vehicle.grossWeight),
        axle_weight_t: Number(vehicle.axleWeight),
      }).select('id,name,vehicle_type,height_m,width_m,length_m,gross_weight_t,axle_weight_t').single();
      if (error) throw error;
      setVehicleProfiles(items => [data as VehicleProfile, ...items]);
      setSelectedVehicleProfileId(data.id);
      setVehicleProfileName('');
      setVehicleProfileMessage('Perfil de camión guardado.');
    } catch (error) {
      setVehicleProfileMessage(error instanceof Error ? error.message : 'No se pudo guardar el perfil.');
    } finally {
      setVehicleProfileSaving(false);
    }
  }

  async function restoreSavedRoute(route: SavedRoute) {
    if (!supabase) return;
    const { data, error } = await supabase.from('route_stops')
      .select('sequence,location')
      .eq('route_id', route.id)
      .order('sequence', { ascending: true });
    if (error) { setSavedRoutesError('No se pudieron cargar las paradas: ' + error.message); return; }
    const label = (point: SavedRoute['origin']) => point?.label || (point?.lat != null && point?.lng != null ? `${point.lat}, ${point.lng}` : '');
    setOrigin(label(route.origin));
    setDestination(label(route.destination));
    setStops((data || []).map((row: { sequence: number; location: { label?: string; lat?: number; lng?: number } }) => ({
      id: crypto.randomUUID(),
      value: row.location?.label || (row.location?.lat != null && row.location?.lng != null ? `${row.location.lat}, ${row.location.lng}` : ''),
    })));
    setMode(route.route_metadata?.mode || (route.name.startsWith('Camión') ? 'truck' : 'delivery'));
    const savedVehicle = route.route_metadata?.vehicle;
    if (savedVehicle) setVehicle({ height: String(savedVehicle.heightM ?? 4), width: String(savedVehicle.widthM ?? 2.5), length: String(savedVehicle.lengthM ?? 18), grossWeight: String(savedVehicle.grossWeightT ?? 40), axleWeight: String(savedVehicle.axleWeightT ?? 10) });
    setSelectedVehicleProfileId('');
    setResult(route.route_metadata?.result || null);
    setOptimizeStops(Boolean(route.route_metadata?.result?.optimized));
    setError('');
    setSaveMessage(`Se cargó "${route.name}". Puedes continuar o volver a calcular la ruta.`);
    document.getElementById('planificador')?.scrollIntoView({ behavior: 'smooth' });
  }

  async function planRoute() {
    if (!canPlan) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const { data: sessionData } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
      if (!sessionData.session) throw new Error('Inicia sesión para calcular una ruta.');
      const response = await fetch(`${API_URL}/v1/routes/plan`, {
        method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${sessionData.session.access_token}` },
        body: JSON.stringify({ origin: origin.trim(), destination: destination.trim(), stops: stops.map(s => s.value.trim()).filter(Boolean), mode, optimize: optimizeStops && mode === 'delivery', vehicle: mode === 'truck' ? { heightM: Number(vehicle.height), widthM: Number(vehicle.width), lengthM: Number(vehicle.length), grossWeightT: Number(vehicle.grossWeight), axleWeightT: Number(vehicle.axleWeight) } : undefined }),
      });
      const payload = await response.json();
      if (!response.ok) { if (payload.code === 'ORS_API_KEY_MISSING') setProviderStatus('missing'); throw new Error(payload.message || 'No se pudo calcular la ruta.'); }
      setResult(payload.route); setProviderStatus('ready');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error inesperado al calcular la ruta.';
      setError(message);
      if (message.toLowerCase().includes('ors_api_key_missing')) setProviderStatus('missing');
    } finally { setLoading(false); }
  }

  async function saveRoute() {
    if (!user || !supabase) { setSaveMessage('Inicia sesión para guardar tus recorridos.'); return; }
    if (!result) return;
    setSaving(true); setSaveMessage('');
    try {
      const { data: saved, error } = await supabase.from('saved_routes').insert({
        owner_id: user.id,
        name: `${mode === 'truck' ? 'Camión' : 'Reparto'} · ${new Date().toLocaleDateString('es-MX')}`,
        provider: 'openrouteservice',
        origin: result.waypoints?.[0] ?? { label: origin },
        destination: result.waypoints?.[result.waypoints.length - 1] ?? { label: destination },
        status: 'planned',
        route_metadata: {
          mode,
          vehicle: mode === 'truck' ? { heightM: Number(vehicle.height), widthM: Number(vehicle.width), lengthM: Number(vehicle.length), grossWeightT: Number(vehicle.grossWeight), axleWeightT: Number(vehicle.axleWeight) } : null,
          result,
        },
      }).select('id').single();
      if (error) throw error;
      const stopRows = stops.filter(s => s.value.trim()).map((stop, index) => {
        const waypoint = result.waypoints?.[index + 1];
        return {
          route_id: saved.id, owner_id: user.id, sequence: index + 1,
          location: { label: stop.value.trim(), ...(waypoint ? { lat: waypoint.lat, lng: waypoint.lng } : {}) },
        };
      });
      if (stopRows.length) {
        const { error: stopError } = await supabase.from('route_stops').insert(stopRows);
        if (stopError) {
          await supabase.from('saved_routes').delete().eq('id', saved.id);
          throw stopError;
        }
      }
      setSaveMessage('Ruta guardada en tu cuenta.');
      const { data: refreshed } = await supabase.from('saved_routes').select('id,name,created_at,origin,destination,route_metadata').order('created_at', { ascending: false }).limit(10);
      if (refreshed) setSavedRoutes(refreshed as SavedRoute[]);
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'No se pudo guardar la ruta.');
    } finally { setSaving(false); }
  }

  return <main className="shell">
    <header className="topbar"><a className="brand" href="#inicio"><span className="brand-mark">R</span><span>ROUTE <b>PLANNER</b></span></a><nav><a href="#planificador">Planificador</a><a href="#como-funciona">Cómo funciona</a></nav><AccountPanel onUserChange={setUser} /><span className="status"><i /> Beta · staging</span></header>
    <section className="hero" id="inicio"><div className="hero-copy"><p className="eyebrow">PLANIFICACIÓN INTELIGENTE DE RUTAS</p><h1>Tu ruta, <em>mejor pensada.</em></h1><p className="lead">Planifica recorridos de reparto y transporte pesado con paradas, perfiles de vehículo y cálculo de rutas OpenRouteService.</p><div className="hero-tags"><span>01 · Reparto</span><span>02 · Camiones</span><span>03 · Múltiples paradas</span></div></div><div className="hero-art" aria-hidden="true"><div className="map-grid"/><svg viewBox="0 0 460 300" role="img"><path d="M30 230 C95 190 94 110 175 132 S265 255 325 178 S380 65 435 55" fill="none" stroke="#b8d8c9" strokeWidth="18" strokeLinecap="round"/><path d="M30 230 C95 190 94 110 175 132 S265 255 325 178 S380 65 435 55" fill="none" stroke="#0f3d31" strokeWidth="4" strokeDasharray="7 9" strokeLinecap="round"/><circle cx="30" cy="230" r="12" fill="#f2b35f" stroke="#fff" strokeWidth="5"/><circle cx="175" cy="132" r="12" fill="#f2b35f" stroke="#fff" strokeWidth="5"/><circle cx="325" cy="178" r="12" fill="#f2b35f" stroke="#fff" strokeWidth="5"/><circle cx="435" cy="55" r="12" fill="#0f3d31" stroke="#fff" strokeWidth="5"/></svg><div className="route-chip"><span>RUTA OPTIMIZADA</span><strong>Lista para planear</strong></div></div></section>
    <section className="planner" id="planificador"><div className="planner-heading"><div><p className="eyebrow">CENTRO DE RUTAS</p><h2>Planifica un recorrido</h2><p>Agrega tus puntos y selecciona el tipo de vehículo.</p></div><div className="mode-switch"><button className={mode === 'delivery' ? 'selected' : ''} onClick={() => changeMode('delivery')}>↗ Reparto</button><button className={mode === 'truck' ? 'selected' : ''} onClick={() => changeMode('truck')}>▰ Camión</button></div></div>
      <div className="planner-grid"><div className="route-form"><label className="field"><span><i className="dot green"/> ORIGEN</span><input value={origin} onChange={e => { setOrigin(e.target.value); setResult(null); }} placeholder="Dirección, ciudad o coordenadas" /></label><div className="stops-head"><span>PARADAS INTERMEDIAS</span><button className="text-button" onClick={addStop}>＋ Agregar parada</button></div>{stops.map((stop, index) => <label className="field stop-field" key={stop.id}><span><i className="stop-number">{index + 1}</i> PARADA {index + 1}</span><div className="input-with-action"><input value={stop.value} onChange={e => updateStop(stop.id, e.target.value)} placeholder="Dirección de la parada"/><button aria-label="Eliminar parada" onClick={() => removeStop(stop.id)}>×</button></div></label>)}<label className="optimize-toggle"><input type="checkbox" checked={optimizeStops} onChange={e => setOptimizeStops(e.target.checked)} disabled={mode === 'truck' || stops.filter(stop => stop.value.trim()).length < 2}/><span><b>Optimizar orden de paradas</b><small>{mode === 'truck' ? 'En camiones conservamos el orden indicado y aplicamos las restricciones del vehículo.' : 'Reordena automáticamente las paradas para reducir el recorrido.'}</small></span></label><label className="field"><span><i className="dot orange"/> DESTINO</span><input value={destination} onChange={e => { setDestination(e.target.value); setResult(null); }} placeholder="Dirección o destino final" /></label>
      {mode === 'truck' && <div className="vehicle-panel"><div className="vehicle-title"><strong>Perfil del camión</strong><small>Medidas del vehículo cargado</small></div><div className="vehicle-fields"><label>Altura (m)<input type="number" min="0.5" max="10" step="0.1" value={vehicle.height} onChange={e => { setVehicle(v => ({...v,height:e.target.value})); setResult(null); }}/></label><label>Ancho (m)<input type="number" min="0.5" max="5" step="0.1" value={vehicle.width} onChange={e => { setVehicle(v => ({...v,width:e.target.value})); setResult(null); }}/></label><label>Largo (m)<input type="number" min="1" max="30" step="0.1" value={vehicle.length} onChange={e => { setVehicle(v => ({...v,length:e.target.value})); setResult(null); }}/></label><label>Peso bruto (t)<input type="number" min="0.1" max="100" step="0.1" value={vehicle.grossWeight} onChange={e => { setVehicle(v => ({...v,grossWeight:e.target.value})); setResult(null); }}/></label><label>Peso por eje (t)<input type="number" min="0.1" max="30" step="0.1" value={vehicle.axleWeight} onChange={e => { setVehicle(v => ({...v,axleWeight:e.target.value})); setResult(null); }}/></label></div><div className="vehicle-profile-tools">
        <label>Perfiles guardados<select value={selectedVehicleProfileId} onChange={e => loadVehicleProfile(e.target.value)}><option value="">Usar medidas actuales</option>{vehicleProfiles.map(profile => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></label>
        <div className="vehicle-profile-save-row"><input aria-label="Nombre del perfil" value={vehicleProfileName} onChange={e => setVehicleProfileName(e.target.value)} placeholder="Nombre del perfil (opcional)" /><button type="button" onClick={() => void saveVehicleProfile()} disabled={vehicleProfileSaving}>{vehicleProfileSaving ? 'Guardando…' : 'Guardar perfil'}</button></div>
        {vehicleProfileMessage && <p className="vehicle-profile-message" role="status">{vehicleProfileMessage}</p>}
      </div><p className="hint">OpenRouteService considerará las restricciones disponibles en OpenStreetMap; la cobertura puede ser incompleta.</p></div>}
      <button className="primary-button" disabled={!canPlan} onClick={planRoute}>{loading ? 'Calculando ruta…' : 'Calcular ruta  →'}</button>{mapsUrl && <a className="secondary-button" href={mapsUrl} target="_blank" rel="noreferrer">Abrir puntos en Google Maps ↗</a>}
      {error && <div className="error-box"><strong>No se pudo calcular</strong><p>{error}</p>{providerStatus === 'missing' && <small>Falta configurar ORS_API_KEY como variable secreta en Vercel.</small>}</div>}
      </div><aside className="result-panel"><div className="result-top"><span>RESULTADO DEL RECORRIDO</span><span className="result-icon">⌁</span></div>{result ? <><div className="metrics"><div><small>DISTANCIA</small><strong>{formatDistance(result.distanceMeters)}</strong></div><div><small>TIEMPO ESTIMADO</small><strong>{formatDuration(result.durationSeconds)}</strong></div></div>{result.optimized && <p className="optimized-note">Orden de paradas optimizado automáticamente para reducir el recorrido.</p>}<RouteMap polyline={result.polyline} waypoints={result.waypoints || []}/><div className="route-line"><div className="route-point"><i className="dot green"/><span><b>Origen</b><small>{origin}</small></span></div>{(result.waypoints || []).filter(point => point.type === 'stop').map((point,i)=><div className="route-point" key={i}><i className="stop-number">{i+1}</i><span><b>Parada {i+1}</b><small>{point.label || (point.lat + ', ' + point.lng)}</small></span></div>)}<div className="route-point"><i className="dot orange"/><span><b>Destino</b><small>{destination}</small></span></div></div><div className="instructions"><strong>Indicaciones</strong>{result.sections.flatMap(section => section.actions || []).filter(action => action.instruction).slice(0, 12).map((action, index) => <p key={index}>{index + 1}. {action.instruction}</p>)}</div>{(result.notices || []).length > 0 && <div className="notice-box"><strong>Avisos de ruta</strong>{result.notices?.map((n,i)=><p key={i}>{n.title || n.details || n.code}</p>)}</div>}<button className="primary-button save-button" disabled={saving} onClick={saveRoute}>{saving ? 'Guardando…' : 'Guardar esta ruta'}</button>{saveMessage && <p className="save-message">{saveMessage}</p>}<a className="secondary-button" href={mapsUrl} target="_blank" rel="noreferrer">Abrir navegación ↗</a></> : <div className="empty-state"><div className="empty-route">⌁</div><strong>Tu ruta aparecerá aquí</strong><p>Completa origen y destino para obtener distancia, tiempo y avisos del recorrido.</p><div className="empty-stats"><span>— km <small>Distancia</small></span><span>— min <small>Duración</small></span></div></div>}</aside></div><p className="disclaimer">Las rutas para camiones dependen de los datos y restricciones disponibles en OpenStreetMap. Verifica señalización y normativa local antes de circular.</p>
    </section>
    <section className="saved-routes" aria-labelledby="saved-routes-title">
      <div className="saved-routes-heading">
        <div><p className="eyebrow">TU CUENTA</p><h2 id="saved-routes-title">Mis rutas guardadas</h2><p>Recupera un recorrido anterior y vuelve a calcularlo cuando lo necesites.</p></div>
        {!user && <span className="saved-routes-note">Inicia sesión para ver tus rutas.</span>}
      </div>
      {user && (savedRoutesLoading ? <p className="saved-routes-note">Cargando tus rutas…</p> : savedRoutesError ? <p className="saved-routes-error">{savedRoutesError}</p> : savedRoutes.length ? <div className="saved-routes-list">{savedRoutes.map(route => <article className="saved-route-card" key={route.id}>
        <div><strong>{route.name}</strong><small>{new Date(route.created_at).toLocaleDateString('es-MX')} · {route.route_metadata?.mode === 'truck' ? 'Camión' : 'Reparto'}{route.route_metadata?.result ? ` · ${formatDistance(route.route_metadata.result.distanceMeters)} · ${formatDuration(route.route_metadata.result.durationSeconds)}` : ''}<br />{route.origin?.label || 'Origen guardado'} → {route.destination?.label || 'Destino guardado'}</small></div>
        <button type="button" onClick={() => void restoreSavedRoute(route)}>Cargar ruta</button>
      </article>)}</div> : <p className="saved-routes-note">Todavía no has guardado recorridos.</p>)}
    </section>
    <section className="features" id="como-funciona"><div><p className="eyebrow">DISEÑADO PARA TRABAJAR</p><h2>Una herramienta para cada tipo de recorrido.</h2></div><article><span>01</span><h3>Reparto y mensajería</h3><p>Organiza origen, entregas y destino desde un solo lugar.</p></article><article><span>02</span><h3>Transporte pesado</h3><p>Considera dimensiones, peso bruto y peso por eje.</p></article><article><span>03</span><h3>Tu operación, después</h3><p>La base está preparada para perfiles, vehículos, rutas guardadas y flotas.</p></article></section>
    <footer><a className="brand" href="#inicio"><span className="brand-mark">R</span><span>ROUTE <b>PLANNER</b></span></a><span>Hecho para mover el trabajo.</span><span>Versión inicial · 2026</span></footer>
  </main>;
}
