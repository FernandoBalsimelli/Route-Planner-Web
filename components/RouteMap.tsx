'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import L, { type LatLngTuple } from 'leaflet';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { TILE_ATTRIBUTION, TILE_URL } from '@/lib/map-config';
import { decodePolyline } from '@/lib/polyline';
import type { Coordinates, LocationSelection } from '@/lib/locations';
import { candidateMapPoints } from '@/lib/map-locations';

type Waypoint = { lat: number; lng: number; label?: string; type: string; sequence?: number };
const EMPTY_CANDIDATES: LocationSelection[] = [];

function FitRoute({ points }: { points: LatLngTuple[] }) {
  const map = useMap();
  const previous = useRef('');
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      if (map.getContainer().clientWidth) map.invalidateSize({ pan: false });
    });
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  useEffect(() => {
    const signature = JSON.stringify(points);
    if (signature === previous.current) return;
    previous.current = signature;
    if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [28, 28], maxZoom: 15, animate: false });
    else if (points.length === 1) map.setView(points[0], 14, { animate: false });
  }, [map, points]);
  return null;
}

function markerIcon(label: string, kind: string) {
  const className = kind === 'origin' ? 'rp-map-pin rp-map-pin-start' : kind === 'destination' ? 'rp-map-pin rp-map-pin-end' : kind === 'candidate' ? 'rp-map-pin rp-map-pin-search' : 'rp-map-pin rp-map-pin-stop';
  return L.divIcon({
    className: 'rp-map-marker',
    html: `<span class="${className}">${label}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export default function RouteMap({ polyline, waypoints, planning = false, candidates = EMPTY_CANDIDATES, targetTitle, onChooseCandidate, reference }: { polyline?: string; waypoints: Waypoint[]; planning?: boolean; candidates?: LocationSelection[]; targetTitle?: string; onChooseCandidate?: (point: LocationSelection) => void; reference?: Coordinates | null }) {
  const routePoints = useMemo(() => polyline ? decodePolyline(polyline) : [], [polyline]);
  const markerPoints = useMemo(() => waypoints.map(point => [point.lat, point.lng] as LatLngTuple), [waypoints]);
  const candidatePoints = useMemo(() => candidateMapPoints(candidates), [candidates]);
  const referencePoints = useMemo<LatLngTuple[]>(() => reference ? [[reference.lat, reference.lng]] : [], [reference?.lat, reference?.lng]);
  const allPoints = candidatePoints.length ? candidatePoints : routePoints.length ? routePoints : markerPoints.length ? markerPoints : referencePoints;
  const center: LatLngTuple = allPoints[0] || [23.6345, -102.5528];

  if (!allPoints.length && !planning) return <div className="route-map-empty">No hay geometría cartográfica disponible para este recorrido.</div>;

  return <div className="route-map-wrap">
    <MapContainer center={center} zoom={allPoints.length ? 12 : 5} scrollWheelZoom={false} className="route-map" aria-label={planning ? 'Mapa de planificación y sucursales' : 'Mapa del recorrido calculado'}>
      <TileLayer
        attribution={TILE_ATTRIBUTION}
        url={TILE_URL}
      />
      {routePoints.length > 1 && <Polyline positions={routePoints} pathOptions={{ color: '#174b3c', weight: 5, opacity: 0.88 }} />}
      {waypoints.map((point, index) => {
        const kind = point.type || (index === 0 ? 'origin' : index === waypoints.length - 1 ? 'destination' : 'stop');
        const stopNumber = waypoints.slice(0, index + 1).filter(item => item.type === 'stop').length || index;
        const sequence = typeof point.sequence === 'number' && Number.isSafeInteger(point.sequence) && point.sequence > 0 ? point.sequence : stopNumber;
        const label = kind === 'origin' ? 'O' : kind === 'destination' ? 'D' : String(sequence);
        return <Marker key={`${kind}-${index}`} position={[point.lat, point.lng]} icon={markerIcon(label, kind)}>
          <Popup>{point.label || (kind === 'origin' ? 'Origen' : kind === 'destination' ? 'Destino' : `Parada ${index}`)}</Popup>
        </Marker>;
      })}
      {candidates.map((point, index) => <Marker key={`candidate-${point.lat}-${point.lng}-${index}`} title={`Sugerencia ${index + 1}: ${point.label}`} position={[point.lat, point.lng]} icon={markerIcon(`S${index + 1}`, 'candidate')}><Popup><strong>{point.label}</strong>{point.distanceMeters != null && <p>{(point.distanceMeters / 1000).toFixed(1)} km del origen, en línea recta</p>}{onChooseCandidate && <button type="button" className="map-candidate-confirm" onClick={() => onChooseCandidate(point)}>Usar como {targetTitle || 'punto'}</button>}</Popup></Marker>)}
      <FitRoute points={allPoints} />
    </MapContainer>
    <div className="route-map-attribution">Mapa © OpenStreetMap contributors</div>
  </div>;
}
