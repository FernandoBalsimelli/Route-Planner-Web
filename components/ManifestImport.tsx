'use client';

import React, { useEffect, useRef, useState } from 'react';
import LocationInput from './LocationInput';
import { manifestCandidates } from '@/lib/manifest';
import type { Coordinates, LocationSelection } from '@/lib/locations';
type Candidate = { id: string; value: string; selected: LocationSelection | null; enabled: boolean };

export default function ManifestImport({ apiUrl, reference, remaining, hasDestination, onImport }: { apiUrl: string; reference: Coordinates | null; remaining: number; hasDestination: boolean; onImport: (points: LocationSelection[], useLastAsDestination: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [activeId, setActiveId] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [useLast, setUseLast] = useState(!hasDestination);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [firstPage, setFirstPage] = useState('1');
  const [lastPage, setLastPage] = useState('');
  const [forceOcr, setForceOcr] = useState(false);
  const scan = useRef<AbortController | null>(null);
  useEffect(() => () => scan.current?.abort(), []);
  const selected = candidates.filter(candidate => candidate.enabled);
  const points = selected.flatMap(candidate => candidate.selected && candidate.selected.label === candidate.value ? [candidate.selected] : []);
  const capacity = remaining + (useLast ? 1 : 0);
  function prepare() {
    const lines = manifestCandidates(text);
    const rows = lines.map((value, index) => ({ id: crypto.randomUUID(), value, selected: null, enabled: index < capacity }));
    setCandidates(rows); setActiveId(rows[0]?.id || '');
    setMessage(lines.length ? 'Revisa cada dirección, elige su sucursal y confirma el punto. Puedes excluir encabezados o entregas que no correspondan.' : 'No se encontró texto de direcciones. Toma una foto más clara o pega una entrega por línea.');
  }
  async function readDocument(file?: File) {
    if (!file) return;
    scan.current?.abort();
    const controller = new AbortController(); scan.current = controller;
    setCandidates([]); setActiveId('');
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    setPdfFile(isPdf ? file : null);
    setBusy(true); setMessage(isPdf ? 'Preparando lector de PDF…' : 'Preparando lector de fotos…');
    const progress = (message: string) => { if (!controller.signal.aborted && scan.current === controller) setMessage(message); };
    try {
      let result: string;
      let detail = '';
      if (isPdf) {
        const { readPdfManifest } = await import('@/lib/manifest-pdf');
        const pdf = await readPdfManifest(file, progress, controller.signal, { firstPage: Number(firstPage), lastPage: lastPage.trim() ? Number(lastPage) : undefined, forceOcr });
        result = pdf.text;
        detail = `Páginas leídas: ${pdf.pages.join(', ')} de ${pdf.totalPages}.${pdf.ocrPages.length ? ' OCR en páginas: ' + pdf.ocrPages.join(', ') + '.' : ''} `;
      } else {
        const { scanManifest } = await import('@/lib/manifest-ocr');
        result = await scanManifest(file, progress, controller.signal);
      }
      if (controller.signal.aborted || scan.current !== controller) return;
      setText(result.slice(0, 30000)); setCandidates([]);
      setMessage(detail + (result.trim() ? 'Texto leído. Corrige números, calles y nombres antes de preparar las direcciones.' : 'No se pudo leer texto. Usa una foto nítida o activa OCR para un PDF escaneado.'));
    } catch (error) { if (!controller.signal.aborted && scan.current === controller) setMessage(error instanceof Error ? error.message : 'No se pudo leer el documento. Puedes pegar el texto.'); }
    finally { if (scan.current === controller) setBusy(false); }
  }
  return <div className="manifest-import"><button type="button" className="manifest-toggle" aria-expanded={open} onClick={() => { if (open) { scan.current?.abort(); setBusy(false); setPdfFile(null); } setOpen(value => !value); }}>▣ {open ? 'Cerrar manifiesto' : 'Escanear o pegar manifiesto'}</button>
    {open && <div className="manifest-body"><h3>Del manifiesto a tus entregas</h3><p>1. Lee una foto, un PDF o pega el texto. 2. Revisa las direcciones. 3. Confirma cada sucursal antes de añadirla.</p>
      <label className="manifest-file">Elegir foto o PDF<input type="file" accept="image/jpeg,image/png,image/webp,image/bmp,application/pdf,.pdf" disabled={busy} onChange={event => { void readDocument(event.target.files?.[0]); event.target.value = ''; }}/></label>
      {pdfFile && <details className="manifest-pdf-options"><summary>Páginas del PDF</summary><p>Hasta 10 páginas por lectura y 20 MB. Deja la última página vacía para leer hasta el final. Para un documento largo, selecciona un rango y prepara un recorrido por sección.</p><div className="manifest-page-range"><label>Primera página<input type="number" min="1" step="1" value={firstPage} disabled={busy} onChange={event => setFirstPage(event.target.value)}/></label><label>Última página (opcional)<input type="number" min="1" step="1" value={lastPage} disabled={busy} onChange={event => setLastPage(event.target.value)}/></label></div><label className="manifest-include"><input type="checkbox" checked={forceOcr} disabled={busy} onChange={event => setForceOcr(event.target.checked)}/>Usar OCR en todas las páginas seleccionadas</label><button type="button" disabled={busy} onClick={() => void readDocument(pdfFile)}>Volver a leer el PDF</button></details>}
      <p className="hint">La foto o PDF se procesa en tu dispositivo y no se sube al servidor. Las páginas sin texto usan OCR; su primera lectura descarga el lector en español y requiere conexión. Revisa las tablas y cada dirección antes de importar.</p>
      {busy && <button type="button" onClick={() => { scan.current?.abort(); setBusy(false); setMessage('Lectura cancelada.'); }}>Cancelar lectura</button>}
      <label>Texto del manifiesto<textarea maxLength={30000} rows={5} value={text} disabled={busy} onChange={event => { setText(event.target.value); setCandidates([]); setActiveId(''); }} placeholder={'Bodega Aurrera Express, calle y número, colonia, ciudad\nOtra dirección o sucursal'}/></label>
      <button type="button" disabled={busy || !text.trim()} onClick={prepare}>Preparar direcciones para revisar</button>
      {message && <p role="status">{message}</p>}
      {!!candidates.length && <><p className="hint">Las direcciones confirmadas se añaden al recorrido; el documento no se guarda. Verifica calle, colonia y acceso de descarga, especialmente si hay varias sucursales con el mismo nombre.</p>
        {candidates.map((candidate, index) => <div className="manifest-candidate" key={candidate.id}><label className="manifest-include"><input type="checkbox" checked={candidate.enabled} onChange={event => setCandidates(rows => rows.map(row => row.id === candidate.id ? { ...row, enabled: event.target.checked } : row))}/> Incluir entrega {index + 1}</label><p>{candidate.value} {candidate.selected && <strong>✓ Confirmada</strong>}</p>{candidate.enabled && <button type="button" className="map-open-button" aria-expanded={activeId === candidate.id} onClick={() => setActiveId(candidate.id)}>{candidate.selected ? 'Revisar punto confirmado' : 'Revisar ubicación'}</button>}{candidate.enabled && activeId === candidate.id && <LocationInput title={`Entrega ${index + 1}`} color="number" apiUrl={apiUrl} value={candidate.value} selected={candidate.selected} mapReference={reference} placeholder="Sucursal, dirección y ciudad" onChange={value => setCandidates(rows => rows.map(row => row.id === candidate.id ? { ...row, value, selected: null } : row))} onConfirm={point => { setCandidates(rows => rows.map(row => row.id === candidate.id ? { ...row, value: point.label, selected: point } : row)); setActiveId(candidates.find(row => row.id !== candidate.id && row.enabled && !row.selected)?.id || candidate.id); }}/>}</div>)}
        <label className="manifest-include"><input type="checkbox" checked={useLast} onChange={event => setUseLast(event.target.checked)}/> Usar la última entrega como destino{hasDestination ? ' (reemplaza el destino actual)' : ''}</label>
        <p role="status">{points.length} de {selected.length} entregas confirmadas. Espacio para {capacity} entregas en este recorrido.</p>
        {selected.length > capacity && <p className="location-search-error">Excluye entregas para respetar el máximo de 8 paradas intermedias y un destino.</p>}
        <button type="button" className="primary-button" disabled={!points.length || points.length !== selected.length || points.length > capacity} onClick={() => { onImport(points, useLast); setCandidates([]); setText(''); setPdfFile(null); setOpen(false); }}>Añadir {points.length} entregas confirmadas</button>
      </>}
    </div>}
  </div>;
}
