'use client';
import React, { useState } from 'react';
import { routeCsv, routeGeoJson, routeGpx } from '@/lib/route-exports';
import type { RouteResult } from '@/lib/routes';
export default function RouteExports({ route, truck }: { route: RouteResult; truck: boolean }) {
  const [message, setMessage] = useState('');
  function download(format: 'csv' | 'gpx' | 'geojson') {
    try {
      const content = format === 'csv' ? routeCsv(route) : format === 'gpx' ? routeGpx(route, truck) : routeGeoJson(route, truck);
      const blob = new Blob([content], { type: format === 'csv' ? 'text/csv;charset=utf-8' : format === 'gpx' ? 'application/gpx+xml;charset=utf-8' : 'application/geo+json;charset=utf-8' });
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = `route-planner-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000);
      setMessage(`Archivo ${format.toUpperCase()} preparado para descargar.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo preparar el archivo.'); }
  }
  return <div className="route-exports"><strong>Exportar recorrido</strong><div>{(['csv', 'gpx', 'geojson'] as const).map(format => <button type="button" key={format} onClick={() => download(format)} aria-label={`Descargar ruta en ${format.toUpperCase()}`}>{format.toUpperCase()}</button>)}</div><small>CSV: lista de entregas. GPX y GeoJSON: puntos y trazado disponible.{truck ? ' Las restricciones del camión no se transfieren al abrir estos archivos en otra aplicación.' : ''}</small>{message && <p role="status">{message}</p>}</div>;
}
