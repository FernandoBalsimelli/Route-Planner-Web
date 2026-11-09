'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { User } from '@supabase/supabase-js';
import AccountPanel from '@/components/AccountPanel';
import LocationInput, { type LocationSelection } from '@/components/LocationInput';
import { supabase } from '@/lib/supabase';
import RouteStops from '@/components/RouteStops';
import { moveStop, type RouteStop } from '@/lib/route-stops';
import { googleMapsUrls } from '@/lib/navigation';
import NavigationLinks from '@/components/NavigationLinks';
import VehicleManager from '@/components/VehicleManager';
import SavedRoutesPanel, { type SavedRoute } from '@/components/SavedRoutesPanel';
import ManifestImport from '@/components/ManifestImport';
import { VEHICLE_COLUMNS, type VehicleProfile } from '@/lib/vehicles';
import type { RouteResult } from '@/lib/routes';
import LocationBookProvider from '@/components/LocationBookProvider';
import RouteExports from '@/components/RouteExports';

type Stop = RouteStop;
const API_URL = '/api/route-planner';
const RouteMap = dynamic(() => import('@/components/RouteMap'), { ssr: false, loading: () => <div className="route-map-loading">Cargando mapa…</div> });

function formatDistance(meters: number) { return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`; }
function formatDuration(seconds: number) { const mins = Math.round(seconds / 60); const hours = Math.floor(mins / 60); return hours ? `${hours} h ${mins % 60} min` : `${mins} min`; }

export default function Home() {
  const [mode, setMode] = useState<'delivery' | 'truck'>('delivery');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedOrigin, setSelectedOrigin] = useState<LocationSelection | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<LocationSelection | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [optimizeStops, setOptimizeStops] = useState(false);
  const [stopOrderMessage, setStopOrderMessage] = useState('');
  const [vehicle, setVehicle] = useState({ height: '4.0', width: '2.5', length: '18', grossWeight: '40', axleWeight: '10' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<RouteResult | null>(null);
  const [providerStatus, setProviderStatus] = useState<'unknown' | 'ready' | 'missing'>('unknown');
  const [user, setUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [routesRevision, setRoutesRevision] = useState(0);
  const [vehicleProfiles, setVehicleProfiles] = useState<VehicleProfile[]>([]);
  const [selectedVehicleProfileId, setSelectedVehicleProfileId] = useState('');
  const [vehicleProfileMessage, setVehicleProfileMessage] = useState('');
  const [searchArea, setSearchArea] = useState<LocationSelection | null>(null);
  const planningRequest = useRef<AbortController | null>(null);
  useEffect(() => {
    planningRequest.current?.abort();
    setLoading(false);
  }, [origin, destination, selectedOrigin, selectedDestination, stops, mode, vehicle, optimizeStops]);
  useEffect(() => () => planningRequest.current?.abort(), []);
  const canPlan = origin.trim().length > 2 && destination.trim().length > 2 && !loading;
  const mapsUrls = useMemo(() => {
    const routePoints = result?.waypoints?.length
      ? result.waypoints
      : [selectedOrigin || origin, ...stops.map(s => s.selected || s.value), selectedDestination || destination];
    return googleMapsUrls(routePoints);
  }, [origin, destination, selectedOrigin, selectedDestination, stops, result]);

  useEffect(() => {
    let cancelled = false;
    setVehicleProfiles([]); setSelectedVehicleProfileId(''); setVehicleProfileMessage('');
    if (user && supabase) void supabase.from('vehicles').select(VEHICLE_COLUMNS).eq('owner_id', user.id).order('created_at', { ascending: false }).then(({ data, error }) => {
      if (cancelled) return;
      if (error) setVehicleProfileMessage('No se pudieron cargar tus vehículos: ' + error.message);
      else setVehicleProfiles((data || []) as VehicleProfile[]);
    });
    return () => { cancelled = true; };
  }, [user?.id]);

  function changeMode(nextMode: 'delivery' | 'truck') { setMode(nextMode); setResult(null); setSelectedVehicleProfileId(''); if (nextMode === 'truck') setOptimizeStops(false); }
  function addStop() { if (stops.length >= 8) return; setStops(items => [...items, { id: crypto.randomUUID(), value: '', selected: null }]); setResult(null); }
  function updateStop(id: string, value: string) { setStops(items => items.map(s => s.id === id ? { ...s, value, selected: null } : s)); setResult(null); }
  function removeStop(id: string) { setStops(items => items.filter(s => s.id !== id)); setResult(null); }
  function reorderStop(id: string, direction: -1 | 1) { setStops(items => moveStop(items, id, direction)); setOptimizeStops(false); setResult(null); setStopOrderMessage('Orden actualizado. Calcula de nuevo para usar este orden; la optimización automática está desactivada.'); }

  function loadVehicleProfile(profileId: string, supplied?: VehicleProfile) {
    const profile = supplied || vehicleProfiles.find(item => item.id === profileId);
    setSelectedVehicleProfileId(profileId);
    if (!profile) return;
    setMode(profile.vehicle_type === 'truck' ? 'truck' : 'delivery');
    if (profile.vehicle_type === 'truck') setOptimizeStops(false);
    setResult(null);
    setVehicle({ height: String(profile.height_m ?? 4), width: String(profile.width_m ?? 2.5), length: String(profile.length_m ?? 18), grossWeight: String(profile.gross_weight_t ?? 40), axleWeight: String(profile.axle_weight_t ?? 10) });
    setVehicleProfileMessage('Vehículo seleccionado: ' + profile.name + '.');
  }

  function importDeliveries(points: LocationSelection[], useLastAsDestination: boolean) {
    const additions = useLastAsDestination ? points.slice(0, -1) : points;
    if (stops.length + additions.length > 8) return;
    setStops(items => [...items, ...additions.map(point => ({ id: crypto.randomUUID(), value: point.label, selected: point }))]);
    if (useLastAsDestination && points.length) { const last = points[points.length - 1]; setDestination(last.label); setSelectedDestination(last); }
    setOptimizeStops(false); setResult(null); setStopOrderMessage(`${points.length} entregas confirmadas añadidas desde el manifiesto. Se conserva su orden.`);
  }

  async function restoreSavedRoute(route: SavedRoute) {
    if (!supabase) return;
    const { data, error } = await supabase.from('route_stops')
      .select('sequence,location')
      .eq('route_id', route.id)
      .order('sequence', { ascending: true });
    if (error) throw new Error('No se pudieron cargar las paradas: ' + error.message);
    const label = (point: SavedRoute['origin']) => point?.label || (point?.lat != null && point?.lng != null ? `${point.lat}, ${point.lng}` : '');
    setOrigin(label(route.origin));
    setDestination(label(route.destination));
    setSelectedOrigin(route.origin?.lat != null && route.origin?.lng != null ? { label: label(route.origin), lat: route.origin.lat, lng: route.origin.lng } : null);
    setSelectedDestination(route.destination?.lat != null && route.destination?.lng != null ? { label: label(route.destination), lat: route.destination.lat, lng: route.destination.lng } : null);
    setStops((data || []).map((row: { sequence: number; location: { label?: string; lat?: number; lng?: number } }) => ({
      id: crypto.randomUUID(),
      value: row.location?.label || (row.location?.lat != null && row.location?.lng != null ? `${row.location.lat}, ${row.location.lng}` : ''),
      selected: row.location?.lat != null && row.location?.lng != null ? { label: row.location.label || `${row.location.lat}, ${row.location.lng}`, lat: row.location.lat, lng: row.location.lng } : null,
    })));
    setMode(route.route_metadata?.mode || (route.name.startsWith('Camión') ? 'truck' : 'delivery'));
    const savedVehicle = route.route_metadata?.vehicle;
    if (savedVehicle) setVehicle({ height: String(savedVehicle.heightM ?? 4), width: String(savedVehicle.widthM ?? 2.5), length: String(savedVehicle.lengthM ?? 18), grossWeight: String(savedVehicle.grossWeightT ?? 40), axleWeight: String(savedVehicle.axleWeightT ?? 10) });
    setSelectedVehicleProfileId(route.vehicle_id || '');
    if (route.origin?.lat != null && route.origin?.lng != null) setSearchArea({ label: label(route.origin), lat: route.origin.lat, lng: route.origin.lng });
    setResult(route.route_metadata?.result || null);
    setOptimizeStops(Boolean(route.route_metadata?.result?.optimized));
    setError('');
    setSaveMessage(`Se cargó "${route.name}". Puedes continuar o volver a calcular la ruta.`);
    document.getElementById('planificador')?.scrollIntoView({ behavior: 'smooth' });
  }

  async function planRoute() {
    if (!canPlan) return;
    planningRequest.current?.abort();
    const controller = new AbortController();
    planningRequest.current = controller;
    setLoading(true); setError(''); setResult(null);
    try {
      let sessionData;
      try {
        const sessionResult = supabase ? await supabase.auth.getSession() : { data: { session: null }, error: null };
        if (sessionResult.error) throw sessionResult.error;
        sessionData = sessionResult.data;
      } catch (sessionError) {
        console.error('Route Planner session lookup failed:', sessionError);
        throw new Error('No se pudo comprobar tu sesión con Supabase. Comprueba tu conexión e inicia sesión nuevamente.');
      }
      if (!sessionData.session) throw new Error('Inicia sesión para calcular una ruta.');
      let response: Response;
      try {
        response = await fetch(`${API_URL}/v1/routes/plan`, {
          signal: controller.signal,
          method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${sessionData.session.access_token}` },
          body: JSON.stringify({ origin: selectedOrigin || origin.trim(), destination: selectedDestination || destination.trim(), stops: stops.filter(s => s.value.trim()).map(s => s.selected || s.value.trim()), mode, optimize: optimizeStops && mode === 'delivery', vehicle: mode === 'truck' ? { heightM: Number(vehicle.height), widthM: Number(vehicle.width), lengthM: Number(vehicle.length), grossWeightT: Number(vehicle.grossWeight), axleWeightT: Number(vehicle.axleWeight) } : undefined }),
        });
      } catch {
        throw new Error('No se pudo conectar con Route Planner API. La conexión fue interrumpida antes de recibir respuesta.');
      }
      const payload = await response.json().catch(() => ({}));
      if (controller.signal.aborted) return;
      if (!response.ok) { if (payload.code === 'ORS_API_KEY_MISSING') setProviderStatus('missing'); throw new Error(payload.message || 'No se pudo calcular la ruta.'); }
      setResult(payload.route); setProviderStatus('ready');
    } catch (e) {
      if (controller.signal.aborted) return;
      const message = e instanceof Error ? e.message : 'Error inesperado al calcular la ruta.';
      setError(message);
      if (message.toLowerCase().includes('ors_api_key_missing')) setProviderStatus('missing');
    } finally { if (planningRequest.current === controller) setLoading(false); }
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
        vehicle_id: selectedVehicleProfileId || null,
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
      const stopRows = (result.waypoints || []).filter(point => point.type === 'stop').map((point, index) => ({
        route_id: saved.id,
        owner_id: user.id,
        sequence: index + 1,
        location: { label: point.label || (point.lat + ', ' + point.lng), lat: point.lat, lng: point.lng },
      }));
      if (stopRows.length) {
        const { error: stopError } = await supabase.from('route_stops').insert(stopRows);
        if (stopError) {
          await supabase.from('saved_routes').delete().eq('id', saved.id);
          throw stopError;
        }
      }
      setSaveMessage('Ruta guardada en tu cuenta.');
      setRoutesRevision(value => value + 1);
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'No se pudo guardar la ruta.');
    } finally { setSaving(false); }
  }

  return <LocationBookProvider key={user?.id || 'guest-book'} user={user}><main className="shell">
    <header className="topbar"><a className="brand" href="#inicio"><span className="brand-mark">R</span><span>ROUTE <b>PLANNER</b></span></a><nav><a href="#planificador">Planificador</a><a href="#mi-perfil">Mi perfil</a><a href="#como-funciona">Cómo funciona</a></nav><AccountPanel onUserChange={setUser} /><span className="status"><i /> Beta</span></header>
    <section className="hero" id="inicio"><div className="hero-copy"><p className="eyebrow">PLANIFICACIÓN INTELIGENTE DE RUTAS</p><h1>Tu ruta, <em>mejor pensada.</em></h1><p className="lead">Planifica recorridos de reparto y transporte pesado con paradas, perfiles de vehículo y cálculo de rutas OpenRouteService.</p><div className="hero-tags"><span>01 · Reparto</span><span>02 · Camiones</span><span>03 · Múltiples paradas</span></div></div><div className="hero-art" aria-hidden="true"><div className="map-grid"/><svg viewBox="0 0 460 300" role="img"><path d="M30 230 C95 190 94 110 175 132 S265 255 325 178 S380 65 435 55" fill="none" stroke="#b8d8c9" strokeWidth="18" strokeLinecap="round"/><path d="M30 230 C95 190 94 110 175 132 S265 255 325 178 S380 65 435 55" fill="none" stroke="#0f3d31" strokeWidth="4" strokeDasharray="7 9" strokeLinecap="round"/><circle cx="30" cy="230" r="12" fill="#f2b35f" stroke="#fff" strokeWidth="5"/><circle cx="175" cy="132" r="12" fill="#f2b35f" stroke="#fff" strokeWidth="5"/><circle cx="325" cy="178" r="12" fill="#f2b35f" stroke="#fff" strokeWidth="5"/><circle cx="435" cy="55" r="12" fill="#0f3d31" stroke="#fff" strokeWidth="5"/></svg><div className="route-chip"><span>RUTA OPTIMIZADA</span><strong>Lista para planear</strong></div></div></section>
    <section className="planner" id="planificador"><div className="planner-heading"><div><p className="eyebrow">CENTRO DE RUTAS</p><h2>Planifica un recorrido</h2><p>Agrega tus puntos y selecciona el tipo de vehículo.</p></div><div className="mode-switch"><button className={mode === 'delivery' ? 'selected' : ''} onClick={() => changeMode('delivery')}>↗ Reparto</button><button className={mode === 'truck' ? 'selected' : ''} onClick={() => changeMode('truck')}>▰ Camión</button></div></div>
      <div className="planner-grid"><div className="route-form"><div className="route-vehicle-selector"><label>Vehículo para este recorrido<select value={selectedVehicleProfileId} onChange={event => loadVehicleProfile(event.target.value)}><option value="">{mode === 'truck' ? 'Camión con medidas manuales' : 'Reparto sin vehículo guardado'}</option>{vehicleProfiles.map(profile => <option value={profile.id} key={profile.id}>{profile.name} · {profile.vehicle_type === 'truck' ? 'Camión' : 'Reparto'}</option>)}</select></label><a href="#mi-perfil">Administrar mis vehículos ↓</a>{vehicleProfileMessage && <p role="status">{vehicleProfileMessage}</p>}</div><LocationInput title="Origen" color="green" allowCurrentLocation mapReference={searchArea} value={origin} placeholder="Dirección, lugar, Plus Code o coordenadas" apiUrl={API_URL} selected={selectedOrigin} onChange={value => { setOrigin(value); setSelectedOrigin(null); setResult(null); }} onConfirm={location => { setSelectedOrigin(location); setSearchArea(location); setResult(null); }}/><ManifestImport apiUrl={API_URL} reference={selectedOrigin || searchArea} remaining={8 - stops.length} hasDestination={Boolean(destination.trim())} onImport={importDeliveries}/><div className="stops-head"><span>PARADAS INTERMEDIAS</span><button className="text-button" onClick={addStop} disabled={stops.length >= 8}>＋ Agregar parada</button></div><RouteStops stops={stops} apiUrl={API_URL} mapReference={selectedOrigin || searchArea} onChange={updateStop} onConfirm={(id, location) => { setStops(items => items.map(item => item.id === id ? { ...item, value: location.label, selected: location } : item)); setResult(null); }} onMove={reorderStop} onRemove={removeStop}/>{stopOrderMessage && <p className="stop-order-message" role="status">{stopOrderMessage}</p>}<label className="optimize-toggle"><input type="checkbox" checked={optimizeStops} onChange={e => { setOptimizeStops(e.target.checked); setStopOrderMessage(''); setResult(null); }} disabled={mode === 'truck' || stops.filter(stop => stop.value.trim()).length < 2}/><span><b>Optimizar orden de paradas</b><small>{mode === 'truck' ? 'En camiones conservamos el orden indicado y aplicamos las restricciones del vehículo.' : 'Reordena automáticamente las paradas para reducir el recorrido.'}</small></span></label><LocationInput title="Destino" color="orange" mapReference={selectedOrigin || searchArea} value={destination} placeholder="Dirección, lugar, Plus Code o coordenadas" apiUrl={API_URL} selected={selectedDestination} onChange={value => { setDestination(value); setSelectedDestination(null); setResult(null); }} onConfirm={location => { setSelectedDestination(location); setResult(null); }}/>
      {mode === 'truck' && <div className="vehicle-panel"><div className="vehicle-title"><strong>Medidas para este recorrido</strong><small>Medidas del vehículo cargado</small></div><div className="vehicle-fields"><label>Altura (m)<input type="number" min="0.5" max="10" step="0.1" value={vehicle.height} onChange={e => { setVehicle(v => ({...v,height:e.target.value})); setResult(null); }}/></label><label>Ancho (m)<input type="number" min="0.5" max="5" step="0.1" value={vehicle.width} onChange={e => { setVehicle(v => ({...v,width:e.target.value})); setResult(null); }}/></label><label>Largo (m)<input type="number" min="1" max="30" step="0.1" value={vehicle.length} onChange={e => { setVehicle(v => ({...v,length:e.target.value})); setResult(null); }}/></label><label>Peso bruto (t)<input type="number" min="0.1" max="100" step="0.1" value={vehicle.grossWeight} onChange={e => { setVehicle(v => ({...v,grossWeight:e.target.value})); setResult(null); }}/></label><label>Peso por eje (t)<input type="number" min="0.1" max="30" step="0.1" value={vehicle.axleWeight} onChange={e => { setVehicle(v => ({...v,axleWeight:e.target.value})); setResult(null); }}/></label></div><p className="hint">OpenRouteService considerará las restricciones disponibles en OpenStreetMap; la cobertura puede ser incompleta.</p></div>}
      <button className="primary-button" disabled={!canPlan} onClick={planRoute}>{loading ? 'Calculando ruta…' : 'Calcular ruta  →'}</button><NavigationLinks urls={mapsUrls} truck={mode === 'truck'} />
      {error && <div className="error-box"><strong>No se pudo calcular</strong><p>{error}</p>{providerStatus === 'missing' && <small>Falta configurar ORS_API_KEY como variable secreta en Vercel.</small>}</div>}
      </div><aside className="result-panel"><div className="result-top"><span>RESULTADO DEL RECORRIDO</span><span className="result-icon">⌁</span></div>{result ? <><div className="metrics"><div><small>DISTANCIA</small><strong>{formatDistance(result.distanceMeters)}</strong></div><div><small>TIEMPO ESTIMADO</small><strong>{formatDuration(result.durationSeconds)}</strong></div></div>{result.optimized && <p className="optimized-note">Orden de paradas optimizado automáticamente para reducir el recorrido.</p>}<RouteMap polyline={result.polyline} waypoints={result.waypoints || []}/><div className="route-line"><div className="route-point"><i className="dot green"/><span><b>Origen</b><small>{origin}</small></span></div>{(result.waypoints || []).filter(point => point.type === 'stop').map((point,i)=><div className="route-point" key={i}><i className="stop-number">{i+1}</i><span><b>Parada {i+1}</b><small>{point.label || (point.lat + ', ' + point.lng)}</small></span></div>)}<div className="route-point"><i className="dot orange"/><span><b>Destino</b><small>{destination}</small></span></div></div><div className="instructions"><strong>Indicaciones</strong>{result.sections.flatMap(section => section.actions || []).filter(action => action.instruction).slice(0, 12).map((action, index) => <p key={index}>{index + 1}. {action.instruction}</p>)}</div>{(result.notices || []).length > 0 && <div className="notice-box"><strong>Avisos de ruta</strong>{result.notices?.map((n,i)=><p key={i}>{n.title || n.details || n.code}</p>)}</div>}<button className="primary-button save-button" disabled={saving} onClick={saveRoute}>{saving ? 'Guardando…' : 'Guardar esta ruta'}</button>{saveMessage && <p className="save-message">{saveMessage}</p>}<RouteExports route={result} truck={mode === 'truck'} /><NavigationLinks urls={mapsUrls} truck={mode === 'truck'} /></> : <div className="empty-state"><div className="empty-route">⌁</div><strong>Tu ruta aparecerá aquí</strong><p>Completa origen y destino para obtener distancia, tiempo y avisos del recorrido.</p><div className="empty-stats"><span>— km <small>Distancia</small></span><span>— min <small>Duración</small></span></div></div>}</aside></div><p className="disclaimer">Las rutas para camiones dependen de los datos y restricciones disponibles en OpenStreetMap. Verifica señalización y normativa local antes de circular.</p>
    </section>
    <VehicleManager key={user?.id || 'guest-profile'} user={user} vehicles={vehicleProfiles} onSelect={loadVehicleProfile} onSaved={profile => { setVehicleProfiles(items => [profile, ...items.filter(item => item.id !== profile.id)]); loadVehicleProfile(profile.id, profile); }}/>
    <SavedRoutesPanel key={user?.id || 'guest-routes'} user={user} revision={routesRevision} onLoad={restoreSavedRoute}/>
    <section className="features" id="como-funciona"><div><p className="eyebrow">DISEÑADO PARA TRABAJAR</p><h2>Una herramienta para cada tipo de recorrido.</h2></div><article><span>01</span><h3>Reparto y mensajería</h3><p>Organiza origen, entregas y destino desde un solo lugar.</p></article><article><span>02</span><h3>Transporte pesado</h3><p>Considera dimensiones, peso bruto y peso por eje.</p></article><article><span>03</span><h3>Tu operación, después</h3><p>Guarda tus unidades y recorridos, e importa entregas desde tu manifiesto.</p></article></section>
    <footer><a className="brand" href="#inicio"><span className="brand-mark">R</span><span>ROUTE <b>PLANNER</b></span></a><span>Hecho para mover el trabajo.</span><span>Versión inicial · 2026</span></footer>
  </main></LocationBookProvider>;
}
