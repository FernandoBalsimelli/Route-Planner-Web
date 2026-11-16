import React from 'react';
import type { ParkingPublicationReview } from '@/lib/parking-corridors';
const date = (value: string) => value.split('-').reverse().join('/');
export default function MunicipalPublicationHistory({ review }: { review: ParkingPublicationReview }) {
  return <details className="publication-history">
    <summary>Publicación y cambios revisados</summary>
    <p>Revisión documental {date(review.reviewedAt)}. Fechas históricas corroboradas; no acreditan vigencia actual ni permiso para tu camión.</p>
    {review.notices.map(notice => <p className="hint" key={notice}>{notice}</p>)}
    <ol aria-label="Historial documental del estacionamiento">{review.records.map(record => <li key={record.id}>
      <h4>{record.resolution} · {record.title}</h4>
      <p>{record.description}</p><p><b>Ámbito:</b> {record.scope}</p>
      <dl className="municipal-source-details">
        <div><dt>Aprobación</dt><dd>{date(record.approvedAt)}</dd></div>
        <div><dt>Publicación municipal corroborada</dt><dd>{date(record.publishedAt)}</dd></div>
        <div><dt>{record.sanctions.label}</dt><dd>{date(record.sanctions.fromDate)}{record.sanctions.status === 'superseded' ? ` · sustituida por ${record.sanctions.supersededBy || 'disposición posterior'}` : ' · no es una comprobación de vigencia actual'}</dd></div>
      </dl>
      <div className="publication-links">{review.sources.filter(source => record.sourceIds.includes(source.id)).map(source => <a key={source.id} href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a>)}</div>
    </li>)}</ol>
  </details>;
}
