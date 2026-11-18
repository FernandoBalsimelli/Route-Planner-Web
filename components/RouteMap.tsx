'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import L, { type LatLngTuple } from 'leaflet';
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { TILE_ATTRIBUTION, TILE_URL } from '@/lib/map-config';
import { decodePolyline } from '@/lib/polyline';
import { addressNumberNotice, businessLocationNotice, type Coordinates, type LocationSelection } from '@/lib/locations';
import { candidateMapPoints } from '@/lib/map-locations';
import { deliveryPointLabel } from '@/lib/navigation-continuation';

type Waypoint = { lat: number; lng: number; label?: string; type: string; sequence?: number };
const EMPTY_CANDIDATES: LocationSelection[] = [];

function FitRoute({ points, focus, markers }: { points: LatLngTuple[]; focus?: { point: Coordinates; sequence: number; request: number } | null; markers: React.RefObject<Map<number, L.Marker>> }) {
  const map = useMap();
  const previous = useRef('');
  const hadFocus = useRef(false);
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      // Keep the geographic center when a previously hidden panel gains size.
      // Disabling pan skips Leaflet's pixel-offset compensation and shifts it.
      if (map.getContainer().clientWidth) map.invalidateSize({ pan: true, animate: false });
    });
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  useEffect(() => {
    const signature = JSON.stringify([points, focus]);
    if (signature === previous.current) return;
    previous.current = signature;
    if (focus) {
      hadFocus.current = true;
      map.setView([focus.point.lat, focus.point.lng], Math.max(16, map.getZoom()), { animate: false });
      markers.current.get(focus.sequence)?.openPopup();
      return;
    }
    if (hadFocus.current) { map.closePopup(); hadFocus.current = false; }
    if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [28, 28], maxZoom: 15, animate: false });
    else if (points.length === 1) map.setView(points[0], 14, { animate: false });
  }, [map, points, focus, markers]);
  return null;
}

function LivePosition({point,follow}:{point:Coordinates;follow:boolean}){
 const map=useMap();useEffect(()=>{if(follow)map.setView([point.lat,point.lng],Math.max(15,map.getZoom()),{animate:false});},[map,point.lat,point.lng,follow]);
 return <CircleMarker center={[point.lat,point.lng]} radius={7} pathOptions={{color:"#fff",weight:3,fillColor:"#2478cf",fillOpacity:1}}><Popup>Tu posición GPS</Popup></CircleMarker>;
}

function markerIcon(label: string, kind: string, state?: string, focused = false) {
  const className = kind === 'origin' ? 'rp-map-pin rp-map-pin-start' : kind === 'destination' ? 'rp-map-pin rp-map-pin-end' : kind === 'candidate' ? 'rp-map-pin rp-map-pin-search' : 'rp-map-pin rp-map-pin-stop';
  return L.divIcon({
    className: 'rp-map-marker',
    html: `<span class="${className}${state ? ` rp-map-pin-${state}` : ''}${focused ? ' rp-map-pin-focused' : ''}">${label}${state === 'completed' ? '<small aria-hidden="true">✓</small>' : ''}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export default function RouteMap({ polyline, waypoints, planning = false, candidates = EMPTY_CANDIDATES, targetTitle, onChooseCandidate, reference, livePosition, followPosition = false, completedSequences, focus }: { polyline?: string; waypoints: Waypoint[]; planning?: boolean; candidates?: LocationSelection[]; targetTitle?: string; onChooseCandidate?: (point: LocationSelection) => void; reference?: Coordinates | null; livePosition?: Coordinates | null; followPosition?: boolean; completedSequences?: number[]; focus?: { sequence: number; request: number } | null }) {
  const markers = useRef<Map<number, L.Marker>>(new Map());
  const selected = focus && Number.isSafeInteger(focus.sequence) && focus.sequence >= 0 && focus.sequence < waypoints.length ? { ...focus, point: waypoints[focus.sequence] } : null;
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
        const state = completedSequences && index > 0 ? completedSequences.includes(index) ? 'completed' : 'pending' : undefined;
        const title = completedSequences ? `${deliveryPointLabel(index, waypoints.length)} · ${index === 0 ? 'Inicio del cálculo' : state === 'completed' ? 'Completado manualmente' : 'Pendiente'}` : undefined;
        return <Marker key={`${kind}-${index}`} ref={marker => { if (marker) markers.current.set(index, marker); else markers.current.delete(index); }} position={[point.lat, point.lng]} title={title} icon={markerIcon(label, kind, state, selected?.sequence === index)} zIndexOffset={selected?.sequence === index ? 1000 : 0}>
          <Popup>{title && <strong>{title}<br/></strong>}{point.label || (kind === 'origin' ? 'Origen' : kind === 'destination' ? 'Destino' : `Parada ${index}`)}</Popup>
        </Marker>;
      })}
      {candidates.map((point, index) => <Marker key={`candidate-${point.lat}-${point.lng}-${index}`} title={`Sugerencia ${index + 1}: ${point.label}`} position={[point.lat, point.lng]} icon={markerIcon(`S${index + 1}`, 'candidate')}><Popup><strong>{point.label}</strong>{point.distanceMeters != null && <p>{(point.distanceMeters / 1000).toFixed(1)} km del origen, en línea recta</p>}{addressNumberNotice(point) && <p>{addressNumberNotice(point)}</p>}{businessLocationNotice(point) && <p>{businessLocationNotice(point)}</p>}{onChooseCandidate && <button type="button" className="map-candidate-confirm" onClick={() => onChooseCandidate(point)}>Usar como {targetTitle || 'punto'}</button>}</Popup></Marker>)}
      <FitRoute points={allPoints} focus={selected} markers={markers}/>
      {livePosition && <LivePosition point={livePosition} follow={followPosition}/>}
    </MapContainer>
    <div className="route-map-attribution">Mapa © OpenStreetMap contributors</div>
  </div>;
}
