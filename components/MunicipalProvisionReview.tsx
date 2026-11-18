import React from 'react';
import { parseProvisionReview } from '@/lib/provision-review';

export default function MunicipalProvisionReview({ review, municipalityId }: { review: unknown; municipalityId: string }) {
  const checked = parseProvisionReview(review, municipalityId);
  if (!checked) return <p className="hint">No se pudo verificar el contraste de esta referencia. Consulta su fuente original.</p>;
  const articles = checked.articles.map(article => article.number).join(', ');
  return <details className="provision-review">
    <summary>Contrastar esta referencia · artículos {articles}</summary>
    <p>Texto seleccionado coincidente entre acta y reglas adjuntas después de normalizar espacios y saltos de línea. Revisión {checked.reviewedAt.split('-').reverse().join('/')}.</p>
    <p><b>Ámbito del contraste:</b> {checked.scope}</p>
    <ul>{checked.documents.map(doc => <li key={doc.id}>{doc.pages.map(page => <a key={page} href={`${doc.url}#page=${page}`} target="_blank" rel="noreferrer">{doc.title} · pág. {page} ↗</a>)}</li>)}</ul>
    <p className="hint">{checked.normalization}</p>
    {checked.notices.map(notice => <p className="hint" key={notice}>{notice}</p>)}
    <p>No acredita permiso vigente, circulación, estacionamiento ni seguridad de la ruta. Las fichas y comparadores de las otras fuentes conservan su ámbito propio.</p>
  </details>;
}
