'use client';
import React, { useMemo, useState } from 'react';
import { citedParkingHours, filterParkingCorridors, type ParkingCorridorReference } from '@/lib/parking-corridors';
import MunicipalPublicationHistory from './MunicipalPublicationHistory';
const date = (value: string) => value.split('-').reverse().join('/');
const dayLabel = (days: number[]) => days.join(',') === '1,2,3,4,5' ? 'Lunes a viernes' : days.join(',') === '6' ? 'Sábado' : days.join(',') === '7' ? 'Domingo' : 'Días por comprobar';
export default function MunicipalParkingCorridors({ reference }: { reference: ParkingCorridorReference }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [polygon, setPolygon] = useState('');
  const polygons = useMemo(() => [...new Set(reference.rows.map(row => row.polygon))].sort((a, b) => a.localeCompare(b, 'es', { numeric: true })), [reference.rows]);
  const rows = useMemo(() => filterParkingCorridors(reference.rows, query, polygon), [reference.rows, query, polygon]);
  return <details className="parking-corridors" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>{reference.rows.length} registros de corredores · estacionamiento rotativo</summary>
    {open && <>
      <p className="coverage-status">Horarios citados de operación del estacionamiento. Consulta por separado las maniobras de carga y sus permisos. Esta lista no acredita circulación ni estacionamiento autorizado para tu camión.</p>
      <p>Acta {date(reference.source.approvedAt)} · consulta del anexo {date(reference.source.consultedAt)} · {reference.timezone}. {reference.publicationReview?.publication.status === 'corroborated_in_official_gazette' ? `Publicación histórica de la reforma corroborada: ${date(reference.publicationReview.publication.date)}. Publicación íntegra de las reglas/anexo, vigencia posterior y geometrías pendientes de verificar.` : 'Publicación, vigencia posterior y geometrías pendientes de verificar.'}</p>
      {reference.publicationReview && <MunicipalPublicationHistory review={reference.publicationReview}/>}
      {reference.notices.slice(2).map(notice => <p className="hint" key={notice}>{notice}</p>)}
      <div className="municipal-selectors">
        <label>Buscar corredor o cruce<input type="search" value={query} maxLength={160} onChange={event => setQuery(event.target.value)} placeholder="Calle, cruce o polígono"/></label>
        <label>Polígono citado<select aria-label="Polígono citado" value={polygon} onChange={event => setPolygon(event.target.value)}><option value="">Todos los polígonos citados</option>{polygons.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
      </div>
      <p role="status">{rows.length} de {reference.rows.length} registros del anexo. Se conserva el orden y las repeticiones de la fuente.</p>
      {rows.length ? <ol className="parking-corridors-list" aria-label="Corredores del anexo de estacionamiento">{rows.map(row => <li key={row.sourceRow} aria-label={`Registro ${row.sourceRow}: ${row.corridor}`}>
        <div><strong>{row.corridor}</strong><p>{row.polygon} · registro {row.sourceRow}</p><p><b>Entre calles:</b> {row.betweenStreets}</p><small>Sentido de circulación sin especificar en este anexo. Geometría sin validar.</small></div>
        <div><dl>{row.schedules.map((schedule, index) => <div key={index}><dt>{dayLabel(schedule.days)}</dt><dd>{citedParkingHours(schedule)}</dd></div>)}</dl><p>{row.sourcePages.map(page => <a key={page} href={`${reference.source.url}#page=${page}`} target="_blank" rel="noreferrer">Pág. {page} ↗ </a>)}</p></div>
      </li>)}</ol> : <p>No hay coincidencias. Prueba con otra calle o cambia el polígono.</p>}
    </>}
  </details>;
}
