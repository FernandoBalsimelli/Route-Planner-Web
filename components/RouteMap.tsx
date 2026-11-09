'use client';

import { useEffect, useMemo } from 'react';
import L, { type LatLngTuple } from 'leaflet';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { TILE_ATTRIBUTION, TILE_URL } from '@/lib/map-config';
import { decodePolyline } from '@/lib/polyline';

type Waypoint = { lat: number; lng: number; label?: string; type: string };

function FitRoute({ points }: { points: LatLngTuple[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [28, 28], maxZoom: 15 });
    else if (points.length === 1) map.setView(points[0], 14);
  }, [map, points]);
  return null;
}

function markerIcon(label: string, kind: string) {
  const className = kind === 'origin' ? 'rp-map-pin rp-map-pin-start' : kind === 'destination' ? 'rp-map-pin rp-map-pin-end' : 'rp-map-pin rp-map-pin-stop';
  return L.divIcon({
    className: 'rp-map-marker',
    html: `<span class="${className}">${label}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export default function RouteMap({ polyline, waypoints }: { polyline?: string; waypoints: Waypoint[] }) {
  const routePoints = useMemo(() => polyline ? decodePolyline(polyline) : [], [polyline]);
  const markerPoints = useMemo(() => waypoints.map(point => [point.lat, point.lng] as LatLngTuple), [waypoints]);
  const allPoints = routePoints.length ? routePoints : markerPoints;
  const center: LatLngTuple = allPoints[0] || [23.6345, -102.5528];

  if (!allPoints.length) return <div className="route-map-empty">No hay geometría cartográfica disponible para este recorrido.</div>;

  return <div className="route-map-wrap">
    <MapContainer center={center} zoom={12} scrollWheelZoom={false} className="route-map">
      <TileLayer
        attribution={TILE_ATTRIBUTION}
        url={TILE_URL}
      />
      {routePoints.length > 1 && <Polyline positions={routePoints} pathOptions={{ color: '#174b3c', weight: 5, opacity: 0.88 }} />}
      {waypoints.map((point, index) => {
        const kind = point.type || (index === 0 ? 'origin' : index === waypoints.length - 1 ? 'destination' : 'stop');
        const label = kind === 'origin' ? 'O' : kind === 'destination' ? 'D' : String(index);
        return <Marker key={`${kind}-${index}`} position={[point.lat, point.lng]} icon={markerIcon(label, kind)}>
          <Popup>{point.label || (kind === 'origin' ? 'Origen' : kind === 'destination' ? 'Destino' : `Parada ${index}`)}</Popup>
        </Marker>;
      })}
      <FitRoute points={allPoints} />
    </MapContainer>
    <div className="route-map-attribution">Mapa © OpenStreetMap contributors</div>
  </div>;
}
