'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { dimensionFields, VEHICLE_COLUMNS, vehicleValues, type VehicleProfile } from '@/lib/vehicles';

export default function VehicleManager({ user, vehicles, onSaved, onSelect }: { user: User | null; vehicles: VehicleProfile[]; onSaved: (vehicle: VehicleProfile) => void; onSelect: (id: string) => void }) {
  const [displayName, setDisplayName] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<VehicleProfile['vehicle_type']>('delivery');
  const [dimensions, setDimensions] = useState<Record<string, string>>({});
  const [fleetId, setFleetId] = useState('');
  const [fleets, setFleets] = useState<Array<{ id: string; name: string }>>([]);
  const [newFleet, setNewFleet] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const currentUser = useRef(user?.id);
  currentUser.current = user?.id;
  useEffect(() => {
    let active = true;
    setEditing(null); setMessage(''); setDisplayName(''); setFleets([]);
    if (user && supabase) void supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle().then(({ data, error }) => {
      if (!active) return;
      if (error) setMessage('No se pudo cargar tu perfil: ' + error.message);
      else setDisplayName(data?.display_name || '');
    });
    if (user && supabase) void supabase.from('fleets').select('id,name').eq('owner_id', user.id).order('created_at', { ascending: false }).then(({ data, error }) => {
      if (active && !error) setFleets(data || []);
    });
    return () => { active = false; };
  }, [user?.id]);
  function edit(vehicle?: VehicleProfile) {
    setEditing(vehicle?.id || 'new'); setName(vehicle?.name || ''); setType(vehicle?.vehicle_type || 'delivery'); setFleetId(vehicle?.fleet_id || ''); setMessage('');
    setDimensions(Object.fromEntries(dimensionFields.map(field => [field.key, vehicle?.[field.key] != null ? String(vehicle[field.key]) : ''])));
  }
  async function saveProfile() {
    if (!user || !supabase || busy) return;
    const ownerId = user.id;
    setBusy(true); setMessage('');
    try {
      const { error } = await supabase.from('profiles').upsert({ id: ownerId, display_name: displayName.trim().slice(0, 120) }, { onConflict: 'id' });
      if (error) throw new Error(error.message);
      if (currentUser.current === ownerId) setMessage('Perfil actualizado.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo guardar el perfil.'); }
    finally { setBusy(false); }
  }
  async function saveVehicle(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !supabase || busy) return;
    const ownerId = user.id;
    setBusy(true); setMessage('');
    try {
      const values = vehicleValues(name, type, dimensions, fleetId);
      const query = editing === 'new' ? supabase.from('vehicles').insert({ ...values, owner_id: ownerId }) : supabase.from('vehicles').update(values).eq('id', editing!).eq('owner_id', ownerId);
      const { data, error } = await query.select(VEHICLE_COLUMNS).single();
      if (error) throw new Error(error.message);
      if (currentUser.current !== ownerId) return;
      onSaved(data as VehicleProfile); setEditing(null); setMessage('Vehículo guardado y seleccionado para el recorrido.');
    } catch (error) { if (currentUser.current === ownerId) setMessage(error instanceof Error ? error.message : 'No se pudo guardar el vehículo.'); }
    finally { setBusy(false); }
  }
  async function addFleet() {
    if (!user || !supabase || busy || !newFleet.trim()) return;
    const ownerId = user.id;
    setBusy(true);
    try {
      const { data, error } = await supabase.from('fleets').insert({ owner_id: ownerId, name: newFleet.trim().slice(0, 120) }).select('id,name').single();
      if (error) throw new Error(error.message);
      if (currentUser.current !== ownerId) return;
      setFleets(items => [...items, data]); setFleetId(data.id); setNewFleet(''); setMessage('Flota creada.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo crear la flota.'); }
    finally { setBusy(false); }
  }
  return <section className="saved-routes vehicle-account" id="mi-perfil" aria-labelledby="profile-title">
    <p className="eyebrow">TU CUENTA</p><h2 id="profile-title">Mi perfil y vehículos</h2>
    {!user ? <p>Inicia sesión para guardar tus vehículos y usarlos en cualquier recorrido.</p> : <>
      <details className="profile-details"><summary>Datos de mi perfil</summary><label>Nombre<input value={displayName} maxLength={120} onChange={event => setDisplayName(event.target.value)}/></label><button type="button" disabled={busy} onClick={() => void saveProfile()}>Guardar nombre</button></details>
      <div className="vehicles-header"><p>Guarda cada unidad una vez. Selecciónala al planear tu ruta.</p><button type="button" disabled={busy} onClick={() => edit()}>＋ Agregar vehículo</button></div>
      <div className="saved-routes-list">{vehicles.map(vehicle => <article className="saved-route-card" key={vehicle.id}><div><strong>{vehicle.name}</strong><small>{vehicle.vehicle_type === 'truck' ? `Camión · ${vehicle.height_m ?? '—'} m de altura · ${vehicle.gross_weight_t ?? '—'} t` : vehicle.vehicle_type === 'car' ? 'Automóvil' : 'Unidad de reparto'}</small></div><div className="route-card-actions"><button type="button" onClick={() => { onSelect(vehicle.id); document.getElementById('planificador')?.scrollIntoView({ behavior: 'smooth' }); }}>Usar en ruta</button><button type="button" disabled={busy} aria-label={`Editar ${vehicle.name}`} onClick={() => edit(vehicle)}>Editar</button></div></article>)}</div>
      {!vehicles.length && !editing && <p className="saved-routes-note">Agrega tu primera unidad, por ejemplo «Unidad 12 · ABC-123».</p>}
      {editing && <form className="vehicle-editor" onSubmit={saveVehicle}>
        <h3>{editing === 'new' ? 'Nuevo vehículo' : 'Editar vehículo'}</h3>
        <label>Nombre o número de unidad<input required maxLength={120} value={name} onChange={event => setName(event.target.value)} placeholder="Unidad 12 · ABC-123"/></label>
        <label>Tipo de vehículo<select value={type} onChange={event => setType(event.target.value as VehicleProfile['vehicle_type'])}><option value="delivery">Unidad de reparto</option><option value="car">Automóvil</option><option value="truck">Camión de carga</option></select></label>
        <details className="profile-details"><summary>Flota (opcional)</summary><label>Flota del vehículo<select value={fleetId} onChange={event => setFleetId(event.target.value)}><option value="">Sin flota</option>{fleets.map(fleet => <option key={fleet.id} value={fleet.id}>{fleet.name}</option>)}</select></label><label>Nueva flota<input maxLength={120} value={newFleet} onChange={event => setNewFleet(event.target.value)}/></label><button type="button" disabled={busy || !newFleet.trim()} onClick={() => void addFleet()}>Crear flota</button></details>
        {type === 'truck' && <><div className="vehicle-fields">{dimensionFields.map(field => <label key={field.key}>{field.title}<input type="number" required min="0.01" max={field.max} step="any" value={dimensions[field.key] || ''} onChange={event => setDimensions(values => ({ ...values, [field.key]: event.target.value }))}/></label>)}</div><p className="hint">Usa las medidas y el peso de la unidad cargada. El cálculo considera las restricciones cartográficas disponibles; la cobertura puede ser incompleta.</p></>}
        <div className="route-card-actions"><button type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar y usar vehículo'}</button><button type="button" disabled={busy} onClick={() => setEditing(null)}>Cancelar</button></div>
      </form>}
      {message && <p role="status" className="vehicle-profile-message">{message}</p>}
    </>}
  </section>;
}
