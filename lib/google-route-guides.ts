import type { RouteResult } from './routes';
import { prepareTrack } from './route-following';
import type { Coordinates } from './locations';

export type GoogleGuidePoint = Coordinates & { navigationLabel: string };
// These anchors influence Google's recalculation; they do not transfer a route
// token, restrictions, or a promise that Google will follow the same roads.
export function googleRouteGuides(route: RouteResult): { points: GoogleGuidePoint[]; guideCount: number } {
  const track = prepareTrack(route.polyline), stops = route.waypoints || [];
  if (!track || stops.length < 2) throw new Error('No hay un trazado completo para preparar puntos guía. Vuelve a calcular la ruta.');
  const indexes = stops.map(point => point.geometryIndex);
  if (!indexes.every((value,index) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value < track.points.length && (!index || value >= indexes[index-1]!))) throw new Error('Esta ruta no incluye la posición de cada entrega en el trazado. Recalcula para preparar puntos guía sin confundir cruces o calles paralelas.');
  const positions = indexes.map(index => track.cumulative[index!]);
  const maneuvers = route.sections.flatMap(section => section.actions || []).flatMap(action => Number.isSafeInteger(action.geometryStart) && action.geometryStart! >= 0 && action.geometryStart! < track.points.length ? [track.cumulative[action.geometryStart!]] : []);
  const at = (distance: number): Coordinates => {
    let left = 0, right = track.points.length-1;
    while (left < right) { const mid = Math.floor((left+right)/2); if (track.cumulative[mid] < distance) left=mid+1; else right=mid; }
    const end=left, start=Math.max(0,end-1), span=track.cumulative[end]-track.cumulative[start], ratio=span ? (distance-track.cumulative[start])/span : 0;
    const a=track.points[start], b=track.points[end];
    return {lat:a[0]+(b[0]-a[0])*ratio,lng:((a[1]+(((b[1]-a[1]+540)%360)-180)*ratio+540)%360)-180};
  };
  const points: GoogleGuidePoint[] = [];
  let guideCount=0;
  for(let leg=0;leg<stops.length-1;leg++) {
    const start=positions[leg], end=positions[leg+1];
    if(!leg) points.push({...stops[0],navigationLabel:'Origen'});
    const anchors = new Set<number>();
    // A point after each maneuver favours the chosen exit instead of a stop
    // exactly in an intersection. Spacing also guides long uninterrupted legs.
    for(const distance of maneuvers) if(distance>start+15 && distance+25<end-15) anchors.add(distance+25);
    for(let distance=start+1500;distance<end-30;distance+=1500) anchors.add(distance);
    let previous=start;
    for(const distance of [...anchors].sort((a,b)=>a-b)) {
      if(distance-previous<20) continue;
      if(guideCount>=5000) throw new Error('Este recorrido requiere demasiados puntos guía para revisarlo con comodidad. Divide el recorrido antes de abrirlo en Google Maps.');
      points.push({...at(distance),navigationLabel:`Guía ${++guideCount}`}); previous=distance;
    }
    points.push({...stops[leg+1],navigationLabel:leg+1===stops.length-1?'Destino':`Entrega ${leg+1}`});
  }
  return {points,guideCount};
}
