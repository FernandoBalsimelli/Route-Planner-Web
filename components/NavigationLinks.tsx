'use client';
import React, { useEffect, useMemo, useState } from 'react';
import type { RouteResult } from '@/lib/routes';
import { googleRouteGuides } from '@/lib/google-route-guides';
import { googleMapsSegments, type GoogleWaypointLimit, type NavigationPoint } from '@/lib/navigation';

export default function NavigationLinks({ points, route, truck = false }: { points: NavigationPoint[]; route?: RouteResult | null; truck?: boolean }) {
  const [includeGuides,setIncludeGuides] = useState(truck);
  const guidePlan = useMemo(() => { if(!route || !truck) return {points:null,guideCount:0,error:''}; try{return {...googleRouteGuides(route),error:''};}catch(error){return {points:null,guideCount:0,error:error instanceof Error?error.message:'No se pudieron preparar puntos guía.'};} },[route,truck]);
  const effectivePoints = includeGuides && guidePlan.points ? guidePlan.points : points;
  const [limit, setLimit] = useState<GoogleWaypointLimit>(9);
  useEffect(() => {
    try { if (window.localStorage.getItem('route-planner:google-waypoints') === '3') setLimit(3); } catch {}
  }, []);
  const { segments, error } = useMemo(() => {
    try { return { segments: googleMapsSegments(effectivePoints, limit), error: '' }; }
    catch (error) { return { segments: [], error: error instanceof Error ? error.message : 'No se pudo preparar el enlace de navegación.' }; }
  }, [effectivePoints, limit]);
  if (error) return <p className="location-search-error" role="alert">{error}</p>;
  if (!segments.length) return null;
  return <div className="navigation-links">
    {route && truck && <div className="google-guide-option"><label><input type="checkbox" checked={includeGuides && Boolean(guidePlan.points)} disabled={!guidePlan.points} onChange={event=>setIncludeGuides(event.target.checked)}/><span><b>Añadir puntos guía del recorrido</b><small>{guidePlan.points ? `${guidePlan.guideCount} puntos sobre el trazado, además de tus entregas.` : guidePlan.error}</small></span></label><p className="navigation-note">Estos puntos orientan la ruta que calcula Google. No la bloquean ni verifican legalidad; Google puede desviarse entre ellos y pedir continuar al llegar a cada guía.</p></div>}
    <div className="navigation-heading"><strong>Continuar en Google Maps</strong><span>{segments.length === 1 ? 'Todos los puntos en un enlace' : `${segments.length} tramos · orden completo`}</span></div>
    <label className="navigation-limit">Paradas intermedias por enlace<select aria-label="Paradas intermedias por enlace" value={limit} onChange={event => {
      const next = event.target.value === '3' ? 3 : 9; setLimit(next);
      try { window.localStorage.setItem('route-planner:google-waypoints', String(next)); } catch {}
    }}><option value="9">Máximo de Google Maps · 9</option><option value="3">Navegador móvil · 3</option></select></label>
    <p className="navigation-note">{limit === 9 ? 'Para abrir en la app de Google Maps o en computadora. Si abre en el navegador del celular, elige 3 para conservar las paradas.' : 'Compatible con navegador móvil. Se incluyen todas las paradas repartidas en enlaces consecutivos.'}</p>
    <ol className="navigation-segments">{segments.map((segment, index) => <li key={segment.url}>
      <a className="secondary-button" href={segment.url} target="_blank" rel="noreferrer">{segments.length > 1 ? `Abrir tramo ${index + 1} de ${segments.length} en Google Maps ↗` : 'Abrir puntos en Google Maps ↗'}</a>
      {segments.length > 1 && <small>{segment.startLabel} → {segment.endLabel}</small>}
    </li>)}</ol>
    {segments.length > 1 && <p className="navigation-note">Abre los tramos en orden. Cada uno comienza en el último punto del anterior; ninguna parada se descarta.</p>}
    {truck && <p className="navigation-note"><strong>No se transfiere la ruta exacta del camión.</strong> Google Maps recalcula entre estos puntos y puede elegir otras calles. El enlace no transmite peso, dimensiones ni permisos municipales. Los puntos intermedios tampoco garantizan conservar el trazado. Consulta el recorrido original de Route Planner y verifica señalización y autorizaciones.</p>}
  </div>;
}
