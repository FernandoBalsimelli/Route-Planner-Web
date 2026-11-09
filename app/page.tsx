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
import { persistRoute, routeSaveData } from '@/lib/route-save';
import AppIcon from '@/components/AppIcon';
import ThemeToggle from '@/components/ThemeToggle';
import TruckGuide from '@/components/TruckGuide';
import RouteNavigator from '@/components/RouteNavigator';

type Stop = RouteStop;
const API_URL = '/api/route-planner';
const RouteMap = dynamic(() => import('@/components/RouteMap'), { ssr: false, loading: () => <div className="route-map-loading">Cargando mapa…</div> });

function formatDistance(meters: number) { return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`; }
function formatDuration(seconds: number) { const mins = Math.round(seconds / 60); const hours = Math.floor(mins / 60); return hours ? `${hours} h ${mins % 60} min` : `${mins} min`; }

export default function Home() {
  const [workspace, setWorkspace] = useState<'planner' | 'saved' | 'vehicles' | 'guide'>('planner');
  useEffect(() => {
    const sync = () => {
      const target = window.location.hash;
      if (target === '#mi-perfil') setWorkspace('vehicles');
      else if (target === '#mis-rutas') setWorkspace('saved');
      else if (target === '#guia-camion') setWorkspace('guide');
      else if (['#planificador', '#mapa-planificacion', '#puntos-ruta'].includes(target)) setWorkspace('planner');
    };
    sync(); window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  function openWorkspace(next: typeof workspace) {
    setWorkspace(next);
    const target = { planner: 'planificador', saved: 'mis-rutas', vehicles: 'mi-perfil', guide: 'guia-camion' }[next];
    window.history.replaceState(null, '', `#${target}`);
    window.scrollTo?.({ top: 0, behavior: 'instant' });
  }
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
  const [navigationPosition, setNavigationPosition] = useState<{lat:number;lng:number}|null>(null);
  const [navigationFollow, setNavigationFollow] = useState(false);
  useEffect(()=>{setNavigationPosition(null);setNavigationFollow(false);},[result]);
  const [providerStatus, setProviderStatus] = useState<'unknown' | 'ready' | 'missing'>('unknown');
  const [user, setUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [routeName, setRouteName] = useState('');
  const saveIntent = useRef<{ signature: string; id: string } | null>(null);
  const [routesRevision, setRoutesRevision] = useState(0);
  const [vehicleProfiles, setVehicleProfiles] = useState<VehicleProfile[]>([]);
  const [selectedVehicleProfileId, setSelectedVehicleProfileId] = useState('');
  const [vehicleProfileMessage, setVehicleProfileMessage] = useState('');
  const [searchArea, setSearchArea] = useState<LocationSelection | null>(null);
  const planningRequest = useRef<AbortController | null>(null);
  const [mapSearch, setMapSearch] = useState<{ target: string; title: string; points: LocationSelection[] } | null>(null);
  useEffect(() => setMapSearch(null), [selectedOrigin, selectedDestination, stops]);
  const previewWaypoints = useMemo(() => [
    ...(selectedOrigin ? [{ ...selectedOrigin, type: 'origin' }] : []),
    ...stops.flatMap((stop, index) => stop.selected ? [{ ...stop.selected, type: 'stop', sequence: index + 1 }] : []),
    ...(selectedDestination ? [{ ...selectedDestination, type: 'destination' }] : []),
  ], [selectedOrigin, selectedDestination, stops]);
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

  function chooseMapCandidate(point: LocationSelection) {
    if (!mapSearch) return;
    if (mapSearch.target === 'origin') { setOrigin(point.label); setSelectedOrigin(point); setSearchArea(point); }
    else if (mapSearch.target === 'destination') { setDestination(point.label); setSelectedDestination(point); }
    else setStops(items => items.map(stop => stop.id === mapSearch.target ? { ...stop, value: point.label, selected: point } : stop));
    setResult(null); setMapSearch(null);
    document.querySelector<HTMLInputElement>(`input[aria-label="${mapSearch.title}"]`)?.focus();
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
    setRouteName(route.name);
    if (route.origin?.lat != null && route.origin?.lng != null) setSearchArea({ label: label(route.origin), lat: route.origin.lat, lng: route.origin.lng });
    setResult(route.route_metadata?.result || null);
    setOptimizeStops(Boolean(route.route_metadata?.result?.optimized));
    setError('');
    setSaveMessage(`Se cargó "${route.name}". Puedes continuar o volver a calcular la ruta.`);
    openWorkspace('planner');
  }

  async function planRoute() {
    if (!canPlan) return;
    planningRequest.current?.abort();
    const controller = new AbortController();
    planningRequest.current = controller;
    setLoading(true); setError(''); setResult(null); setMapSearch(null);
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
      document.getElementById('mapa-planificacion')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
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
      const data = routeSaveData(result, {
        name: routeName.trim() || `${mode === 'truck' ? 'Camión' : 'Reparto'} · ${new Date().toLocaleDateString('es-MX')}`,
        vehicleId: selectedVehicleProfileId || null,
        mode,
        vehicle: mode === 'truck' ? { heightM: Number(vehicle.height), widthM: Number(vehicle.width), lengthM: Number(vehicle.length), grossWeightT: Number(vehicle.grossWeight), axleWeightT: Number(vehicle.axleWeight) } : null,
      });
      const signature = JSON.stringify(data);
      if (!saveIntent.current || saveIntent.current.signature !== signature) saveIntent.current = { signature, id: crypto.randomUUID() };
      await persistRoute(supabase, data, saveIntent.current.id);
      setSaveMessage('Ruta guardada en tu cuenta.');
      setRoutesRevision(value => value + 1);
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'No se pudo guardar la ruta.');
    } finally { setSaving(false); }
  }

  const confirmedCount = previewWaypoints.length;
  return <LocationBookProvider key={user?.id || 'guest-book'} user={user}><main className="shell" id="inicio">
    <a className="skip-link" href="#puntos-ruta" onClick={() => setWorkspace('planner')}>Ir a los puntos de la ruta</a>
    <header className="topbar">
      <a className="brand" href="#planificador" onClick={() => setWorkspace('planner')} aria-label="Route Planner, inicio"><span className="brand-mark"><AppIcon name="route" size={25}/></span><span>Routes<small>ROUTE PLANNER</small></span></a>
      <span className="workspace-label">Tu día, en ruta.</span>
      <div className="topbar-actions"><ThemeToggle/><AccountPanel onUserChange={setUser}/></div>
    </header>
    <nav className="app-nav" aria-label="Secciones de Route Planner">
      {([['planner', 'plan', 'Planificar'], ['saved', 'saved', 'Mis rutas'], ['vehicles', 'truck', 'Vehículos'], ['guide', 'shield', 'Guía camión']] as const).map(([id, icon, title]) => <button type="button" key={id} aria-current={workspace === id ? 'page' : undefined} onClick={() => openWorkspace(id)}><AppIcon name={icon}/><span>{title}</span>{id === 'saved' && user && <i className="nav-dot"/>}</button>)}
    </nav>
    <section className="planner workspace" id="planificador" hidden={workspace !== 'planner'} aria-label="Planificador de rutas">
      <div className="planner-grid">
        <div className="route-form" id="puntos-ruta">
          <div className="planner-heading"><div><p className="eyebrow">TU RECORRIDO</p><h1>{result ? 'Ruta preparada' : 'Nueva ruta'}</h1></div><span className="point-count">{confirmedCount} puntos listos</span></div>
          <div className="mode-switch" aria-label="Tipo de recorrido"><button type="button" aria-pressed={mode === 'delivery'} className={mode === 'delivery' ? 'selected' : ''} onClick={() => changeMode('delivery')}><AppIcon name="plan" size={18}/>Reparto</button><button type="button" aria-pressed={mode === 'truck'} className={mode === 'truck' ? 'selected' : ''} onClick={() => changeMode('truck')}><AppIcon name="truck" size={18}/>Camión</button></div>
          <div className="route-vehicle-selector"><label>Vehículo para este recorrido<select value={selectedVehicleProfileId} onChange={event => loadVehicleProfile(event.target.value)}><option value="">{mode === 'truck' ? 'Camión · medidas manuales' : 'Seleccionar vehículo (opcional)'}</option>{vehicleProfiles.map(profile => <option value={profile.id} key={profile.id}>{profile.name} · {profile.vehicle_type === 'truck' ? 'Camión' : 'Reparto'}</option>)}</select></label><button type="button" className="text-button" onClick={() => openWorkspace('vehicles')}>Administrar mis vehículos <span aria-hidden="true">↗</span></button>{vehicleProfileMessage && <p role="status">{vehicleProfileMessage}</p>}</div>
          <div className="delivery-points">
            <LocationInput title="Origen" color="green" allowCurrentLocation onSuggestions={points => setMapSearch({ target: 'origin', title: 'Origen', points })} mapReference={searchArea} value={origin} placeholder="¿Dónde empieza tu recorrido?" apiUrl={API_URL} selected={selectedOrigin} onChange={value => { setOrigin(value); setSelectedOrigin(null); setResult(null); }} onConfirm={location => { setSelectedOrigin(location); setSearchArea(location); setResult(null); }}/>
            <div className="stops-head"><span>ENTREGAS <b>{stops.length}/8</b></span><button type="button" className="text-button" onClick={addStop} disabled={stops.length >= 8}>＋ Agregar parada</button></div>
            <ManifestImport apiUrl={API_URL} reference={selectedOrigin || searchArea} remaining={8 - stops.length} hasDestination={Boolean(destination.trim())} onImport={importDeliveries}/>
            <RouteStops onSuggestions={(id, title, points) => setMapSearch({ target: id, title, points })} stops={stops} apiUrl={API_URL} mapReference={selectedOrigin || searchArea} onChange={updateStop} onConfirm={(id, location) => { setStops(items => items.map(item => item.id === id ? { ...item, value: location.label, selected: location } : item)); setResult(null); }} onMove={reorderStop} onRemove={removeStop}/>
            {stopOrderMessage && <p className="stop-order-message" role="status">{stopOrderMessage}</p>}
            <LocationInput onSuggestions={points => setMapSearch({ target: 'destination', title: 'Destino', points })} title="Destino" color="orange" mapReference={selectedOrigin || searchArea} value={destination} placeholder="¿Dónde termina tu recorrido?" apiUrl={API_URL} selected={selectedDestination} onChange={value => { setDestination(value); setSelectedDestination(null); setResult(null); }} onConfirm={location => { setSelectedDestination(location); setResult(null); }}/>
          </div>
          <label className="optimize-toggle"><input type="checkbox" checked={optimizeStops} onChange={e => { setOptimizeStops(e.target.checked); setStopOrderMessage(''); setResult(null); }} disabled={mode === 'truck' || stops.filter(stop => stop.value.trim()).length < 2}/><span><b>Optimizar orden de paradas</b><small>{mode === 'truck' ? 'Camión: se conserva el orden y se envían tus medidas al proveedor.' : 'Con dos o más entregas, busca el orden con menor tiempo de viaje.'}</small></span></label>
          {mode === 'truck' && <details className="vehicle-panel" open><summary><AppIcon name="truck" size={18}/><span>Medidas del camión cargado</span></summary><div className="vehicle-fields">{([['height','Altura (m)','0.5','10'],['width','Ancho (m)','0.5','5'],['length','Largo (m)','1','30'],['grossWeight','Peso bruto (t)','0.1','100'],['axleWeight','Peso por eje (t)','0.1','30']] as const).map(([key,title,min,max]) => <label key={key}>{title}<input type="number" min={min} max={max} step="0.1" value={vehicle[key]} onChange={event => { setVehicle(values => ({...values,[key]:event.target.value})); setResult(null); }}/></label>)}</div><p className="hint">Los valores iniciales son un ejemplo. Usa los de tu unidad.</p><button type="button" className="text-button" onClick={() => openWorkspace('guide')}>Qué restricciones considera esta ruta ↗</button></details>}
          <div className="plan-actions"><button type="button" className="primary-button" disabled={!canPlan} onClick={planRoute}>{loading ? 'Calculando ruta…' : 'Calcular ruta'}<AppIcon name="arrow"/></button>{!user && <small>Inicia sesión para calcular y guardar tus recorridos.</small>}</div>
          {error && <div className="error-box" role="alert"><strong>No se pudo calcular</strong><p>{error}</p>{providerStatus === 'missing' && <small>El servicio de rutas requiere configuración del administrador.</small>}</div>}
          {!result && <NavigationLinks urls={mapsUrls} truck={mode === 'truck'}/>}
        </div>
        <aside id="mapa-planificacion" className={`result-panel ${result ? 'has-result' : 'is-planning'}`} aria-label="Mapa y resultado de la ruta">
          <div className="map-card">
            <div className="result-top"><div><span className="live-dot"/><strong>{result ? 'Tu recorrido' : mapSearch?.points.length ? `Sucursales · ${mapSearch.title.toLowerCase()}` : 'Explora tu recorrido'}</strong></div><a href="#puntos-ruta">Ver entregas <AppIcon name="arrow" size={16}/></a></div>
            {result ? <><div className="metrics"><div><small>Distancia</small><strong>{formatDistance(result.distanceMeters)}</strong></div><div><small>Tiempo estimado</small><strong>{formatDuration(result.durationSeconds)}</strong></div><span className="route-ready"><AppIcon name="check" size={16}/>Calculada</span></div><RouteMap polyline={result.polyline} waypoints={result.waypoints || []} livePosition={navigationPosition} followPosition={navigationFollow}/></> : <RouteMap planning waypoints={previewWaypoints} reference={selectedOrigin || searchArea} candidates={mapSearch?.points} targetTitle={mapSearch?.title} onChooseCandidate={chooseMapCandidate}/>}
            <div className="map-caption"><span><i className="legend-dot origin"/>Origen</span><span><i className="legend-dot stop"/>Entregas</span><span><i className="legend-dot destination"/>Destino</span>{Boolean(mapSearch?.points.length) && <span><i className="legend-dot candidate"/>S: sugerencias</span>}</div>
          </div>
          {!result && <div className="map-help"><span className="help-icon"><AppIcon name="plan"/></span><div><strong>{mapSearch?.points.length ? `${mapSearch.points.length} coincidencias en el mapa` : 'Encuentra la sucursal correcta'}</strong><p>{mapSearch?.points.length ? 'S1, S2… siguen el orden del buscador. Toca el marcador y confirma la sucursal.' : 'Empieza con tu ubicación o un origen. Después busca «Bodega Aurrera Express» para priorizar coincidencias cercanas.'}</p></div></div>}
          {mode === 'truck' && <button type="button" className="truck-coverage" onClick={() => openWorkspace('guide')}><AppIcon name="shield"/><span><b>Restricciones cartográficas</b><small>Revisa la cobertura y la normativa antes de salir.</small></span><span aria-hidden="true">↗</span></button>}
          {result && <div className="result-details">
            {result.optimized && <p className="optimized-note"><AppIcon name="check" size={16}/>Orden de entregas optimizado por tiempo de viaje.</p>}
            <RouteNavigator key={user?.id || 'anonymous'} active={workspace === 'planner'} route={result} truck={mode === 'truck'} onPosition={setNavigationPosition} onFollow={setNavigationFollow}/><h2>Detalle del recorrido</h2><div className="route-line">{(result.waypoints || []).map((point,index) => <div className="route-point" key={index}><i className={point.type === 'origin' ? 'dot green' : point.type === 'destination' ? 'dot orange' : 'stop-number'}>{point.type === 'stop' ? index : ''}</i><span><b>{point.type === 'origin' ? 'Origen' : point.type === 'destination' ? 'Destino' : `Entrega ${index}`}</b><small>{point.label || `${point.lat}, ${point.lng}`}</small></span></div>)}</div>
            <details className="instructions"><summary>Indicaciones de conducción</summary>{result.sections.flatMap(section => section.actions || []).filter(action => action.instruction).slice(0, 12).map((action, index) => <p key={index}>{index + 1}. {action.instruction}</p>)}</details>
            {(result.notices || []).length > 0 && <div className="notice-box"><strong>Avisos de ruta</strong>{result.notices?.map((notice,index) => <p key={index}>{notice.title || notice.details || notice.code}</p>)}</div>}
            <div className="save-route-area"><label className="route-save-name">Nombre del recorrido<input maxLength={120} value={routeName} onChange={event => setRouteName(event.target.value)} placeholder="Ej. Express · entregas de la mañana"/></label><button type="button" className="primary-button save-button" disabled={saving} onClick={saveRoute}><AppIcon name="saved"/>{saving ? 'Guardando…' : 'Guardar esta ruta'}</button>{saveMessage && <p className="save-message" role="status">{saveMessage}</p>}</div>
            <NavigationLinks urls={mapsUrls} truck={mode === 'truck'}/><RouteExports route={result} truck={mode === 'truck'}/>
          </div>}
        </aside>
      </div>
    </section>
    <div className="workspace account-workspace" hidden={workspace !== 'vehicles'}><VehicleManager key={`profile-${user?.id || 'guest'}`} user={user} vehicles={vehicleProfiles} onSelect={id => { loadVehicleProfile(id); openWorkspace('planner'); }} onSaved={profile => { setVehicleProfiles(items => [profile, ...items.filter(item => item.id !== profile.id)]); loadVehicleProfile(profile.id, profile); }}/></div>
    <div className="workspace account-workspace" id="mis-rutas" hidden={workspace !== 'saved'}><SavedRoutesPanel key={`routes-${user?.id || 'guest'}`} user={user} revision={routesRevision} onLoad={restoreSavedRoute}/></div>
    <div className="workspace guide-workspace" id="guia-camion" hidden={workspace !== 'guide'}><TruckGuide/></div>
  </main></LocationBookProvider>;
}
