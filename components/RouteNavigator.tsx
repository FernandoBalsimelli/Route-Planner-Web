'use client';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import type {RouteResult} from '@/lib/routes';
import type {Coordinates} from '@/lib/locations';
import {followTrack,prepareTrack,type Progress} from '@/lib/route-following';
function distance(value:number){return value>=1000?`${(value/1000).toFixed(1)} km`:`${Math.round(value)} m`;}
export default function RouteNavigator({route,truck,onPosition,onFollow,active=true}:{active?:boolean;route:RouteResult;truck:boolean;onPosition:(point:Coordinates|null)=>void;onFollow:(value:boolean)=>void}){
 const track=useMemo(()=>prepareTrack(route.polyline),[route.polyline]);
 const [running,setRunning]=useState(false),[voice,setVoice]=useState(false),[follow,setFollow]=useState(true),[ack,setAck]=useState(false),[progress,setProgress]=useState<Progress|null>(null),[message,setMessage]=useState('');
 const previous=useRef<Progress|null>(null),speechKey=useRef(''),sessionRoute=useRef<RouteResult|null>(null);
 const positionCallback=useRef(onPosition);positionCallback.current=onPosition;
 const followCallback=useRef(onFollow);followCallback.current=onFollow;
 useEffect(()=>{followCallback.current(running&&follow);},[running,follow]);
 useEffect(()=>{
  if(!running||!track)return;
  if(!active||sessionRoute.current!==route){setRunning(false);setAck(false);setProgress(null);setMessage('Navegación detenida al cambiar el recorrido o la sección.');return;}
  let watcher:number|undefined,alive=true,generation=0,lastFixAt=0,wake:WakeLockSentinel|undefined;
  const clear=()=>{if(watcher!==undefined){navigator.geolocation.clearWatch(watcher);watcher=undefined;}void wake?.release();wake=undefined;};
  const begin=()=>{
   if(!alive)return;clear();lastFixAt=0;positionCallback.current(null);const current=++generation;
   if(document.visibilityState==='hidden'){window.speechSynthesis?.cancel();setProgress(null);setMessage('Navegación en pausa: vuelve a la app para recibir ubicación e indicaciones.');return;}
   setProgress(null);setMessage('Esperando señal GPS…');
   watcher=navigator.geolocation.watchPosition(fix=>{
    if(!alive||current!==generation||document.visibilityState==='hidden')return;
    try{
     if(Date.now()-fix.timestamp>20000){setProgress(null);positionCallback.current(null);setMessage('La posición recibida es antigua. Esperando una lectura reciente.');return;}
     const next=followTrack(track,{lat:fix.coords.latitude,lng:fix.coords.longitude,accuracy:fix.coords.accuracy,timestamp:fix.timestamp,speed:fix.coords.speed},previous.current,route);
     if(next.timestamp!==fix.timestamp)return;
     previous.current=next;lastFixAt=fix.timestamp;setProgress(next);
     positionCallback.current(next.status==='poor_accuracy'?null:{lat:fix.coords.latitude,lng:fix.coords.longitude});
     setMessage(next.status==='poor_accuracy'?'Señal GPS imprecisa. No avanzamos las indicaciones con esta lectura.':next.status==='off_route'?'Estás fuera del trazado o aún lejos del inicio. No recalculamos ni recomendamos un giro para regresar: detente en un lugar permitido y revisa el recorrido.':next.status==='arrived'?'Llegaste al punto final del trazado. Verifica el acceso de descarga.':'Siguiendo el trazado calculado.');
    }catch{setProgress(null);positionCallback.current(null);setMessage('La lectura GPS no es válida. Esperando una nueva posición.');}
   },error=>{if(alive&&current===generation){lastFixAt=0;setProgress(null);positionCallback.current(null);setMessage(error.code===1?'Permiso de ubicación denegado. Habilítalo para esta app o detén la navegación.':error.code===3?'No llegó una posición a tiempo. Esperando señal GPS…':'GPS no disponible. Revisa la señal; el trazado se conserva.');}},{enableHighAccuracy:true,maximumAge:1000,timeout:15000});
   if(navigator.wakeLock)void navigator.wakeLock.request('screen').then(value=>{if(!alive||current!==generation||document.visibilityState==='hidden')void value.release();else wake=value;}).catch(()=>{});
  };
  begin();document.addEventListener('visibilitychange',begin);
  const freshness=window.setInterval(()=>{if(lastFixAt&&Date.now()-lastFixAt>20000&&document.visibilityState==='visible'){lastFixAt=0;setProgress(null);positionCallback.current(null);setMessage('Se perdió la actualización GPS. Esperando una posición reciente; el trazado se conserva.');}},5000);
  return()=>{alive=false;generation++;window.clearInterval(freshness);clear();document.removeEventListener('visibilitychange',begin);window.speechSynthesis?.cancel();positionCallback.current(null);followCallback.current(false);};
 },[running,track,route,active]);
 useEffect(()=>{
  if(!progress||progress.status!=='on_route')window.speechSynthesis?.cancel();
  if(!running||!voice||!progress||progress.status!=='on_route'||!progress.instruction||!window.speechSynthesis)return;
  const key=`${progress.actionIndex}-${(progress.maneuverDistance??Infinity)<150?'near':'ahead'}`;
  if(key===speechKey.current)return;speechKey.current=key;
  const utterance=new SpeechSynthesisUtterance(`${progress.maneuverDistance!=null?`En ${distance(progress.maneuverDistance)}, `:''}${progress.instruction}`);utterance.lang='es-MX';window.speechSynthesis.cancel();window.speechSynthesis.speak(utterance);
 },[running,voice,progress]);
 useEffect(()=>{if(!voice)window.speechSynthesis?.cancel();},[voice]);
 if(!track)return <p className="navigation-note">Esta ruta no tiene un trazado válido para navegación interna. Vuelve a calcularla; no inventaremos una línea entre las entregas.</p>;
 return <section className="route-navigator" aria-label="Navegación sobre el trazado">
  <h2>Navegar esta ruta</h2><p>Conserva el camino calculado, muestra tu GPS y avisa si te separas. No recalcula automáticamente.</p>{truck&&<p className="coverage-status">{route.regulatoryCoverage?.message||'Este trazado no tiene validación municipal completa. Revisa permisos, horarios y accesos antes de salir.'}</p>}
  {!running&&<><p className="navigation-note">Mantén esta app abierta y visible. El navegador puede suspender GPS o voz al bloquear la pantalla; intentaremos mantenerla encendida. Requiere conexión para cargar mapas.</p>{truck&&<label className="navigation-consent"><input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)}/>Revisé los accesos y permisos de esta ruta. La cobertura municipal todavía es incompleta.</label>}</>}
  <div className="navigator-controls"><button type="button" className="primary-button" disabled={!running&&truck&&!ack} onClick={()=>{
   if(running){setRunning(false);setMessage('Navegación detenida.');return;}
   if(!window.isSecureContext||!navigator.geolocation){setMessage('Se requiere HTTPS y ubicación disponible en el navegador.');return;}
   sessionRoute.current=route;previous.current=null;speechKey.current='';setProgress(null);setRunning(true);
  }}>{running?'Detener navegación':'Iniciar navegación en la app'}</button>
  <label><input type="checkbox" checked={voice} onChange={e=>setVoice(e.target.checked)}/>Indicaciones por voz</label>
  {running&&<button type="button" className="map-open-button" onClick={()=>{previous.current=null;speechKey.current='';setProgress(null);setMessage('Esperando una posición para reubicar el avance sobre el mismo trazado.');}}>Reubicar mi avance</button>}
  {running&&<label><input type="checkbox" checked={follow} onChange={e=>setFollow(e.target.checked)}/>Seguir mi posición en el mapa</label>}</div>
  {message&&<p role="status" className={`navigation-status ${progress?.status==='off_route'?'off-route':''}`}>{message}</p>}
  {running&&progress&&<><div className="navigator-metrics"><strong>{distance(progress.remaining)} <small>de trazado pendiente</small></strong><span>GPS ±{Math.ceil(progress.accuracy)} m</span></div>{progress.status==='on_route'&&<p className="next-maneuver">{progress.instruction?<>{progress.maneuverDistance!=null&&<b>{distance(progress.maneuverDistance)} · </b>}{progress.instruction}</>:'Sigue el trazado resaltado. Esta ruta guardada no tiene indicaciones vinculadas al mapa; vuelve a calcularla para obtenerlas.'}</p>}</>}
 </section>;
}
