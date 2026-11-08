'use client';

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { locateDevice } from '@/lib/geolocation';
import { resolvePointLabel, type Coordinates, type LocationSelection } from '@/lib/locations';

export type { LocationSelection } from '@/lib/locations';
const MapLocationPicker = dynamic(() => import('./MapLocationPicker'), { ssr: false, loading: () => <p role="status">Cargando mapa…</p> });

function locationKind(kind?: string) {
  return kind ? ({ locality: 'Ciudad o localidad', address: 'Dirección', venue: 'Lugar', street: 'Calle', neighbourhood: 'Colonia', borough: 'Distrito' } as Record<string, string>)[kind] : undefined;
}

type Props = {
  title: string;
  color: 'green' | 'orange' | 'number';
  value: string;
  placeholder: string;
  apiUrl: string;
  selected?: LocationSelection | null;
  allowCurrentLocation?: boolean;
  mapReference?: Coordinates | null;
  onChange: (value: string) => void;
  onConfirm: (location: LocationSelection) => void;
};

export default function LocationInput({ title, color, value, placeholder, apiUrl, selected, allowCurrentLocation = false, mapReference, onChange, onConfirm }: Props) {
  const [suggestions, setSuggestions] = useState<LocationSelection[]>([]);
  const [pending, setPending] = useState<LocationSelection | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [geoStatus, setGeoStatus] = useState('');
  const [geoBusy, setGeoBusy] = useState(false);
  const geoRequest = useRef(0);
  const reverseController = useRef<AbortController | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [mapSeed, setMapSeed] = useState<Coordinates | null>(null);
  const mapButton = useRef<HTMLButtonElement | null>(null);

  function closeMap() { setMapOpen(false); mapButton.current?.focus(); }

  useEffect(() => () => { geoRequest.current++; reverseController.current?.abort(); }, []);

  function cancelLocation() {
    geoRequest.current++;
    reverseController.current?.abort();
    setGeoBusy(false);
    setGeoStatus('');
  }

  async function useCurrentLocation() {
    cancelLocation();
    setMapOpen(false);
    if (!window.isSecureContext || !navigator.geolocation) {
      setGeoStatus('La ubicación requiere HTTPS y un navegador compatible. Puedes escribir el origen manualmente.');
      return;
    }
    const requestId = ++geoRequest.current;
    setGeoBusy(true);
    setGeoStatus('Obteniendo tu ubicación…');
    try {
      const point = await locateDevice(navigator.geolocation);
      if (geoRequest.current !== requestId) return;
      setGeoStatus('Buscando la dirección de tu ubicación…');
      const controller = new AbortController();
      reverseController.current = controller;
      const timer = setTimeout(() => controller.abort(), 12000);
      const { location: resolved, addressFound } = await resolvePointLabel(point, apiUrl, controller.signal);
      clearTimeout(timer);
      if (geoRequest.current !== requestId) return;
      const location = { ...resolved, label: addressFound ? resolved.label : `Mi ubicación (${point.lat.toFixed(6)}, ${point.lng.toFixed(6)})`, accuracyM: point.accuracyM, source: 'geolocation' };
      onChange(location.label);
      onConfirm(location);
      setGeoStatus(addressFound ? 'Ubicación actual establecida como origen.' : 'Origen establecido con coordenadas. No se pudo obtener la dirección legible.');
    } catch (error) {
      if (geoRequest.current === requestId) setGeoStatus(error instanceof Error ? error.message : 'No se pudo obtener tu ubicación.');
    } finally {
      if (geoRequest.current === requestId) setGeoBusy(false);
    }
  }

  useEffect(() => {
    if (mapOpen) { setSuggestions([]); setPending(null); setLoading(false); return; }
    if (selected && selected.label === value) {
      setSuggestions([]);
      setPending(null);
      setSearchError('');
      setLoading(false);
      return;
    }
    if (value.trim().length < 2) {
      setSuggestions([]);
      setPending(null);
      setSearchError('');
      setLoading(false);
      return;
    }
    setSuggestions([]);
    setPending(null);
    setSearchError('');
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setSearchError('');
      try {
        const response = await fetch(`${apiUrl}/v1/locations/suggest?q=${encodeURIComponent(value.trim())}`, { signal: controller.signal });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || 'No se pudieron cargar las sugerencias.');
        setSuggestions(Array.isArray(payload.suggestions) ? payload.suggestions : []);
      } catch (error) {
        if (controller.signal.aborted) return;
        setSuggestions([]);
        setSearchError(error instanceof Error ? error.message : 'No se pudieron cargar las sugerencias.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 320);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, apiUrl, selected, mapOpen]);

  function confirmPending() {
    if (!pending) return;
    cancelLocation();
    onChange(pending.label);
    onConfirm(pending);
    setPending(null);
    setSuggestions([]);
    setSearchError('');
  }

  return <div className="location-field">
    <label className="field">
      <span><i className={color === 'number' ? 'stop-number' : `dot ${color}`}>{color === 'number' ? title.replace('PARADA ', '') : ''}</i> {color === 'number' ? title : title.toUpperCase()}</span>
      <input
        value={value}
        onChange={event => { cancelLocation(); setMapOpen(false); onChange(event.target.value); setPending(null); }}
        placeholder={placeholder}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={suggestions.length > 0}
      />
    </label>
    <button type="button" ref={mapButton} className="map-open-button" aria-label={`Elegir ${title.toLowerCase()} en el mapa`} aria-expanded={mapOpen} onClick={() => {
      if (mapOpen) { closeMap(); return; }
      cancelLocation();
      setMapSeed(selected || pending || suggestions[0] || mapReference || null);
      setMapOpen(true);
    }}>⌖ {mapOpen ? 'Cerrar mapa' : 'Elegir en el mapa'}</button>
    {mapOpen && <MapLocationPicker title={title} initialPoint={mapSeed} apiUrl={apiUrl} onClose={closeMap} onConfirm={location => {
      onChange(location.label); onConfirm(location); setPending(null); setSearchError(''); closeMap();
    }} />}
    {allowCurrentLocation && <div className="current-location-tools">
      <button type="button" className="current-location-button" disabled={geoBusy} onClick={() => void useCurrentLocation()}><span aria-hidden="true">⌖</span> {geoBusy ? 'Localizando…' : 'Usar mi ubicación actual'}</button>
      {geoBusy && <button type="button" className="text-button" onClick={cancelLocation}>Cancelar</button>}
      {geoStatus && <p className="location-search-status" role="status" aria-live="polite">{geoStatus}</p>}
    </div>}
    {loading && <p className="location-search-status">Buscando direcciones y lugares…</p>}
    {suggestions.length > 0 && !pending && <div className="location-suggestions" role="listbox" aria-label={`Sugerencias para ${title}`}>
      {suggestions.map((suggestion, index) => <button
        type="button"
        className="location-suggestion"
        key={`${suggestion.lat}-${suggestion.lng}-${index}`}
        onClick={() => setPending(suggestion)}
      >
        <span className="suggestion-pin">⌖</span>
        <span className="suggestion-copy"><strong>{suggestion.label}</strong><small>{locationKind(suggestion.kind) && `${locationKind(suggestion.kind)} · `}{suggestion.plusCode || `${suggestion.lat.toFixed(6)}, ${suggestion.lng.toFixed(6)}`}</small></span>
        <span className="suggestion-arrow">›</span>
      </button>)}
    </div>}
    {searchError && <p className="location-search-error">{searchError} Puedes continuar escribiendo una dirección completa.</p>}
    {pending && <div className="location-confirm-card">
      <div><strong>¿Es este el punto correcto?</strong><p>{pending.label}</p><small>{locationKind(pending.kind) && `${locationKind(pending.kind)} · `}{pending.plusCode || `${pending.lat.toFixed(6)}, ${pending.lng.toFixed(6)}`}</small></div>
      <a href={`https://www.google.com/maps/search/?api=1&query=${pending.lat},${pending.lng}`} target="_blank" rel="noreferrer">Ver mapa ↗</a>
      <div className="location-confirm-actions"><button type="button" onClick={() => setPending(null)}>Elegir otro</button><button type="button" onClick={confirmPending}>Confirmar punto</button></div>
    </div>}
    {selected && selected.label === value && !pending && <p className="location-confirmed"><span>✓ Punto confirmado</span><small>{selected.plusCode || `${selected.lat.toFixed(6)}, ${selected.lng.toFixed(6)}`}</small></p>}
    {selected?.source === 'geolocation' && selected.label === value && <p className="location-accuracy">{Number.isFinite(selected.accuracyM) ? `Precisión aproximada: ±${Math.ceil(selected.accuracyM!)} m. ` : ''}Revisa que el punto corresponda al acceso que vas a utilizar. <a href={`https://www.google.com/maps/search/?api=1&query=${selected.lat},${selected.lng}`} target="_blank" rel="noreferrer">Ver ubicación ↗</a></p>}
  </div>;
}
