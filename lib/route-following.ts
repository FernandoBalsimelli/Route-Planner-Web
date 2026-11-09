import { decodePolyline } from './polyline';
import type { RouteResult } from './routes';
export type Fix = { lat:number; lng:number; accuracy:number; timestamp:number; speed?:number|null };
export type Track = { points:Array<[number,number]>; cumulative:number[]; total:number };
export type Progress = { segment:number; along:number; remaining:number; distance:number; accuracy:number; timestamp:number; status:'on_route'|'off_route'|'poor_accuracy'|'arrived'; instruction?:string; maneuverDistance?:number; actionIndex?:number };
const R=6371000,RAD=Math.PI/180;
function longitudeDelta(value:number){return ((value+540)%360)-180;}
export function meters(a:[number,number],b:[number,number]){
 const h=Math.sin((b[0]-a[0])*RAD/2)**2+Math.cos(a[0]*RAD)*Math.cos(b[0]*RAD)*Math.sin(longitudeDelta(b[1]-a[1])*RAD/2)**2;
 return 2*R*Math.asin(Math.sqrt(Math.min(1,h)));
}
export function prepareTrack(polyline?:string):Track|null{
 if(!polyline||polyline.length>2000000)return null;
 const points=decodePolyline(polyline),cumulative=[0];
 if(points.length<2||points.length>200000)return null;
 for(let i=1;i<points.length;i++)cumulative.push(cumulative[i-1]+meters(points[i-1],points[i]));
 const total=cumulative[cumulative.length-1];return total>0?{points,cumulative,total}:null;
}
function indexAt(values:number[],value:number){let low=0,high=values.length-1;while(low<high){const mid=Math.floor((low+high)/2);if(values[mid]<value)low=mid+1;else high=mid;}return Math.max(0,low-1);}
export function followTrack(track:Track,fix:Fix,previous?:Progress|null,route?:RouteResult):Progress{
 if(![fix.lat,fix.lng,fix.accuracy,fix.timestamp].every(Number.isFinite)||Math.abs(fix.lat)>90||Math.abs(fix.lng)>180||fix.accuracy<0)throw new Error('GPS_INVALID');
 if(previous&&fix.timestamp<=previous.timestamp)return previous;
 if(fix.accuracy>80)return {segment:previous?.segment||0,along:previous?.along||0,remaining:previous?.remaining??track.total,distance:previous?.distance??Infinity,accuracy:fix.accuracy,timestamp:fix.timestamp,status:'poor_accuracy'};
 if(previous&&!Number.isFinite(previous.distance))previous=null;
 // Bound projection after the first fix: a nearby future bridge or loop must
 // not skip kilometres. No off-route fix changes the saved path or progress.
 const elapsed=previous?Math.max(0,(fix.timestamp-previous.timestamp)/1000):0;
 const jump=previous?Math.max(150,Math.min(1500,elapsed*45+fix.accuracy*2)):track.total;
 const start=previous?indexAt(track.cumulative,Math.max(0,previous.along-100)):0;
 const end=previous?Math.min(track.points.length-2,indexAt(track.cumulative,previous.along+jump)+1):track.points.length-2;
 const cos=Math.max(.01,Math.cos(fix.lat*RAD));let best={distance:Infinity,along:0,segment:0};
 for(let i=start;i<=end;i++){
  const a=track.points[i],b=track.points[i+1];
  const ax=longitudeDelta(a[1]-fix.lng)*RAD*R*cos,ay=(a[0]-fix.lat)*RAD*R;
  const dx=longitudeDelta(b[1]-a[1])*RAD*R*cos,dy=(b[0]-a[0])*RAD*R;
  const t=dx*dx+dy*dy?Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy))):0;
  const distance=Math.hypot(ax+t*dx,ay+t*dy),along=track.cumulative[i]+t*(track.cumulative[i+1]-track.cumulative[i]);
  if(previous&&along>previous.along+jump)continue;
  if(distance<best.distance-1||(Math.abs(distance-best.distance)<=1&&previous&&Math.abs(along-previous.along)<Math.abs(best.along-previous.along)))best={distance,along,segment:i};
 }
 if(!Number.isFinite(best.distance))best={distance:meters([fix.lat,fix.lng],track.points[previous?.segment||0]),along:previous?.along||0,segment:previous?.segment||0};
 const off=best.distance>Math.max(35,fix.accuracy*1.5);
 const along=off?(previous?.along??0):Math.max(previous?.along??0,best.along),remaining=Math.max(0,track.total-along);
 const arrived=!off&&remaining<25&&meters([fix.lat,fix.lng],track.points.at(-1)!)<Math.max(25,fix.accuracy);
 const progress:Progress={segment:off?(previous?.segment??best.segment):best.segment,along,remaining,distance:best.distance,accuracy:fix.accuracy,timestamp:fix.timestamp,status:off?'off_route':arrived?'arrived':'on_route'};
 if(!off&&!arrived&&route){
  const actions=route.sections.flatMap(section=>section.actions||[]);
  const index=actions.findIndex(action=>Number.isInteger(action.geometryStart)&&action.geometryStart!>=0&&action.geometryStart!<track.points.length&&track.cumulative[action.geometryStart!]>=along-5);
  if(index>=0){const action=actions[index];progress.instruction=action.instruction;progress.maneuverDistance=Math.max(0,track.cumulative[action.geometryStart!]-along);progress.actionIndex=index;}
 }
 return progress;
}
