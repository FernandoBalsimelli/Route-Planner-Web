import React from 'react';
import type { ParkingAnnexComparison } from '@/lib/parking-corridors';

export default function MunicipalAnnexComparison({ comparison }: { comparison: ParkingAnnexComparison }) {
  return <details className="annex-comparison">
    <summary>Contraste de anexos · {comparison.matchedRows} registros</summary>
    <p>{comparison.scope}</p>
    <p>Revisión documental: {comparison.reviewedAt.split('-').reverse().join('/')}. Los campos comparados coinciden después de normalizar espacios y guiones; {comparison.extractedTextDifferenceCount} registros tienen diferencias tipográficas en el texto extraído. No significa que los PDF sean idénticos.</p>
    <ul>{comparison.documents.map(doc => <li key={doc.id}><a href={doc.url} target="_blank" rel="noreferrer">{doc.title} ↗</a><small>Páginas contrastadas: {doc.pages[0]}–{doc.pages.at(-1)}.</small></li>)}</ul>
    <p>En cada corredor puedes abrir las páginas del acta y el adjunto de Gaceta. Se conservan los nombres, horarios y duplicados de la versión del acta que estás consultando.</p>
    {comparison.notices.map(notice => <p className="hint" key={notice}>{notice}</p>)}
    <details><summary>Cómo se compararon los campos</summary><ul>{comparison.normalization.map(item => <li key={item}>{item}</li>)}</ul></details>
  </details>;
}
