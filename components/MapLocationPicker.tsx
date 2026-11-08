'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CircleMarker, MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import type { Map as LeafletMap } from 'leaflet';
import { resolvePointLabel, type Coordinates, type LocationSelection } from '@/lib/locations';
import { TILE_ATTRIBUTION, TILE_URL } from '@/lib/map-config';
import 'leaflet/dist/leaflet.css';

function PickEvents({ onPick }: { onPick: (point: Coordinates) => void }) {
  useMapEvents({ click: event => onPick({ lat: event.latlng.lat, lng: event.latlng.lng }) });
  return null;
}

export default function MapLocationPicker({ title, initialPoint, apiUrl, onConfirm, onClose }: {
  title: string;
  initialPoint?: Coordinates | null;
  apiUrl: string;
  onConfirm: (point: LocationSelection) => void;
  onClose: () => void;
}) {
  const [map, setMap] = useState<LeafletMap | null>(null);
  const [point, setPoint] = useState<Coordinates | null>(null);
  const [resolved, setResolved] = useState<LocationSelection | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Toca una calle o acceso en el mapa. También puedes moverlo y elegir su centro.');
  const controller = useRef<AbortController | null>(null);
  const requestId = useRef(0);
  const center: [number, number] = initialPoint ? [initialPoint.lat, initialPoint.lng] : [23.6345, -102.5528];

  useEffect(() => () => { requestId.current++; controller.current?.abort(); }, []);

  function pick(next: Coordinates) {
    controller.current?.abort();
    requestId.current++;
    setPoint(next);
    setResolved(null);
    setBusy(true);
    setStatus('Buscando la dirección del punto elegido…');
  }

  useEffect(() => {
    if (!point) return;
    const current = ++requestId.current;
    const abort = new AbortController();
    controller.current = abort;
    const debounce = setTimeout(async () => {
      const timer = setTimeout(() => abort.abort(), 12000);
      const { location, addressFound } = await resolvePointLabel(point, apiUrl, abort.signal);
      clearTimeout(timer);
      if (current !== requestId.current) return;
      setResolved({ ...location, source: 'map' });
      setBusy(false);
      setStatus(addressFound ? 'Comprueba la dirección y confirma el punto.' : 'La dirección no está disponible. Puedes confirmar estas coordenadas o elegir otro punto.');
    }, 250);
    return () => { requestId.current++; clearTimeout(debounce); abort.abort(); };
  }, [point, apiUrl]);

  return <section className="map-location-picker" role="region" aria-label={`Mapa para ${title.toLowerCase()}`} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } }}>
    <div className="map-picker-heading"><strong>Elegir {title.toLowerCase()}</strong><button type="button" onClick={onClose} aria-label={`Cerrar mapa de ${title.toLowerCase()}`}>Cerrar ×</button></div>
    <p className="map-picker-hint">{initialPoint ? 'Vista centrada en una ubicación del recorrido.' : 'Vista inicial de México. Acércate a la zona que necesitas.'} Toca el punto o elige el centro y confirma la selección.</p>
    <MapContainer center={center} zoom={initialPoint ? 15 : 5} ref={setMap} scrollWheelZoom={false} className="point-picker-map" aria-label={`Mapa interactivo para ${title.toLowerCase()}`}>
      <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} />
      <PickEvents onPick={next => void pick(next)} />
      {point && <CircleMarker center={[point.lat, point.lng]} radius={9} pathOptions={{ color: '#fff', weight: 3, fillColor: '#174b3c', fillOpacity: 1 }} />}
    </MapContainer>
    <button type="button" className="map-center-button" disabled={!map} onClick={() => { const next = map?.getCenter(); if (next) void pick({ lat: next.lat, lng: next.lng }); }}>Elegir el centro del mapa</button>
    <p className="map-picker-status" role="status" aria-live="polite">{status}</p>
    {point && <div className="map-picked-point"><strong>{resolved?.label || 'Punto seleccionado'}</strong><small>{point.lat.toFixed(6)}, {point.lng.toFixed(6)}{resolved?.plusCode ? ` · ${resolved.plusCode}` : ''}</small></div>}
    <div className="map-picker-actions"><button type="button" onClick={onClose}>Cancelar</button><button type="button" disabled={!resolved || busy} onClick={() => resolved && onConfirm(resolved)}>{busy ? 'Buscando dirección…' : 'Confirmar punto del mapa'}</button></div>
  </section>;
}
