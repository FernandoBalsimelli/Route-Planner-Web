'use client';
import React,{useEffect,useState} from 'react';
import {sourceReportRefresh} from '@/lib/source-report-refresh';
type DocumentEvidence={url:string|null;kind:'primary'|'related'|'script';status:string;changeDetected?:boolean;stale?:boolean;checkedAt:string|null;lastSuccessAt:string|null;error:string|null};
type Source={id:string;title:string;url:string;scope:string;reviewedAt:string;legalReview:string;status:string;checkedAt:string|null;lastSuccessAt:string|null;error:string|null;stale?:boolean;overdue?:boolean;availability?:string;changeDetected?:boolean;relatedSetChanged?:boolean;documents?:DocumentEvidence[];documentBreakdownAvailable?:boolean};
type Report={checkedAt:string|null;stale:boolean;overdue?:boolean;intervalHours:number;notice:string;sources:Source[];reportRefresh?:unknown};
const statusLabels:Record<string,string>={unchanged:'Documento sin cambios detectados',changed:'Cambio detectado · requiere revisión',unreviewed:'Disponible · vigencia pendiente de revisión',unavailable:'No se pudo comprobar la fuente',not_checked:'Sin comprobación técnica todavía'};
const documentNames={primary:'Documento principal',related:'Página o documento vinculado',script:'Aplicación del portal'};
function date(value:string|null){return value&&Number.isFinite(Date.parse(value))?new Date(value).toLocaleString('es-MX',{timeZoneName:'short'}):'Pendiente';}
export default function OfficialSourceMonitor({sourceId}:{sourceId?:string}){
 const [report,setReport]=useState<Report|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[consultation,setConsultation]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();setLoading(true);setError('');
  void fetch('/api/route-planner/v1/regulations/source-status',{signal:controller.signal}).then(async response=>{
   const payload=await response.json();
   if(!response.ok||!Array.isArray(payload.sources)||typeof payload.intervalHours!=='number'||typeof payload.stale!=='boolean'||payload.sources.some((source:Source)=>!source||typeof source.id!=='string'||typeof source.title!=='string'))throw Error('No se pudo consultar el seguimiento de fuentes.');
   if(!controller.signal.aborted)setReport(payload);
  }).catch(()=>{if(!controller.signal.aborted)setError('Seguimiento temporalmente no disponible; revisa directamente la fuente oficial.');}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[consultation]);
 const refresh=sourceReportRefresh(report?.reportRefresh);
 const olderReceived=refresh?.receivedCheckedAt&&report?.checkedAt&&Date.parse(refresh.receivedCheckedAt)<Date.parse(report.checkedAt);
 const selected=report?.sources.filter(source=>!sourceId||source.id===sourceId)||[];
 const alerts:string[]=[];
 if(report){
  if(refresh?.status==='unavailable')alerts.push('No se pudo actualizar el reporte de fuentes. Se conserva la comprobación anterior; revisa las fuentes oficiales.');
  if(report.stale||selected.some(source=>source.stale))alerts.push('Reporte atrasado o sin comprobar · revisa las fuentes manualmente');
  else if(report.overdue===true||selected.some(source=>source.overdue===true))alerts.push('No hay una comprobación dentro del intervalo previsto · revisa las fuentes manualmente');
  if(selected.some(source=>source.changeDetected||source.status==='changed'))alerts.push('Cambio detectado · requiere revisar el documento');
  if(selected.some(source=>source.status==='unavailable'))alerts.push('Hay fuentes que no se pudieron comprobar');
  if(!alerts.length)alerts.push(selected.some(source=>['unreviewed','not_checked'].includes(source.status))||!selected.length?'La revisión de fuentes sigue pendiente':'Sin cambios técnicos detectados; vigencia legal sin certificar');
 }
 return <div className="official-source-monitor" aria-busy={loading}>{alerts.map(alert=><p key={alert} className="source-monitor-alert" role="status">{alert}</p>)}{error&&<p role="status">{error}{report?' Se mantiene el último reporte mostrado; esta consulta no actualizó su comprobación.':''}</p>}
  <div className="source-monitor-actions"><button type="button" className="map-open-button" disabled={loading} onClick={()=>setConsultation(value=>value+1)}>Volver a consultar reporte</button>{loading&&<p className="hint" role="status">Consultando comprobaciones de documentos…</p>}</div>
  <details><summary>Seguimiento de fuentes oficiales</summary>
  {report&&<><p className="hint">Comprobación programada cada {report.intervalHours} horas; GitHub puede retrasar su ejecución. Última comprobación documental: {date(report.checkedAt)}.{report.stale?' El reporte está pendiente o tiene más de 18 horas.':''}</p>{report.overdue===true&&!report.stale&&<p className="hint">Se superó el intervalo previsto sin una nueva comprobación. Esto no identifica la causa ni acredita que los documentos sigan iguales o vigentes.</p>}<p className="coverage-status">{report.notice}</p>
  <p className="hint">Volver a consultar recupera el reporte disponible. No ejecuta una nueva comprobación de documentos ni una revisión legal.</p>
  {refresh&&<section className="source-report-retrieval" aria-label="Recuperación del reporte">
   <h4>Recuperación del reporte</h4><p>{refresh.status==='available'?'Se pudo recuperar el reporte remoto.':'La actualización remota falló; se conserva la evidencia anterior.'}</p>
   {refresh.reason&&<p>{refresh.reason}</p>}
   <dl className="municipal-source-details">
    <div><dt>Último intento de recuperación</dt><dd>{date(refresh.attemptedAt)}</dd></div>
    <div><dt>Última recuperación correcta</dt><dd>{date(refresh.lastSuccessAt)}</dd></div>
    <div><dt>Comprobación del último reporte recibido</dt><dd>{date(refresh.receivedCheckedAt)}</dd></div>
    <div><dt>Próxima recuperación disponible bajo demanda</dt><dd>{date(refresh.nextRefreshAt)}</dd></div>
   </dl>
   {olderReceived&&<p>El último reporte recibido era anterior a la evidencia conservada. Se muestra la comprobación más reciente disponible.</p>}
   <p className="hint">Las horas corresponden a este dispositivo. La próxima recuperación depende de una consulta al servicio; no es una hora de actualización garantizada.</p>
  </section>}
  {selected.toSorted((a,b)=>a.title.localeCompare(b.title,'es')).map(source=><article key={source.id}>
   <strong>{source.title}</strong><p>{source.availability==='partial'?'Comprobación parcial · algunos documentos no están disponibles':statusLabels[source.status]||statusLabels.not_checked}</p>
   <p className="hint">Comprobación: {date(source.checkedAt)} · última comprobación completa correcta: {date(source.lastSuccessAt)}</p>
   {source.error&&<p className="hint">Detalle técnico: {source.error}</p>}
   {source.relatedSetChanged&&<p className="hint">Cambió la lista de enlaces o el archivo de la aplicación del portal; no demuestra una reforma del reglamento.</p>}
   {source.documentBreakdownAvailable&&Array.isArray(source.documents)?<ol className="source-documents" aria-label={`Documentos comprobados de ${source.title}`}>{source.documents.map((document,index)=><li key={`${document.kind}-${document.url||index}`}>
    <b>{documentNames[document.kind]}</b><p>{statusLabels[document.status]||statusLabels.not_checked}</p>
    {document.changeDetected&&document.status!=='changed'&&<p>Cambio técnico de la última copia pendiente de revisión.</p>}
    {document.stale&&<p>Comprobación de este documento atrasada o pendiente.</p>}
    <p className="hint">Intento: {date(document.checkedAt)} · última descarga correcta: {date(document.lastSuccessAt)}</p>
    {document.error&&<p className="hint">{document.error}</p>}
    {document.url&&<a href={document.url} target="_blank" rel="noreferrer">Abrir {documentNames[document.kind].toLowerCase()} ↗</a>}
   </li>)}</ol>:<p className="hint">Esta comprobación anterior no incluye desglose por documento. Se mostrará cuando el monitor vuelva a consultar la fuente.</p>}
   <p className="hint">Los cambios de HTML pueden ser de formularios, navegación o publicaciones vinculadas. Requieren revisar el contenido; no prueban una reforma jurídica.</p>
   <p className="hint">{source.scope}</p><p className="hint">Revisión de contenido: {date(source.reviewedAt)}. {source.legalReview==='partial_consolidated'?'Revisión parcial de documento consolidado.':'Vigencia completa y excepciones sin certificar.'}</p>
   <a href={source.url} target="_blank" rel="noreferrer">Consultar documento oficial ↗</a>
  </article>)}</>}

 </details></div>;
}
