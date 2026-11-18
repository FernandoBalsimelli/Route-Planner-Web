'use client';
import React, { useEffect, useMemo, useState } from 'react';
import type { RouteResult } from '@/lib/routes';
import { readRoutePreferences, roadPreferencesLabel, type RoutePreferences } from '@/lib/route-preferences';
import { googleRouteGuides } from '@/lib/google-route-guides';
import { googleMapsSegments, type GoogleWaypointLimit, type NavigationPoint } from '@/lib/navigation';
import { deliveryPointLabel, remainingNavigationPoints } from '@/lib/navigation-continuation';
import { reviewDeliveryNavigation, type DeliveryProgress } from '@/lib/delivery-progress';

export default function NavigationLinks({ points, route, truck = false, preferences, deliveryProgress }: { points: NavigationPoint[]; route?: RouteResult | null; truck?: boolean; preferences?: RoutePreferences; deliveryProgress?: DeliveryProgress }) {
  const selectedPreferences = readRoutePreferences(route ? route.preferences : preferences);
  const { avoidTolls, avoidHighways } = selectedPreferences;
  const [includeGuides,setIncludeGuides] = useState(truck);
  const guidePlan = useMemo(() => { if(!route || !truck) return {points:null,guideCount:0,error:''}; try{return {...googleRouteGuides(route),error:''};}catch(error){return {points:null,guideCount:0,error:error instanceof Error?error.message:'No se pudieron preparar puntos guía.'};} },[route,truck]);
  const review = useMemo(() => { try { return { plan: deliveryProgress ? reviewDeliveryNavigation(deliveryProgress, points) : null, error: '' }; } catch (cause) { return { plan: null, error: cause instanceof Error ? cause.message : 'Actualiza el avance antes de navegar.' }; } }, [deliveryProgress, points]);
  const [continuation, setContinuation] = useState<{ points: NavigationPoint[]; route: typeof route; progress: typeof deliveryProgress; truck: boolean; avoidTolls: boolean; avoidHighways: boolean; index: number } | null>(null);
  const canResume = Boolean((route || review.plan) && points.length > 2);
  // Ignore old selection synchronously when inputs change, before effects run.
  const startIndex = canResume && continuation?.points === points && continuation.route === route && continuation.progress === deliveryProgress && continuation.truck === truck && continuation.avoidTolls === avoidTolls && continuation.avoidHighways === avoidHighways ? continuation.index : 0;
  function resume(index: number) { setContinuation({ points, route, progress: deliveryProgress, truck, avoidTolls, avoidHighways, index }); }
  const [limit, setLimit] = useState<GoogleWaypointLimit>(9);
  useEffect(() => {
    try { if (window.localStorage.getItem('route-planner:google-waypoints') === '3') setLimit(3); } catch {}
  }, []);
  const { segments, guideCount, error } = useMemo(() => {
    try {
      if (points.length < 2) return { segments: [], guideCount: 0, error: '' };
      // Validate the complete itinerary before considering a continuation.
      const complete = googleMapsSegments(points, limit, { avoidTolls, avoidHighways });
      if (!complete.length) return { segments: [], guideCount: 0, error: '' };
      const remaining = remainingNavigationPoints(points, startIndex, includeGuides && guidePlan.points ? guidePlan.points : null);
      return { segments: googleMapsSegments(remaining.points, limit, { avoidTolls, avoidHighways }), guideCount: remaining.guideCount, error: '' };
    }
    catch (error) { return { segments: [], guideCount: 0, error: error instanceof Error ? error.message : 'No se pudo preparar el enlace de navegación.' }; }
  }, [points, startIndex, includeGuides, guidePlan.points, limit, avoidTolls, avoidHighways]);
  if (error || review.error) return <p className="location-search-error" role="alert">{review.error || error}</p>;
  if (!segments.length) return null;
  return <div className="navigation-links">
    {review.plan && deliveryProgress && <section className="navigation-progress-review" aria-label="Revisar pendientes para navegar">
      <strong>Avance consultado · Revisión {deliveryProgress.revision}</strong>
      <p>{review.plan.pending.length ? `${review.plan.pending.length} puntos pendientes. Primero: ${deliveryPointLabel(review.plan.pending[0], points.length).toLowerCase()}.` : 'Todos los puntos figuran completados. Puedes revisar el recorrido completo; no se inicia ni recorta automáticamente.'}</p>
      {review.plan.suggestedStart !== null && <button type="button" className="secondary-button" onClick={() => resume(review.plan!.suggestedStart!)}>Retomar después de entrega {review.plan.suggestedStart}</button>}
      <p className="navigation-note">La propuesta sólo considera las entregas iniciales completadas consecutivamente. Hasta que elijas, los enlaces incluyen el recorrido entero. Los puntos completados después de una entrega pendiente se conservan en orden.</p>
      {!!review.plan.pending.filter(sequence => sequence <= startIndex).length && <p role="alert">Hay {review.plan.pending.filter(sequence => sequence <= startIndex).length} puntos pendientes hasta el origen elegido. Revisa «Retomar desde» para no dejarlos atrás.</p>}
    </section>}
    {route && truck && <div className="google-guide-option"><label><input type="checkbox" checked={includeGuides && Boolean(guidePlan.points)} disabled={!guidePlan.points} onChange={event=>setIncludeGuides(event.target.checked)}/><span><b>Añadir puntos guía del recorrido</b><small>{guidePlan.points ? `${includeGuides ? guideCount : guidePlan.guideCount} puntos sobre el trazado, además de tus entregas.` : guidePlan.error}</small></span></label><p className="navigation-note">Estos puntos orientan la ruta que calcula Google. No la bloquean ni verifican legalidad; Google puede desviarse entre ellos y pedir continuar al llegar a cada guía.</p></div>}
    <div className="navigation-heading"><strong>Continuar en Google Maps</strong><span>{segments.length === 1 ? startIndex ? 'Puntos desde la selección en un enlace' : 'Todos los puntos en un enlace' : `${segments.length} tramos · orden completo desde ${deliveryPointLabel(startIndex, points.length).toLowerCase()}`}</span></div>
    {canResume && <div className="navigation-continuation"><label>Retomar desde<select aria-label="Retomar desde" value={startIndex} onChange={event => resume(Number(event.target.value))}>{points.slice(0, -1).map((point, index) => <option key={index} value={index}>{deliveryPointLabel(index, points.length)} · {typeof point === 'string' ? point : point?.label || (point ? `${point.lat}, ${point.lng}` : 'Punto por confirmar')}</option>)}</select></label>
      <p className="navigation-note">El punto elegido será el origen de Google Maps. Se conservan todos los puntos posteriores en orden. Esta selección temporal no marca entregas como realizadas ni modifica la ruta guardada.</p>
      {startIndex > 0 && <><p role="status">Desde {deliveryPointLabel(startIndex, points.length).toLowerCase()} hasta destino · {points.length - startIndex} puntos del recorrido, además de los guías habilitados.</p><button type="button" className="text-button" onClick={() => setContinuation(null)}>Volver al origen del recorrido</button></>}
    </div>}
    <label className="navigation-limit">Paradas intermedias por enlace<select aria-label="Paradas intermedias por enlace" value={limit} onChange={event => {
      const next = event.target.value === '3' ? 3 : 9; setLimit(next);
      try { window.localStorage.setItem('route-planner:google-waypoints', String(next)); } catch {}
    }}><option value="9">Máximo de Google Maps · 9</option><option value="3">Navegador móvil · 3</option></select></label>
    <p className="navigation-note">{limit === 9 ? 'Para abrir en la app de Google Maps o en computadora. Si abre en el navegador del celular, elige 3 para conservar las paradas.' : 'Compatible con navegador móvil. Se incluyen todas las paradas repartidas en enlaces consecutivos.'}</p>
    {(avoidTolls || avoidHighways) && <p className="navigation-note"><strong>{roadPreferencesLabel(selectedPreferences)}.</strong> Se solicita en todos los tramos. Google decide el trazado y puede conservar vías que prefieres evitar; revisa sus opciones antes de iniciar.</p>}
    <ol className="navigation-segments">{segments.map((segment, index) => <li key={segment.url}>
      <a className="secondary-button" href={segment.url} target="_blank" rel="noreferrer">{segments.length > 1 ? `Abrir tramo ${index + 1} de ${segments.length} en Google Maps ↗` : 'Abrir puntos en Google Maps ↗'}</a>
      {segments.length > 1 && <small>{segment.startLabel} → {segment.endLabel}</small>}
    </li>)}</ol>
    {segments.length > 1 && <p className="navigation-note">Abre los tramos en orden. Cada uno comienza en el último punto del anterior; ninguna parada se descarta.</p>}
    {truck && <p className="navigation-note"><strong>No se transfiere la ruta exacta del camión.</strong> Google Maps recalcula entre estos puntos y puede elegir otras calles. El enlace no transmite peso, dimensiones ni permisos municipales. Los puntos intermedios tampoco garantizan conservar el trazado. Consulta el recorrido original de Route Planner y verifica señalización y autorizaciones.</p>}
  </div>;
}
