'use client';

import { MAX_INTERMEDIATE_STOPS } from '@/lib/route-limits';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import LocationInput from './LocationInput';
import { manifestCandidates } from '@/lib/manifest';
import { manifestPointConfirmed, manifestReuseChoices, nextManifestReviewId, nearbyManifestLocations, repeatedManifestLines } from '@/lib/manifest-review';
import { manifestMapPoint, type ManifestMapSearch, type ManifestMapSelection } from '@/lib/manifest-map';
import type { Coordinates, LocationSelection } from '@/lib/locations';
type Candidate = { id: string; sourceValue: string; value: string; selected: LocationSelection | null; enabled: boolean };

export default function ManifestImport({ apiUrl, reference, remaining, hasDestination, onImport, active = true, onMapSearch, mapSelection }: { apiUrl: string; reference: Coordinates | null; remaining: number; hasDestination: boolean; onImport: (points: LocationSelection[], useLastAsDestination: boolean) => void; active?: boolean; onMapSearch?: (search: ManifestMapSearch | null) => void; mapSelection?: ManifestMapSelection }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [activeId, setActiveId] = useState('');
  const [independentReviewId, setIndependentReviewId] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [useLast, setUseLast] = useState(!hasDestination);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [firstPage, setFirstPage] = useState('1');
  const [lastPage, setLastPage] = useState('');
  const [forceOcr, setForceOcr] = useState(false);
  const scan = useRef<AbortController | null>(null);
  const candidateNodes = useRef(new Map<string, HTMLDivElement>());
  const [reviewRequest, setReviewRequest] = useState<{ id: string; finish?: boolean } | null>(null);
  const importButton = useRef<HTMLButtonElement>(null);
  const mapRequest = useRef<ManifestMapSearch | null>(null);
  const mapCallback = useRef(onMapSearch); mapCallback.current = onMapSearch;
  const activeCandidate = candidates.find(row => row.id === activeId);
  function clearMap() { mapRequest.current = null; mapCallback.current?.(null); }
  function reviewTarget(id: string) {
    const row = candidateNodes.current.get(id);
    return row?.querySelector<HTMLElement>('input[role="combobox"]') || row?.querySelector<HTMLElement>('button[data-manifest-reuse]');
  }
  function confirmCandidate(id: string, point: LocationSelection) {
    const updated = candidates.map(row => row.id === id ? { ...row, value: point.label, selected: point } : row);
    setCandidates(updated);
    const next = nextManifestReviewId(updated, id);
    setActiveId(next || id);
    setIndependentReviewId('');
    setReviewRequest({ id: next || id, finish: !next });
    clearMap();
  }
  useEffect(() => {
    clearMap();
    return clearMap;
  }, [open, active, activeId, activeCandidate?.value, activeCandidate?.enabled, activeCandidate?.selected, reference?.lat, reference?.lng]);
  useEffect(() => {
    if (!mapSelection) return;
    const point = manifestMapPoint(mapRequest.current, mapSelection, candidates, activeId, open && active);
    if (point) confirmCandidate(activeId, point);
  }, [mapSelection]);
  useEffect(() => {
    if (open && active) reviewTarget(activeId)?.focus({ preventScroll: true });
  }, [open, active, activeId]);
  useEffect(() => () => scan.current?.abort(), []);
  useEffect(() => {
    if (!reviewRequest) return;
    const input = reviewTarget(reviewRequest.id);
    const target = reviewRequest.finish && importButton.current && !importButton.current.disabled ? importButton.current : input;
    target?.focus({ preventScroll: true });
    target?.scrollIntoView?.({ block: 'center', behavior: 'instant' });
  }, [reviewRequest]);
  const selected = candidates.filter(candidate => candidate.enabled);
  const points = selected.flatMap(candidate => manifestPointConfirmed(candidate) && candidate.selected ? [candidate.selected] : []);
  const pendingId = nextManifestReviewId(candidates);
  const pendingPosition = candidates.findIndex(row => row.id === pendingId) + 1;
  const reuseChoices = manifestReuseChoices(candidates, activeId);
  const capacity = remaining + (useLast ? 1 : 0);
  const repeatedLines = useMemo(() => repeatedManifestLines(candidates.map(row => row.sourceValue)), [candidates]);
  const nearbyPairs = useMemo(() => nearbyManifestLocations(candidates), [candidates]);
  function prepare() {
    const lines = manifestCandidates(text);
    const rows = lines.map((value, index) => ({ id: crypto.randomUUID(), sourceValue: value, value, selected: null, enabled: index < capacity }));
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
  return <div className="manifest-import"><button type="button" className="manifest-toggle" aria-expanded={open} onClick={() => { if (open) { clearMap(); scan.current?.abort(); setBusy(false); setPdfFile(null); } setOpen(value => !value); }}>▣ {open ? 'Cerrar manifiesto' : 'Escanear o pegar manifiesto'}</button>
    {open && <div className="manifest-body"><h3>Del manifiesto a tus entregas</h3><p>1. Lee una foto, un PDF o pega el texto. 2. Revisa las direcciones. 3. Confirma cada sucursal antes de añadirla.</p>{onMapSearch && <p className="hint">Las sugerencias de la entrega activa también aparecen en el mapa central. Elige su marcador y confirma; las entregas se añaden al recorrido sólo al terminar la revisión.</p>}
      <div className="manifest-document-choices"><label className="manifest-file manifest-photo-file">Elegir foto o tomar una foto<input type="file" accept="image/jpeg,image/png,image/webp,image/bmp" disabled={busy} onChange={event => { void readDocument(event.target.files?.[0]); event.target.value = ''; }}/></label><label className="manifest-file manifest-pdf-file">Elegir PDF<input type="file" accept="application/pdf,.pdf" disabled={busy} onChange={event => { void readDocument(event.target.files?.[0]); event.target.value = ''; }}/></label></div>
      {pdfFile && <details className="manifest-pdf-options"><summary>Páginas del PDF</summary><p>Hasta 10 páginas por lectura y 20 MB. Deja la última página vacía para leer hasta el final. Para un documento largo, selecciona un rango y prepara un recorrido por sección.</p><div className="manifest-page-range"><label>Primera página<input type="number" min="1" step="1" value={firstPage} disabled={busy} onChange={event => setFirstPage(event.target.value)}/></label><label>Última página (opcional)<input type="number" min="1" step="1" value={lastPage} disabled={busy} onChange={event => setLastPage(event.target.value)}/></label></div><label className="manifest-include"><input type="checkbox" checked={forceOcr} disabled={busy} onChange={event => setForceOcr(event.target.checked)}/>Usar OCR en todas las páginas seleccionadas</label><button type="button" disabled={busy} onClick={() => void readDocument(pdfFile)}>Volver a leer el PDF</button></details>}
      <p className="hint">La foto o PDF se procesa en tu dispositivo y no se sube al servidor. Las páginas sin texto usan OCR; su primera lectura descarga el lector en español y requiere conexión. Revisa las tablas y cada dirección antes de importar.</p>
      {busy && <button type="button" onClick={() => { scan.current?.abort(); setBusy(false); setMessage('Lectura cancelada.'); }}>Cancelar lectura</button>}
      <label>Texto del manifiesto<textarea maxLength={30000} rows={5} value={text} disabled={busy} onChange={event => { setText(event.target.value); setCandidates([]); setActiveId(''); }} placeholder={'Bodega Aurrera Express, calle y número, colonia, ciudad\nOtra dirección o sucursal'}/></label>
      <button type="button" disabled={busy || !text.trim()} onClick={prepare}>Preparar direcciones para revisar</button>
      {message && <p role="status">{message}</p>}
      {!!candidates.length && <><p className="hint">Las direcciones confirmadas se añaden al recorrido; el documento no se guarda. Verifica calle, colonia y acceso de descarga, especialmente si hay varias sucursales con el mismo nombre.</p>
        <div className="manifest-review-progress" role="region" aria-label="Avance de revisión del manifiesto">
          <p role="status"><strong>{points.length} de {selected.length} confirmadas</strong> · {selected.length - points.length} pendientes{candidates.length > selected.length ? ` · ${candidates.length - selected.length} excluidas` : ''}</p>
          <progress aria-label="Entregas corroboradas del manifiesto" max={Math.max(1, selected.length)} value={points.length}/>
          {pendingId ? <button type="button" className="map-open-button" onClick={() => { setActiveId(pendingId); setReviewRequest({ id: pendingId }); }}>Revisar entrega {pendingPosition} pendiente</button> : <p>{selected.length ? 'Revisión completa. Comprueba el orden y pulsa Añadir para incorporarlas.' : 'Incluye al menos una entrega para revisar.'}</p>}
        </div>
        {repeatedLines.length > 0 && <div className="manifest-review-notice" role="status" aria-label="Texto repetido en el manifiesto"><strong>Hay direcciones escritas más de una vez</strong><p>Conservamos cada entrega y su orden. Pueden ser pedidos distintos; excluye sólo las filas que no correspondan.</p><ul>{repeatedLines.slice(0, 5).map(group => <li key={group[0]}>Entregas {group.length > 8 ? `${group.slice(0, 8).join(', ')} y ${group.length - 8} más` : group.join(', ')}: mismo texto.</li>)}</ul>{repeatedLines.length > 5 && <p>Hay {repeatedLines.length - 5} grupos adicionales de texto repetido.</p>}</div>}
        {candidates.map((candidate, index) => <div className="manifest-candidate" key={candidate.id} ref={node => { if (node) candidateNodes.current.set(candidate.id, node); else candidateNodes.current.delete(candidate.id); }}><label className="manifest-include"><input type="checkbox" checked={candidate.enabled} onChange={event => setCandidates(rows => rows.map(row => row.id === candidate.id ? { ...row, enabled: event.target.checked } : row))}/> Incluir entrega {index + 1}</label>
          <dl className="manifest-comparison"><div><dt>Texto preparado del manifiesto</dt><dd>{candidate.sourceValue}</dd></div><div><dt>{manifestPointConfirmed(candidate) ? 'Punto confirmado' : 'Ubicación por corroborar'}</dt><dd>{candidate.value}</dd></div></dl>
          <p>{!candidate.enabled ? 'Excluida del recorrido' : manifestPointConfirmed(candidate) ? <strong>✓ Confirmada</strong> : 'Pendiente de confirmación'}</p>
          {candidate.enabled && <button type="button" className="map-open-button" aria-expanded={activeId === candidate.id} onClick={() => { setActiveId(candidate.id); setReviewRequest({ id: candidate.id }); }}>{manifestPointConfirmed(candidate) ? 'Revisar punto confirmado' : 'Revisar ubicación'}</button>}
          {candidate.enabled && activeId === candidate.id && reuseChoices.length > 0 && <div className="manifest-reuse" role="region" aria-label={`Puntos anteriores para entrega ${index + 1}`}>
            <strong>Este texto ya fue corroborado antes</strong><p>Comprueba que sea la misma sucursal y acceso. Confirmar aquí conserva ambas entregas y su orden; no añade nada al recorrido todavía.</p>
            {reuseChoices.length > 1 && <p>Hay puntos distintos para el mismo texto. Elige el correcto o busca otro.</p>}
            {reuseChoices.map(choice => <div key={choice.position}><p><b>Entrega {choice.position}:</b> {choice.point.label}<small>{choice.point.lat}, {choice.point.lng}</small></p><button type="button" className="map-open-button" data-manifest-reuse onClick={() => confirmCandidate(candidate.id, { ...choice.point })}>Confirmar punto de entrega {choice.position}</button></div>)}
            {independentReviewId !== candidate.id && <button type="button" className="text-button" onClick={() => { setIndependentReviewId(candidate.id); setReviewRequest({ id: candidate.id }); }}>Buscar o ajustar otro punto</button>}
          </div>}
          {candidate.enabled && activeId === candidate.id && (!reuseChoices.length || independentReviewId === candidate.id) && <LocationInput key={`${candidate.id}-${reference?.lat}-${reference?.lng}`} title={`Entrega ${index + 1}`} color="number" apiUrl={apiUrl} value={candidate.value} selected={candidate.selected} mapReference={reference} placeholder="Sucursal, dirección y ciudad" onChange={value => setCandidates(rows => rows.map(row => row.id === candidate.id ? { ...row, value, selected: null } : row))} onSuggestions={onMapSearch ? locations => {
          if (!open || !active || candidate.id !== activeId || !candidate.enabled) return;
          if (!locations.length) { clearMap(); return; }
          const search = { requestId: crypto.randomUUID(), candidateId: candidate.id, value: candidate.value, title: `Entrega ${index + 1} del manifiesto`, points: locations };
          mapRequest.current = search; mapCallback.current?.(search);
        } : undefined} onConfirm={point => confirmCandidate(candidate.id, point)}/>}</div>)}
        <label className="manifest-include"><input type="checkbox" checked={useLast} onChange={event => setUseLast(event.target.checked)}/> Usar la última entrega como destino{hasDestination ? ' (reemplaza el destino actual)' : ''}</label>
        {nearbyPairs.length > 0 && <div className="manifest-review-notice" role="status" aria-label="Puntos cercanos entre entregas"><strong>Revisa estos puntos confirmados</strong><p>Están a 10 m o menos en línea recta. No significa que sean la misma sucursal ni un error; comprueba que cada pedido corresponda al acceso elegido. No eliminamos ninguna entrega.</p><ul>{nearbyPairs.slice(0, 6).map(pair => <li key={`${pair.first}-${pair.second}`}>Entregas {pair.first} y {pair.second}: {pair.distanceMeters < 1 ? 'puntos prácticamente coincidentes' : `${Math.ceil(pair.distanceMeters)} m entre puntos`}. <button type="button" className="map-open-button" onClick={() => { const id = candidates[pair.second - 1].id; setActiveId(id); setReviewRequest({ id }); }}>Revisar entrega {pair.second}</button></li>)}</ul>{nearbyPairs.length > 6 && <p>Hay {nearbyPairs.length - 6} pares cercanos adicionales. Revisa también las demás entregas confirmadas.</p>}</div>}
        <p role="status">{points.length} de {selected.length} entregas confirmadas. Espacio para {capacity} entregas en este recorrido.</p>
        {selected.length > capacity && <p className="location-search-error">Excluye entregas para respetar el máximo de {MAX_INTERMEDIATE_STOPS} paradas intermedias y un destino.</p>}
        <button type="button" ref={importButton} className="primary-button" disabled={!points.length || points.length !== selected.length || points.length > capacity} onClick={() => { onImport(points, useLast); setCandidates([]); setText(''); setPdfFile(null); setOpen(false); }}>Añadir {points.length} entregas confirmadas</button>
      </>}
    </div>}
  </div>;
}
