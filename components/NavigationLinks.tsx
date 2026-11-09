'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { googleMapsSegments, type GoogleWaypointLimit, type NavigationPoint } from '@/lib/navigation';

export default function NavigationLinks({ points, truck = false }: { points: NavigationPoint[]; truck?: boolean }) {
  const [limit, setLimit] = useState<GoogleWaypointLimit>(9);
  useEffect(() => {
    try { if (window.localStorage.getItem('route-planner:google-waypoints') === '3') setLimit(3); } catch {}
  }, []);
  const { segments, error } = useMemo(() => {
    try { return { segments: googleMapsSegments(points, limit), error: '' }; }
    catch (error) { return { segments: [], error: error instanceof Error ? error.message : 'No se pudo preparar el enlace de navegación.' }; }
  }, [points, limit]);
  if (error) return <p className="location-search-error" role="alert">{error}</p>;
  if (!segments.length) return null;
  const lastIndex = segments[segments.length - 1].endIndex;
  return <div className="navigation-links">
    <div className="navigation-heading"><strong>Continuar en Google Maps</strong><span>{segments.length === 1 ? 'Todos los puntos en un enlace' : `${segments.length} tramos · orden completo`}</span></div>
    <label className="navigation-limit">Paradas intermedias por enlace<select value={limit} onChange={event => {
      const next = event.target.value === '3' ? 3 : 9; setLimit(next);
      try { window.localStorage.setItem('route-planner:google-waypoints', String(next)); } catch {}
    }}><option value="9">Máximo de Google Maps · 9</option><option value="3">Navegador móvil · 3</option></select></label>
    <p className="navigation-note">{limit === 9 ? 'Para abrir en la app de Google Maps o en computadora. Si abre en el navegador del celular, elige 3 para conservar las paradas.' : 'Compatible con navegador móvil. Se incluyen todas las paradas repartidas en enlaces consecutivos.'}</p>
    <ol className="navigation-segments">{segments.map((segment, index) => <li key={segment.url}>
      <a className="secondary-button" href={segment.url} target="_blank" rel="noreferrer">{segments.length > 1 ? `Abrir tramo ${index + 1} de ${segments.length} en Google Maps ↗` : 'Abrir puntos en Google Maps ↗'}</a>
      {segments.length > 1 && <small>{segment.startIndex === 0 ? 'Origen' : `Parada ${segment.startIndex}`} → {segment.endIndex === lastIndex ? 'Destino' : `Parada ${segment.endIndex}`}</small>}
    </li>)}</ol>
    {segments.length > 1 && <p className="navigation-note">Abre los tramos en orden. Cada uno comienza en el último punto del anterior; ninguna parada se descarta.</p>}
    {truck && <p className="navigation-note"><strong>No se transfiere la ruta exacta del camión.</strong> Google Maps recalcula entre estos puntos y puede elegir otras calles. El enlace no transmite peso, dimensiones ni permisos municipales. Los puntos intermedios tampoco garantizan conservar el trazado. Consulta el recorrido original de Route Planner y verifica señalización y autorizaciones.</p>}
  </div>;
}
