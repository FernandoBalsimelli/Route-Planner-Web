'use client';

import { useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import AccountPanel from '@/components/AccountPanel';
import { supabase } from '@/lib/supabase';

type Stop = { id: string; value: string };
type RouteResult = { distanceMeters: number; durationSeconds: number; polyline?: string; sections: Array<{ summary?: { length?: number; duration?: number }; actions?: Array<{ instruction?: string; action?: string }> }>; notices?: Array<{ title?: string; code?: string; severity?: string; details?: string }>; waypoints?: Array<{ lat: number; lng: number; label?: string; type: string }> };
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://route-planner-api-fernandobalsimellis-projects.vercel.app';

function formatDistance(meters: number) { return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`; }
function formatDuration(seconds: number) { const mins = Math.round(seconds / 60); const hours = Math.floor(mins / 60); return hours ? `${hours} h ${mins % 60} min` : `${mins} min`; }

export default function Home() {
  const [mode, setMode] = useState<'delivery' | 'truck'>('delivery');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [stops, setStops] = useState<Stop[]>([]);
  const [vehicle, setVehicle] = useState({ height: '4.0', width: '2.5', length: '18', grossWeight: '40', axleWeight: '10' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<RouteResult | null>(null);
  const [providerStatus, setProviderStatus] = useState<'unknown' | 'ready' | 'missing'>('unknown');
  const [user, setUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const canPlan = origin.trim().length > 2 && destination.trim().length > 2 && !loading;
  const mapsUrl = useMemo(() => {
    const points = [origin, ...stops.map(s => s.value), destination].filter(Boolean);
    if (points.length < 2) return '';
    return 'https://www.google.com/maps/dir/' + points.map(encodeURIComponent).join('/');
  }, [origin, destination, stops]);

  function addStop() { setStops(items => [...items, { id: crypto.randomUUID(), value: '' }]); }
  function updateStop(id: string, value: string) { setStops(items => items.map(s => s.id === id ? { ...s, value } : s)); }
  function removeStop(id: string) { setStops(items => items.filter(s => s.id !== id)); }

  async function planRoute() {
    if (!canPlan) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const { data: sessionData } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
      if (!sessionData.session) throw new Error('Inicia sesión para calcular una ruta.');
      const response = await fetch(`${API_URL}/v1/routes/plan`, {
        method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${sessionData.session.access_token}` },
        body: JSON.stringify({ origin: origin.trim(), destination: destination.trim(), stops: stops.map(s => s.value.trim()).filter(Boolean), mode, vehicle: mode === 'truck' ? { heightM: Number(vehicle.height), widthM: Number(vehicle.width), lengthM: Number(vehicle.length), grossWeightT: Number(vehicle.grossWeight), axleWeightT: Number(vehicle.axleWeight) } : undefined }),
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
        name: `Ruta ${new Date().toLocaleDateString('es-MX')}`,
        provider: 'openrouteservice',
        origin: result.waypoints?.[0] ?? { label: origin },
        destination: result.waypoints?.[result.waypoints.length - 1] ?? { label: destination },
        status: 'planned',
      }).select('id').single();
      if (error) throw error;
      const stopRows = stops.map(s => s.value.trim()).filter(Boolean).map((label, index) => ({
        route_id: saved.id, owner_id: user.id, sequence: index + 1, location: { label },
      }));
      if (stopRows.length) {
        const { error: stopError } = await supabase.from('route_stops').insert(stopRows);
        if (stopError) throw stopError;
      }
      setSaveMessage('Ruta guardada en tu cuenta.');
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'No se pudo guardar la ruta.');
    } finally { setSaving(false); }
  }

  return <main className="shell">
    <header className="topbar"><a className="brand" href="#inicio"><span className="brand-mark">R</span><span>ROUTE <b>PLANNER</b></span></a><nav><a href="#planificador">Planificador</a><a href="#como-funciona">Cómo funciona</a></nav><AccountPanel onUserChange={setUser} /><span className="status"><i /> Beta · staging</span></header>
    <section className="hero" id="inicio"><div className="hero-copy"><p className="eyebrow">PLANIFICACIÓN INTELIGENTE DE RUTAS</p><h1>Tu ruta, <em>mejor pensada.</em></h1><p className="lead">Planifica recorridos de reparto y transporte pesado con paradas, perfiles de vehículo y cálculo de rutas OpenRouteService.</p><div className="hero-tags"><span>01 · Reparto</span><span>02 · Camiones</span><span>03 · Mult parada</span></div></div><div className="hero-art" aria-hidden="true"><div className="map-grid"/><svg viewBox="0 0 460 300" role="img"><path d="M30 230 C95 190 94 110 175 132 S265 255 325 178 S380 65 435 55" fill="none" stroke="#b8d8c9" strokeWidth="18" strokeLinecap="round"/><path d="M30 230 C95 190 94 110 175 132 S265 255 325 178 S380 65 435 55" fill="none" stroke="#0f3d31" strokeWidth="4" strokeDasharray="7 9" strokeLinecap="round"/><circle cx="30" cy="230" r="12" fill="#f2b35f" stroke="#fff" strokeWidth="5"/><circle cx="175" cy="132" r="12" fill="#f2b35f" stroke="#fff" strokeWidth="5"/><circle cx="325" cy="178" r="12" fill="#f2b35f" stroke="#fff" strokeWidth="5"/><circle cx="435" cy="55" r="12" fill="#0f3d31" stroke="#fff" strokeWidth="5"/></svg><div className="route-chip"><span>RUTA OPTIMIZADA</span><strong>Lista para planear</strong></div></div></section>
    <section className="planner" id="planificador"><div className="planner-heading"><div><p className="eyebrow">CENTRO DE RUTAS</p><h2>Planifica un recorrido</h2><p>Agrega tus puntos y selecciona el tipo de vehículo.</p></div><div className="mode-switch"><button className={mode === 'delivery' ? 'selected' : ''} onClick={() => setMode('delivery')}>↗ Reparto</button><button className={mode === 'truck' ? 'selected' : ''} onClick={() => setMode('truck')}>▰ Camión</button></div></div>
      <div className="planner-grid"><div className="route-form"><label className="field"><span><i className="dot green"/> ORIGEN</span><input value={origin} onChange={e => setOrigin(e.target.value)} placeholder="Dirección, ciudad o coordenadas" /></label><div className="stops-head"><span>PARADAS INTERMEDIAS</span><button className="text-button" onClick={addStop}>＋ Agregar parada</button></div>{stops.map((stop, index) => <label className="field stop-field" key={stop.id}><span><i className="stop-number">{index + 1}</i> PARADA {index + 1}</span><div className="input-with-action"><input value={stop.value} onChange={e => updateStop(stop.id, e.target.value)} placeholder="Dirección de la parada"/><button aria-label="Eliminar parada" onClick={() => removeStop(stop.id)}>×</button></div></label>)}<label className="field"><span><i className="dot orange"/> DESTINO</span><input value={destination} onChange={e => setDestination(e.target.value)} placeholder="Dirección o destino final" /></label>
      {mode === 'truck' && <div className="vehicle-panel"><div className="vehicle-title"><strong>Perfil del camión</strong><small>Medidas del vehículo cargado</small></div><div className="vehicle-fields"><label>Altura (m)<input type="number" min="0.5" max="10" step="0.1" value={vehicle.height} onChange={e => setVehicle(v => ({...v,height:e.target.value}))}/></label><label>Ancho (m)<input type="number" min="0.5" max="5" step="0.1" value={vehicle.width} onChange={e => setVehicle(v => ({...v,width:e.target.value}))}/></label><label>Largo (m)<input type="number" min="1" max="30" step="0.1" value={vehicle.length} onChange={e => setVehicle(v => ({...v,length:e.target.value}))}/></label><label>Peso bruto (t)<input type="number" min="0.1" max="100" step="0.1" value={vehicle.grossWeight} onChange={e => setVehicle(v => ({...v,grossWeight:e.target.value}))}/></label><label>Peso por eje (t)<input type="number" min="0.1" max="30" step="0.1" value={vehicle.axleWeight} onChange={e => setVehicle(v => ({...v,axleWeight:e.target.value}))}/></label></div><p className="hint">OpenRouteService considerará las restricciones disponibles en OpenStreetMap; la cobertura puede ser incompleta.</p></div>}
      <button className="primary-button" disabled={!canPlan} onClick={planRoute}>{loading ? 'Calculando ruta…' : 'Calcular ruta  →'}</button>{mapsUrl && <a className="secondary-button" href={mapsUrl} target="_blank" rel="noreferrer">Abrir puntos en Google Maps ↗</a>}
      {error && <div className="error-box"><strong>No se pudo calcular</strong><p>{error}</p>{providerStatus === 'missing' && <small>Falta configurar ORS_API_KEY como variable secreta en Vercel.</small>}</div>}
      </div><aside className="result-panel"><div className="result-top"><span>RESULTADO DEL RECORRIDO</span><span className="result-icon">⌁</span></div>{result ? <><div className="metrics"><div><small>DISTANCIA</small><strong>{formatDistance(result.distanceMeters)}</strong></div><div><small>TIEMPO ESTIMADO</small><strong>{formatDuration(result.durationSeconds)}</strong></div></div><div className="route-line"><div className="route-point"><i className="dot green"/><span><b>Origen</b><small>{origin}</small></span></div>{stops.filter(s => s.value).map((s,i)=><div className="route-point" key={s.id}><i className="stop-number">{i+1}</i><span><b>Parada {i+1}</b><small>{s.value}</small></span></div>)}<div className="route-point"><i className="dot orange"/><span><b>Destino</b><small>{destination}</small></span></div></div><div className="instructions"><strong>Indicaciones</strong>{result.sections.flatMap(section => section.actions || []).filter(action => action.instruction).slice(0, 12).map((action, index) => <p key={index}>{index + 1}. {action.instruction}</p>)}</div>{(result.notices || []).length > 0 && <div className="notice-box"><strong>Avisos de ruta</strong>{result.notices?.map((n,i)=><p key={i}>{n.title || n.details || n.code}</p>)}</div>}<button className="primary-button save-button" disabled={saving} onClick={saveRoute}>{saving ? 'Guardando…' : 'Guardar esta ruta'}</button>{saveMessage && <p className="save-message">{saveMessage}</p>}<a className="secondary-button" href={mapsUrl} target="_blank" rel="noreferrer">Abrir navegación ↗</a></> : <div className="empty-state"><div className="empty-route">⌁</div><strong>Tu ruta aparecerá aquí</strong><p>Completa origen y destino para obtener distancia, tiempo y avisos del recorrido.</p><div className="empty-stats"><span>— km <small>Distancia</small></span><span>— min <small>Duración</small></span></div></div>}</aside></div><p className="disclaimer">Las rutas para camiones dependen de los datos y restricciones disponibles en OpenStreetMap. Verifica señalización y normativa local antes de circular.</p>
    </section>
    <section className="features" id="como-funciona"><div><p className="eyebrow">DISEÑADO PARA TRABAJAR</p><h2>Una herramienta para cada tipo de recorrido.</h2></div><article><span>01</span><h3>Reparto y mensajería</h3><p>Organiza origen, entregas y destino desde un solo lugar.</p></article><article><span>02</span><h3>Transporte pesado</h3><p>Considera dimensiones, peso bruto y peso por eje.</p></article><article><span>03</span><h3>Tu operación, después</h3><p>La base está preparada para perfiles, vehículos, rutas guardadas y flotas.</p></article></section>
    <footer><a className="brand" href="#inicio"><span className="brand-mark">R</span><span>ROUTE <b>PLANNER</b></span></a><span>Hecho para mover el trabajo.</span><span>Versión inicial · 2026</span></footer>
  </main>;
}
