'use client';

import React, { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import { locateDevice } from '@/lib/geolocation';
import { addressNumberNotice, businessLocationNotice, resolvePointLabel, type Coordinates, type LocationSelection } from '@/lib/locations';
import LocationBookTools from './LocationBookTools';
import LocationReviewLinks from './LocationReviewLinks';
import { useLocationBook } from './LocationBookProvider';
import { validLocation } from '@/lib/location-book';
import { fetchLocationSuggestions, LocationSearchError } from '@/lib/location-search';
import { mapsLocationPaste } from '@/lib/maps-location-paste';

export type { LocationSelection } from '@/lib/locations';
const MapLocationPicker = dynamic(() => import('./MapLocationPicker'), { ssr: false, loading: () => <p role="status">Cargando mapa…</p> });
// Server markup waits for handlers. Fields created later in the running app
// are ready immediately, so manifest review can focus them on mount.
const subscribeToReadiness = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

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
  const interactive = useSyncExternalStore(subscribeToReadiness, clientReady, serverReady);
  const book = useLocationBook();
  const [bookOpen, setBookOpen] = useState(false);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const focused = useRef(false);
  const suggestionsCallback = useRef(onSuggestions); suggestionsCallback.current = onSuggestions;
  const [suggestions, setSuggestions] = useState<LocationSelection[]>([]);
  const [outsideNearby, setOutsideNearby] = useState(false);
  const [showDistant, setShowDistant] = useState(false);
  const visibleSuggestions = outsideNearby && !showDistant ? [] : suggestions;
  const [pending, setPending] = useState<LocationSelection | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchErrorCode, setSearchErrorCode] = useState('');
  const [searchAttempt, setSearchAttempt] = useState(0);
  const [searchPaused, setSearchPaused] = useState(false);
  const searchController = useRef<AbortController | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchDismissed = useRef(false);
  const [preferNearby, setPreferNearby] = useState(true);
  const [searchNotice, setSearchNotice] = useState('');
  const [pasteNotice, setPasteNotice] = useState('');
  const [geoStatus, setGeoStatus] = useState('');
  const [geoBusy, setGeoBusy] = useState(false);
  const geoRequest = useRef(0);
  const reverseController = useRef<AbortController | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [mapSeed, setMapSeed] = useState<(Coordinates & { label?: string }) | null>(null);
  const mapButton = useRef<HTMLButtonElement | null>(null);

  function closeMap() { setMapOpen(false); setSearchPaused(false); mapButton.current?.focus(); }

  function dismissSearch() {
    if (searchTimer.current !== null) clearTimeout(searchTimer.current);
    searchTimer.current = null;
    searchController.current?.abort();
    searchController.current = null;
    searchDismissed.current = true;
    setSearchPaused(true);
    setSuggestions([]); setPending(null); setActiveIndex(-1); setLoading(false);
    setSearchError(''); setSearchNotice('');
    setOutsideNearby(false); setShowDistant(false);
    suggestionsCallback.current?.([]);
  }

  function openLocationBook() {
    cancelLocation();
    setMapOpen(false);
    if (!bookOpen) {
      dismissSearch();
      book?.searchFavorites(selected?.label === value ? '' : value.trim());
    } else setSearchPaused(false);
    setBookOpen(current => !current);
  }

  useEffect(() => () => { geoRequest.current++; reverseController.current?.abort(); }, []);

  function cancelLocation() {
    geoRequest.current++;
    reverseController.current?.abort();
    setGeoBusy(false);
    setGeoStatus('');
  }

  async function useCurrentLocation() {
    cancelLocation();
    dismissSearch();
    setMapOpen(false);
    setBookOpen(false);
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
    if (selected && selected.label === value) {
      geoRequest.current++; reverseController.current?.abort(); setGeoBusy(false);
      if (focused.current) suggestionsCallback.current?.([]);
      setSuggestions([]);
      setPending(null);
      setSearchError('');
      setPasteNotice('');
      setLoading(false);
      return;
    }
    if (mapOpen || bookOpen || searchPaused) { setSuggestions([]); setPending(null); setLoading(false); return; }
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
    setOutsideNearby(false);
    setShowDistant(false);
    searchDismissed.current = false;
    const controller = new AbortController();
    searchController.current = controller;
    const timer = setTimeout(async () => {
      searchTimer.current = null;
      setLoading(true);
      setSearchError('');
      try {
        const params = new URLSearchParams({ q: value.trim() });
        if (preferNearby && mapReference) { params.set('lat', String(mapReference.lat)); params.set('lng', String(mapReference.lng)); }
        const payload = await fetchLocationSuggestions(`${apiUrl}/v1/locations/suggest?${params}`, controller.signal);
        if (controller.signal.aborted) return;
        const locations = Array.isArray(payload.suggestions) ? payload.suggestions.filter(validLocation) : [];
        const distant = payload.warning === 'NO_NEARBY_MATCHES';
        setSuggestions(locations);
        setOutsideNearby(distant);
        if (focused.current) suggestionsCallback.current?.(distant ? [] : locations);
        setSearchNotice(distant ? 'No encontramos coincidencias a menos de 50 km del punto de referencia. Añade calle o ciudad, pega coordenadas o un Plus Code, o elige el acceso en el mapa cerca del origen.' : !locations.length ? 'Sin coincidencias. Añade calle, colonia o ciudad, o elige el punto en el mapa.' : '');
      } catch (error) {
        if (controller.signal.aborted) return;
        setSuggestions([]);
        setSearchErrorCode(error instanceof LocationSearchError ? error.code : 'LOCATION_SEARCH_FAILED');
        setSearchError(error instanceof Error ? error.message : 'No se pudieron cargar las sugerencias.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 320);
    searchTimer.current = timer;
    return () => {
      clearTimeout(timer);
      controller.abort();
      if (searchController.current === controller) {
        searchController.current = null;
        searchTimer.current = null;
      }
    };
  }, [value, apiUrl, selected, mapOpen, bookOpen, searchPaused, preferNearby, mapReference?.lat, mapReference?.lng, searchAttempt]);

  function confirmPending() {
    if (!pending) return;
    cancelLocation();
    dismissSearch();
    onChange(pending.label);
    onConfirm(pending); book?.remember(pending);
    setPending(null);
    setSuggestions([]);
    setActiveIndex(-1);
    setSearchError('');
  }

  return <fieldset className="location-field" aria-label={`Ubicación: ${title}`} disabled={!interactive} aria-busy={!interactive || loading}>
    {!interactive && <p className="location-search-status" role="status">Preparando el buscador de {title.toLowerCase()}…</p>}
    <noscript><p>Activa JavaScript para escribir y confirmar ubicaciones.</p></noscript>
    <label className="field">
      <span><i className={color === 'number' ? 'stop-number' : `dot ${color}`}>{color === 'number' ? title.match(/\d+/)?.[0] : ''}</i> {color === 'number' ? title : title.toUpperCase()}</span>
      <input
        role="combobox"
        ref={inputRef}
        aria-label={title}
        onFocus={() => {
          focused.current = true;
          if (searchDismissed.current && !mapOpen && !bookOpen && value.trim().length >= 2 && selected?.label !== value) {
            searchDismissed.current = false; setSearchPaused(false); setSearchAttempt(attempt => attempt + 1);
          } else suggestionsCallback.current?.(visibleSuggestions);
        }}
        onBlur={() => { focused.current = false; }}
        maxLength={180}
        value={value}
        onChange={event => { cancelLocation(); setSearchPaused(false); setPasteNotice(''); setMapOpen(false); onChange(event.target.value); setPending(null); }}
        onPaste={event => {
          const imported = mapsLocationPaste(event.clipboardData.getData('text'));
          if (!imported) return;
          event.preventDefault(); cancelLocation();
          if (imported.type === 'unsupported') { setPasteNotice(imported.message); return; }
          setMapOpen(false); setBookOpen(false); setSearchPaused(false); setPending(null); setActiveIndex(-1);
          onChange(imported.query);
          setPasteNotice('Búsqueda extraída del enlace de Google Maps. Elige una sugerencia y corrobora el punto antes de confirmarlo; el enlace no acredita la sucursal ni el acceso.');
        }}
        placeholder={placeholder}
        title="Dirección, Plus Code, coordenadas o enlace de búsqueda de Google Maps"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={!pending && visibleSuggestions.length > 0}
        aria-controls={listId}
        aria-activedescendant={!pending && activeIndex >= 0 && activeIndex < visibleSuggestions.length ? `${listId}-${activeIndex}` : undefined}
        aria-busy={loading}
        onKeyDown={event => {
          if (event.key === 'Escape') { cancelLocation(); dismissSearch(); return; }
          if (event.key === 'Enter' && searchDismissed.current && !mapOpen && !bookOpen && value.trim().length >= 2 && selected?.label !== value) {
            event.preventDefault(); searchDismissed.current = false; setSearchPaused(false); setSearchAttempt(attempt => attempt + 1); return;
          }
          if (event.key === 'Enter' && pending) { event.preventDefault(); confirmPending(); return; }
          if (event.key === 'Enter' && outsideNearby && !visibleSuggestions.length) { event.preventDefault(); return; }
          if (!visibleSuggestions.length || pending) return;
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex(index => index < 0 ? event.key === 'ArrowDown' ? 0 : visibleSuggestions.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + visibleSuggestions.length) % visibleSuggestions.length); }
          else if (event.key === 'Enter') { event.preventDefault(); setPending(visibleSuggestions[activeIndex >= 0 ? activeIndex : 0]); }
        }}
      />
    </label>
    {pasteNotice && <p className="location-search-status" role="status">{pasteNotice}</p>}
    <LocationBookTools title={title} value={value} selected={selected} open={bookOpen} onToggle={openLocationBook} onPick={point => { cancelLocation(); setMapOpen(false); setBookOpen(false); setPending(null); onChange(point.label); onConfirm(point); book?.remember(point); }}/>
    {mapReference && !selected && <label className="nearby-toggle"><input type="checkbox" checked={preferNearby} onChange={event => setPreferNearby(event.target.checked)}/> Priorizar lugares cerca del origen <small>Para otra ciudad: escribe «lugar, ciudad».</small></label>}
    <button type="button" ref={mapButton} className="map-open-button" aria-label={`Elegir ${title.toLowerCase()} en el mapa`} aria-expanded={mapOpen} onClick={() => {
      if (mapOpen) { closeMap(); return; }
      cancelLocation();
      setBookOpen(false);
      setMapSeed(selected || pending || (!outsideNearby ? suggestions[0] : null) || mapReference || null);
      dismissSearch();
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
    {book?.signedIn && !bookOpen && !mapOpen && !selected && !pending && !loading && value.trim().length >= 2 && (searchError || searchNotice) && <div className="saved-search-recovery"><button type="button" className="map-open-button" onClick={openLocationBook}>Buscar en mis favoritos</button><p className="hint">Usa la búsqueda que ya escribiste para encontrar una sucursal guardada en tu cuenta. Revisa que corresponda a esta entrega.</p></div>}
    {onSuggestions && visibleSuggestions.length > 0 && !pending && <a className="suggestions-map-link" href="#mapa-planificacion" onClick={() => suggestionsCallback.current?.(visibleSuggestions)}>Ver estas coincidencias en el mapa ↑</a>}
    {!loading && searchNotice && !selected && !pending && <p className="location-search-status" role="status">{searchNotice}</p>}
    {!loading && outsideNearby && suggestions.length > 0 && !selected && !pending && <button type="button" className="text-button" aria-expanded={showDistant} onClick={() => {
      setShowDistant(!showDistant); setActiveIndex(-1);
      suggestionsCallback.current?.(showDistant ? [] : suggestions);
    }}>{showDistant ? 'Ocultar coincidencias lejanas' : `Ver coincidencias lejanas (${suggestions.length})`}</button>}
    {visibleSuggestions.length > 0 && !pending && <div className="location-suggestions" id={listId} role="listbox" aria-label={`Sugerencias para ${title}`}>
      {visibleSuggestions.map((suggestion, index) => <button
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
    {searchError && <div className="location-search-error" role="alert" data-error-code={searchErrorCode}><p>{searchError} Puedes continuar escribiendo una dirección completa.</p><button type="button" className="text-button" aria-label={`Reintentar búsqueda de ${title.toLowerCase()}`} onClick={() => { cancelLocation(); setMapOpen(false); setBookOpen(false); setSearchPaused(false); inputRef.current?.focus(); setSearchAttempt(attempt => attempt + 1); }}>Reintentar búsqueda</button></div>}
    {pending && <div className="location-confirm-card">
      <div><strong>¿Es este el punto correcto?</strong><p>{pending.label}</p><small>{locationKind(pending.kind) && `${locationKind(pending.kind)} · `}{pending.plusCode || `${pending.lat.toFixed(6)}, ${pending.lng.toFixed(6)}`}</small></div>
      {businessLocationNotice(pending) && <p className="address-number-notice" role="status">{businessLocationNotice(pending)}</p>}
      {addressNumberNotice(pending) && <p className="address-number-notice" role="status">{addressNumberNotice(pending)}</p>}
      {pending.numberMatch && pending.numberMatch !== 'matched' && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value.trim())}`} target="_blank" rel="noreferrer">Buscar la dirección escrita en Google Maps ↗</a>}
      <LocationReviewLinks point={pending}/>
      <button type="button" className="map-open-button" onClick={() => { setMapSeed(pending); dismissSearch(); setMapOpen(true); }}>Corroborar aquí en el mapa</button>
      <div className="location-confirm-actions"><button type="button" onClick={() => setPending(null)}>Elegir otro</button><button type="button" onClick={confirmPending}>Confirmar punto</button></div>
    </div>}
    {selected && selected.label === value && !pending && <p className="location-confirmed"><span>✓ Punto confirmado</span><small>{selected.plusCode || `${selected.lat.toFixed(6)}, ${selected.lng.toFixed(6)}`}</small></p>}
    {selected && selected.label === value && addressNumberNotice(selected) && <p className="address-number-notice">{addressNumberNotice(selected)}</p>}
    {selected?.source === 'geolocation' && selected.label === value && <p className="location-accuracy">{Number.isFinite(selected.accuracyM) ? `Precisión aproximada: ±${Math.ceil(selected.accuracyM!)} m. ` : ''}Revisa que el punto corresponda al acceso que vas a utilizar. <a href={`https://www.google.com/maps/search/?api=1&query=${selected.lat},${selected.lng}`} target="_blank" rel="noreferrer">Ver ubicación ↗</a></p>}
  </fieldset>;
}
