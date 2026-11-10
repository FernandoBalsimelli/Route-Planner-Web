'use client';
import React,{useEffect,useState} from 'react';
type DocumentEvidence={url:string|null;kind:'primary'|'related'|'script';status:string;changeDetected?:boolean;stale?:boolean;checkedAt:string|null;lastSuccessAt:string|null;error:string|null};
type Source={id:string;title:string;url:string;scope:string;reviewedAt:string;legalReview:string;status:string;checkedAt:string|null;lastSuccessAt:string|null;error:string|null;stale?:boolean;availability?:string;changeDetected?:boolean;relatedSetChanged?:boolean;documents?:DocumentEvidence[];documentBreakdownAvailable?:boolean};
type Report={checkedAt:string|null;stale:boolean;intervalHours:number;notice:string;sources:Source[]};
const statusLabels:Record<string,string>={unchanged:'Documento sin cambios detectados',changed:'Cambio detectado · requiere revisión',unreviewed:'Disponible · vigencia pendiente de revisión',unavailable:'No se pudo comprobar la fuente',not_checked:'Sin comprobación técnica todavía'};
const documentNames={primary:'Documento principal',related:'Página o documento vinculado',script:'Aplicación del portal'};
function date(value:string|null){return value?new Date(value).toLocaleString('es-MX'):'Pendiente';}
export default function OfficialSourceMonitor({sourceId}:{sourceId?:string}){
 const [report,setReport]=useState<Report|null>(null),[error,setError]=useState('');
 useEffect(()=>{const controller=new AbortController();void fetch('/api/route-planner/v1/regulations/source-status',{signal:controller.signal}).then(async response=>{const payload=await response.json();if(!response.ok||!Array.isArray(payload.sources)||typeof payload.intervalHours!=='number'||typeof payload.stale!=='boolean'||payload.sources.some((source:Source)=>!source||typeof source.id!=='string'||typeof source.title!=='string'))throw Error('No se pudo consultar el seguimiento de fuentes.');if(!controller.signal.aborted)setReport(payload);}).catch(()=>{if(!controller.signal.aborted)setError('Seguimiento temporalmente no disponible; revisa directamente la fuente oficial.');});return()=>controller.abort();},[]);
 const selected=report?.sources.filter(source=>!sourceId||source.id===sourceId)||[];
 const alerts:string[]=[];
 if(report){
  if(report.stale||selected.some(source=>source.stale))alerts.push('Reporte atrasado o sin comprobar · revisa las fuentes manualmente');
  if(selected.some(source=>source.changeDetected||source.status==='changed'))alerts.push('Cambio detectado · requiere revisar el documento');
  if(selected.some(source=>source.status==='unavailable'))alerts.push('Hay fuentes que no se pudieron comprobar');
  if(!alerts.length)alerts.push(selected.some(source=>['unreviewed','not_checked'].includes(source.status))||!selected.length?'La revisión de fuentes sigue pendiente':'Sin cambios técnicos detectados; vigencia legal sin certificar');
 }
 return <div className="official-source-monitor">{alerts.map(alert=><p key={alert} className="source-monitor-alert" role="status">{alert}</p>)}{error&&<p role="status">{error}</p>}<details><summary>Seguimiento de fuentes oficiales</summary>
  {!report&&!error&&<p role="status">Consultando comprobaciones de documentos…</p>}
  {report&&<><p className="hint">Comprobación programada cada {report.intervalHours} horas; GitHub puede retrasar su ejecución. Última ejecución: {date(report.checkedAt)}.{report.stale?' El reporte está pendiente o tiene más de 18 horas.':''}</p><p className="coverage-status">{report.notice}</p>
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
