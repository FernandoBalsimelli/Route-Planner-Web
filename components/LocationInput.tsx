'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { locateDevice } from '@/lib/geolocation';
import { addressNumberNotice, resolvePointLabel, type Coordinates, type LocationSelection } from '@/lib/locations';
import LocationBookTools from './LocationBookTools';
import { useLocationBook } from './LocationBookProvider';
import { validLocation } from '@/lib/location-book';

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
  onSuggestions?: (locations: LocationSelection[]) => void;
};

export default function LocationInput({ title, color, value, placeholder, apiUrl, selected, allowCurrentLocation = false, mapReference, onChange, onConfirm, onSuggestions }: Props) {
  const book = useLocationBook();
  const [bookOpen, setBookOpen] = useState(false);
  const listId = useId();
  const [activeIndex, setActiveIndex] = useState(-1);
  const focused = useRef(false);
  const suggestionsCallback = useRef(onSuggestions); suggestionsCallback.current = onSuggestions;
  const [suggestions, setSuggestions] = useState<LocationSelection[]>([]);
  const [pending, setPending] = useState<LocationSelection | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [preferNearby, setPreferNearby] = useState(true);
  const [searchNotice, setSearchNotice] = useState('');
  const [geoStatus, setGeoStatus] = useState('');
  const [geoBusy, setGeoBusy] = useState(false);
  const geoRequest = useRef(0);
  const reverseController = useRef<AbortController | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [mapSeed, setMapSeed] = useState<(Coordinates & { label?: string }) | null>(null);
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
      onConfirm(location); book?.remember(location);
      setGeoStatus(addressFound ? 'Ubicación actual establecida como origen.' : 'Origen establecido con coordenadas. No se pudo obtener la dirección legible.');
    } catch (error) {
      if (geoRequest.current === requestId) setGeoStatus(error instanceof Error ? error.message : 'No se pudo obtener tu ubicación.');
    } finally {
      if (geoRequest.current === requestId) setGeoBusy(false);
    }
  }

  useEffect(() => {
    if (mapOpen || bookOpen) { setSuggestions([]); setPending(null); setLoading(false); return; }
    if (selected && selected.label === value) {
      geoRequest.current++; reverseController.current?.abort(); setGeoBusy(false);
      if (focused.current) suggestionsCallback.current?.([]);
      setSuggestions([]);
      setPending(null);
      setSearchError('');
      setLoading(false);
      return;
    }
    if (value.trim().length < 2) {
      if (focused.current) suggestionsCallback.current?.([]);
      setSuggestions([]);
      setPending(null);
      setSearchError('');
      setLoading(false);
      return;
    }
    setSuggestions([]);
    if (focused.current) suggestionsCallback.current?.([]);
    setActiveIndex(-1);
    setPending(null);
    setSearchError('');
    setSearchNotice('');
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setSearchError('');
      try {
        const params = new URLSearchParams({ q: value.trim() });
        if (preferNearby && mapReference) { params.set('lat', String(mapReference.lat)); params.set('lng', String(mapReference.lng)); }
        const response = await fetch(`${apiUrl}/v1/locations/suggest?${params}`, { signal: controller.signal });
        const payload = await response.json();
        if (controller.signal.aborted) return;
        if (!response.ok) throw new Error(payload.message || 'No se pudieron cargar las sugerencias.');
        const locations = Array.isArray(payload.suggestions) ? payload.suggestions.filter(validLocation) : [];
        setSuggestions(locations);
        if (focused.current) suggestionsCallback.current?.(locations);
        setSearchNotice(payload.warning === 'NO_NEARBY_MATCHES' ? 'No encontramos coincidencias a menos de 50 km del punto de referencia. Revisa la ciudad y la distancia de estos resultados.' : !locations.length ? 'Sin coincidencias. Añade calle, colonia o ciudad, o elige el punto en el mapa.' : '');
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
  }, [value, apiUrl, selected, mapOpen, bookOpen, preferNearby, mapReference?.lat, mapReference?.lng]);

  function confirmPending() {
    if (!pending) return;
    cancelLocation();
    onChange(pending.label);
    onConfirm(pending); book?.remember(pending);
    setPending(null);
    setSuggestions([]);
    setActiveIndex(-1);
    setSearchError('');
  }

  return <div className="location-field">
    <label className="field">
      <span><i className={color === 'number' ? 'stop-number' : `dot ${color}`}>{color === 'number' ? title.match(/\d+/)?.[0] : ''}</i> {color === 'number' ? title : title.toUpperCase()}</span>
      <input
        role="combobox"
        aria-label={title}
        onFocus={() => { focused.current = true; suggestionsCallback.current?.(suggestions); }}
        onBlur={() => { focused.current = false; }}
        maxLength={180}
        value={value}
        onChange={event => { cancelLocation(); setMapOpen(false); onChange(event.target.value); setPending(null); }}
        placeholder={placeholder}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={!pending && suggestions.length > 0}
        aria-controls={listId}
        aria-activedescendant={!pending && activeIndex >= 0 && activeIndex < suggestions.length ? `${listId}-${activeIndex}` : undefined}
        aria-busy={loading}
        onKeyDown={event => {
          if (event.key === 'Escape') { setPending(null); setSuggestions([]); setActiveIndex(-1); return; }
          if (event.key === 'Enter' && pending) { event.preventDefault(); confirmPending(); return; }
          if (!suggestions.length || pending) return;
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex(index => index < 0 ? event.key === 'ArrowDown' ? 0 : suggestions.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + suggestions.length) % suggestions.length); }
          else if (event.key === 'Enter') { event.preventDefault(); setPending(suggestions[activeIndex >= 0 ? activeIndex : 0]); }
        }}
      />
    </label>
    <LocationBookTools title={title} value={value} selected={selected} open={bookOpen} onToggle={() => { cancelLocation(); setMapOpen(false); setBookOpen(current => !current); }} onPick={point => { cancelLocation(); setMapOpen(false); setBookOpen(false); setPending(null); onChange(point.label); onConfirm(point); book?.remember(point); }}/>
    {mapReference && !selected && <label className="nearby-toggle"><input type="checkbox" checked={preferNearby} onChange={event => setPreferNearby(event.target.checked)}/> Priorizar lugares cerca del origen <small>Para otra ciudad: escribe «lugar, ciudad».</small></label>}
    <button type="button" ref={mapButton} className="map-open-button" aria-label={`Elegir ${title.toLowerCase()} en el mapa`} aria-expanded={mapOpen} onClick={() => {
      if (mapOpen) { closeMap(); return; }
      cancelLocation();
      setBookOpen(false);
      setMapSeed(selected || pending || suggestions[0] || mapReference || null);
      setMapOpen(true);
    }}>⌖ {mapOpen ? 'Cerrar mapa' : 'Elegir en el mapa'}</button>
    {mapOpen && <MapLocationPicker title={title} initialPoint={mapSeed} apiUrl={apiUrl} onClose={closeMap} onConfirm={location => {
      const resolved = mapSeed?.label && location.lat === mapSeed.lat && location.lng === mapSeed.lng ? { ...location, label: mapSeed.label } : location;
      onChange(resolved.label); onConfirm(resolved); book?.remember(resolved); setPending(null); setSearchError(''); closeMap();
    }} />}
    {allowCurrentLocation && <div className="current-location-tools">
      <button type="button" className="current-location-button" disabled={geoBusy} onClick={() => void useCurrentLocation()}><span aria-hidden="true">⌖</span> {geoBusy ? 'Localizando…' : 'Usar mi ubicación actual'}</button>
      {geoBusy && <button type="button" className="text-button" onClick={cancelLocation}>Cancelar</button>}
      {geoStatus && <p className="location-search-status" role="status" aria-live="polite">{geoStatus}</p>}
    </div>}
    {loading && <p className="location-search-status">Buscando direcciones y lugares…</p>}
    {onSuggestions && suggestions.length > 0 && !pending && <a className="suggestions-map-link" href="#mapa-planificacion" onClick={() => suggestionsCallback.current?.(suggestions)}>Ver estas coincidencias en el mapa ↑</a>}
    {!loading && searchNotice && !selected && !pending && <p className="location-search-status" role="status">{searchNotice}</p>}
    {suggestions.length > 0 && !pending && <div className="location-suggestions" id={listId} role="listbox" aria-label={`Sugerencias para ${title}`}>
      {suggestions.map((suggestion, index) => <button
        type="button"
        className="location-suggestion"
        id={`${listId}-${index}`}
        role="option"
        aria-selected={index === activeIndex}
        onMouseEnter={() => setActiveIndex(index)}
        key={`${suggestion.lat}-${suggestion.lng}-${index}`}
        onClick={() => setPending(suggestion)}
      >
        <span className="suggestion-pin">{onSuggestions ? `S${index + 1}` : '⌖'}</span>
        <span className="suggestion-copy"><strong>{suggestion.label}</strong><small>{locationKind(suggestion.kind) && `${locationKind(suggestion.kind)} · `}{suggestion.plusCode || `${suggestion.lat.toFixed(6)}, ${suggestion.lng.toFixed(6)}`}</small>{suggestion.distanceMeters != null && <small>{suggestion.distanceMeters < 1000 ? `${suggestion.distanceMeters} m` : `${(suggestion.distanceMeters / 1000).toFixed(1)} km`} del origen · en línea recta</small>}</span>
        {suggestion.numberMatch && <small className="number-match-label">{suggestion.numberMatch === 'matched' ? `Número ${suggestion.houseNumber} según proveedor` : suggestion.numberMatch === 'different' ? `Otro número: ${suggestion.houseNumber}` : `Aproximado · sin número ${suggestion.requestedHouseNumber}`}</small>}
        <span className="suggestion-arrow">›</span>
      </button>)}
    </div>}
    {searchError && <p className="location-search-error">{searchError} Puedes continuar escribiendo una dirección completa.</p>}
    {pending && <div className="location-confirm-card">
      <div><strong>¿Es este el punto correcto?</strong><p>{pending.label}</p><small>{locationKind(pending.kind) && `${locationKind(pending.kind)} · `}{pending.plusCode || `${pending.lat.toFixed(6)}, ${pending.lng.toFixed(6)}`}</small></div>
      {addressNumberNotice(pending) && <p className="address-number-notice" role="status">{addressNumberNotice(pending)}</p>}
      {pending.numberMatch && pending.numberMatch !== 'matched' && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value.trim())}`} target="_blank" rel="noreferrer">Buscar la dirección escrita en Google Maps ↗</a>}
      <a href={`https://www.google.com/maps/search/?api=1&query=${pending.lat},${pending.lng}`} target="_blank" rel="noreferrer">Ver mapa ↗</a>
      <button type="button" className="map-open-button" onClick={() => { setMapSeed(pending); setMapOpen(true); }}>Corroborar aquí en el mapa</button>
      <div className="location-confirm-actions"><button type="button" onClick={() => setPending(null)}>Elegir otro</button><button type="button" onClick={confirmPending}>Confirmar punto</button></div>
    </div>}
    {selected && selected.label === value && !pending && <p className="location-confirmed"><span>✓ Punto confirmado</span><small>{selected.plusCode || `${selected.lat.toFixed(6)}, ${selected.lng.toFixed(6)}`}</small></p>}
    {selected && selected.label === value && addressNumberNotice(selected) && <p className="address-number-notice">{addressNumberNotice(selected)}</p>}
    {selected?.source === 'geolocation' && selected.label === value && <p className="location-accuracy">{Number.isFinite(selected.accuracyM) ? `Precisión aproximada: ±${Math.ceil(selected.accuracyM!)} m. ` : ''}Revisa que el punto corresponda al acceso que vas a utilizar. <a href={`https://www.google.com/maps/search/?api=1&query=${selected.lat},${selected.lng}`} target="_blank" rel="noreferrer">Ver ubicación ↗</a></p>}
  </div>;
}
