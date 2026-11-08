import React from 'react';

export default function NavigationLinks({ urls, truck = false }: { urls: string[]; truck?: boolean }) {
  if (!urls.length) return null;
  return <div className="navigation-links">
    {urls.length > 1 && <p className="navigation-note">Abre los tramos en orden. Cada enlace conserva hasta tres paradas intermedias para funcionar también en navegador móvil.</p>}
    {urls.map((url, index) => <a className="secondary-button" key={url} href={url} target="_blank" rel="noreferrer">{urls.length > 1 ? `Abrir tramo ${index + 1} de ${urls.length} en Google Maps ↗` : 'Abrir puntos en Google Maps ↗'}</a>)}
    {truck && <p className="navigation-note">Google Maps calcula su propio trayecto y este enlace no transmite las dimensiones ni el peso del camión. Conserva como referencia las restricciones del recorrido de Route Planner.</p>}
  </div>;
}
