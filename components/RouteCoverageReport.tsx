'use client';
import React from 'react';
import type {RegulatoryCoverage} from '@/lib/routes';

export default function RouteCoverageReport({coverage,onOpenGuide}:{coverage?:RegulatoryCoverage;onOpenGuide:()=>void}){
 if(!coverage)return <section className="route-coverage-report"><h2>Jurisdicciones del recorrido</h2><p className="coverage-status">Esta ruta no incluye un diagnóstico municipal. Vuelve a calcularla antes de salir.</p></section>;
 const municipalities=coverage.municipalitiesIdentified||[];
 return <section className="route-coverage-report" aria-label="Jurisdicciones municipales del recorrido">
  <div className="route-coverage-heading"><div><p className="eyebrow">COBERTURA MUNICIPAL</p><h2>Jurisdicciones del recorrido</h2></div><button type="button" className="text-button" onClick={onOpenGuide}>Ver fuentes y reglas ↗</button></div>
  <p className="coverage-status">{coverage.message}</p>
  {municipalities.length>0?<ol className="route-municipalities">{municipalities.map(item=><li key={item.id}><span className="municipality-sequence">{item.sequence}</span><span><strong>{item.name}</strong><small>{item.state} · INEGI {item.id}</small></span><em className={item.coverage==='reference_only'?'has-reference':'rules-missing'}>{item.coverage==='reference_only'?'Referencia cargada':'Reglas pendientes'}</em></li>)}</ol>:<p className="navigation-note">No se encontró una intersección municipal mexicana. Puede ser una ruta fuera de México, una geometría antigua o un límite no resuelto; no se interpreta como circulación libre.</p>}
  <p className="route-coverage-limit">Los límites están simplificados para identificar jurisdicciones, con tolerancia aproximada de hasta {Math.round((coverage.boundaryToleranceDegrees||0.0005)*111_000)} m. Ninguna regla municipal se aplica todavía al motor; confirma señalización, permisos, horarios y acceso de descarga.</p>
 </section>;
}
