'use client';
import React,{useEffect,useRef,useState} from 'react';
import OfficialSourceMonitor from './OfficialSourceMonitor';
type Municipality={id:string;name:string;state:string;coverage:string;routingEnforced:boolean};
type Road={road:string;segment:string;page:number;annex:number};
type TimeRule=Road&{days:number[];start:string;end:string;maximumAxlesExempt:number|null;interpretation:string;interpretationNote:string};
type Rule={id:string;title:string;description:string;citation:string;page?:number;window?:{start:string;end:string;timezone:string;days:number[]|null;effect:string};vehicleConfigurations?:string[]};
type Reference={scope?:string;rules?:Rule[];relatedLinks?:Array<{title:string;url:string}>;name:string;status:string;routingEnforced:boolean;source:{id?:string;url:string;checkedAt:string;pages?:number[];legalReview?:string}|null;trunkSegments:Road[];timeRules:TimeRule[];notices:string[]};
export default function MunicipalCoverage({ requestedMunicipality }: { requestedMunicipality?: { id: string; request: number } }){
 const heading=useRef<HTMLHeadingElement>(null);
 const [open,setOpen]=useState(false),[states,setStates]=useState<Array<{id:string;name:string}>>([]),[municipalities,setMunicipalities]=useState<Municipality[]>([]),[state,setState]=useState(''),[municipality,setMunicipality]=useState(''),[reference,setReference]=useState<Reference|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false),[total,setTotal]=useState(0),[partial,setPartial]=useState(0),[roadSearch,setRoadSearch]=useState('');
 useEffect(()=>{
  if(!requestedMunicipality || !/^\d{5}$/.test(requestedMunicipality.id))return;
  setState(requestedMunicipality.id.slice(0,2));setMunicipality(requestedMunicipality.id);setReference(null);setOpen(true);
  heading.current?.focus({preventScroll:true});heading.current?.scrollIntoView?.({block:'start',behavior:'instant'});
 },[requestedMunicipality]);
 useEffect(()=>{
  if(!open)return;const controller=new AbortController();setError('');setMunicipalities([]);
  void fetch('/api/route-planner/v1/regulations/municipalities?'+new URLSearchParams({state,limit:state?'600':'1'}),{signal:controller.signal}).then(async response=>{const payload=await response.json();if(!response.ok)throw new Error(payload.message||'No se pudo cargar el catálogo.');if(!controller.signal.aborted){setStates((payload.states||[]).sort((a:{name:string},b:{name:string})=>a.name.localeCompare(b.name,'es',{sensitivity:'base'})));setMunicipalities(state?(payload.municipalities||[]).sort((a:Municipality,b:Municipality)=>a.name.localeCompare(b.name,'es',{sensitivity:'base'})):[]);setTotal(payload.totalMunicipalities||0);setPartial(payload.municipalitiesWithPartialReference||0);}}).catch(error=>{if(!controller.signal.aborted)setError(error instanceof Error?error.message:'No se pudo consultar el catálogo.');});
  return()=>controller.abort();
 },[open,state]);
 useEffect(()=>{
  setReference(null);setRoadSearch('');setLoading(false);if(!open||!municipality)return;const controller=new AbortController();setLoading(true);setError('');
  void fetch('/api/route-planner/v1/regulations/municipalities/'+encodeURIComponent(municipality),{signal:controller.signal}).then(async response=>{const payload=await response.json();if(!response.ok)throw new Error(payload.message||'No se pudo cargar el municipio.');if(!controller.signal.aborted)setReference(payload);}).catch(error=>{if(!controller.signal.aborted)setError(error instanceof Error?error.message:'No se pudo consultar el municipio.');}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[open,municipality]);
 const normalized=roadSearch.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
 const matches=(row:Road)=>(row.road+' '+row.segment).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().includes(normalized);
 return <section className="municipal-coverage" aria-label="Cobertura municipal de México">
  <h2 ref={heading} tabIndex={-1}>Restricciones por municipio · México</h2><p>Consulta las fuentes y los tramos incorporados. Un municipio en el catálogo geográfico no equivale a cobertura legal verificada.</p>
  <button type="button" className="map-open-button" aria-expanded={open} onClick={()=>setOpen(value=>!value)}>{open?'Cerrar consulta municipal':'Consultar cobertura municipal'}</button>
  {open&&<><p className="coverage-status">{states.length||32} entidades · {total||'…'} municipios/demarcaciones en el catálogo INEGI. Ningún municipio tiene todavía validación automática completa de rutas. {partial>0&&`${partial} municipios tienen referencias parciales; los demás siguen pendientes.`}</p>
   <div className="municipal-selectors"><label>Entidad federativa<select value={state} onChange={event=>{setState(event.target.value);setMunicipality('');setReference(null);}}><option value="">Elige una entidad</option>{states.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
   <label>Municipio o demarcación<select disabled={!state} value={municipality} onChange={event=>setMunicipality(event.target.value)}><option value="">Elige un municipio</option>{municipalities.map(item=><option key={item.id} value={item.id}>{item.name} · {item.coverage==='reference_only'?'referencia oficial cargada':'reglas pendientes'}</option>)}</select></label></div>
   {loading&&<p role="status">Consultando fuente municipal…</p>}{error&&<p role="alert">{error}</p>}
   {reference&&<div className="municipal-reference"><h3>{reference.name}</h3><p className="coverage-status">{reference.status==='reference_only'?'Referencia oficial consultable; no se aplica automáticamente al trazado.':'Reglas oficiales aún no incorporadas. No significa circulación libre.'}</p>
    {reference.scope&&<p><strong>Ámbito de la referencia:</strong> {reference.scope}</p>}
    {reference.source&&<p><a href={reference.source.url} target="_blank" rel="noreferrer">Abrir fuente oficial ↗</a> · revisada {new Date(reference.source.checkedAt).toLocaleDateString('es-MX')}</p>}
    {reference.relatedLinks?.map(link=><p key={link.url}><a href={link.url} target="_blank" rel="noreferrer">{link.title} ↗</a></p>)}
    {reference.notices.map((notice,index)=><p className="hint" key={index}>{notice}</p>)}
    {!!reference.rules?.length&&<div className="municipal-time-rules">{reference.rules.map(rule=><article key={rule.id}><strong>{rule.title}</strong><p>{rule.description}</p>{rule.window&&<p className="hint">{rule.window.start}–{rule.window.end} · {rule.window.timezone} · {rule.window.days?'días según fuente':'días y excepciones por comprobar'}</p>}{rule.vehicleConfigurations&&<p className="hint">Configuraciones: {rule.vehicleConfigurations.join(', ')}</p>}<p className="hint">{rule.citation} · aplicación automática pendiente</p>{rule.page&&reference.source&&<a href={`${reference.source.url}#page=${rule.page}`} target="_blank" rel="noreferrer">Consultar página {rule.page} ↗</a>}</article>)}</div>}
    {!!reference.trunkSegments.length&&<><label>Buscar vialidad o tramo<input type="search" value={roadSearch} onChange={event=>setRoadSearch(event.target.value)} placeholder="Nombre de calle, avenida o tramo"/></label>
     <details><summary>{reference.trunkSegments.length} {reference.source?.id==='monterrey-transito'?'tramos de red troncal · Anexo 1':'vialidades citadas en la fuente'}</summary><div className="municipal-table"><table><thead><tr><th>Vialidad</th><th>Tramo y sentido de la fuente</th></tr></thead><tbody>{reference.trunkSegments.filter(matches).map((row,index)=><tr key={index}><td>{row.road}</td><td>{row.segment} <a href={`${reference.source?.url}#page=${row.page}`} target="_blank" rel="noreferrer">Pág. {row.page} ↗</a></td></tr>)}</tbody></table></div></details>
     {!!reference.timeRules.length&&<details><summary>{reference.timeRules.length} registros de horarios · Anexos 2 y 3</summary><div className="municipal-time-rules">{reference.timeRules.filter(matches).map((rule,index)=><article key={index}><strong>{rule.road} · {rule.start}–{rule.end}</strong><p>{rule.days.includes(1)?'Lunes a viernes':'Sábado y domingo'} · hora de Monterrey</p><p>{rule.segment}</p><p className="hint">{rule.interpretationNote}</p><a href={`${reference.source?.url}#page=${rule.page}`} target="_blank" rel="noreferrer">Fuente, pág. {rule.page} ↗</a></article>)}</div></details>}
    </>}
   </div>}
   {(!municipality||reference?.source)?<OfficialSourceMonitor key={municipality||'all'} sourceId={reference?.source?.id}/>:reference&&<p className="coverage-status">No hay una fuente incorporada para este municipio; consulta a la autoridad correspondiente antes de circular.</p>}
   <p className="hint">Catálogo geográfico: <a href="https://www.inegi.org.mx/servicios/catalogounico/" target="_blank" rel="noreferrer">INEGI ↗</a>. Las reglas de tránsito se comprueban por separado con cada autoridad. Fuera de México no hay catálogo incorporado.</p>
  </>}
 </section>;
}
