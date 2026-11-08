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
  async function readPhoto(file?: File) {
    if (!file) return;
    scan.current?.abort();
    const controller = new AbortController(); scan.current = controller;
    setBusy(true); setMessage('Preparando lector de fotos…');
    try {
      const { scanManifest } = await import('@/lib/manifest-ocr');
      const result = await scanManifest(file, setMessage, controller.signal);
      if (controller.signal.aborted) return;
      setText(result.slice(0, 30000)); setCandidates([]);
      setMessage(result.trim() ? 'Texto leído. Corrige números, calles y nombres antes de preparar las direcciones.' : 'No se pudo leer texto. Usa una foto nítida, sin sombras y con el documento recto.');
    } catch (error) { if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : 'No se pudo leer la foto. Puedes pegar el texto.'); }
    finally { if (scan.current === controller) setBusy(false); }
  }
  return <div className="manifest-import"><button type="button" className="manifest-toggle" aria-expanded={open} onClick={() => setOpen(value => !value)}>▣ {open ? 'Cerrar manifiesto' : 'Escanear o pegar manifiesto'}</button>
    {open && <div className="manifest-body"><h3>Del manifiesto a tus entregas</h3><p>1. Lee la foto o pega el texto. 2. Revisa las direcciones. 3. Confirma cada sucursal antes de añadirla.</p>
      <label className="manifest-file">Elegir foto o tomar una foto<input type="file" accept="image/jpeg,image/png,image/webp,image/bmp" disabled={busy} onChange={event => { void readPhoto(event.target.files?.[0]); event.target.value = ''; }}/></label>
      <p className="hint">La foto se procesa en tu dispositivo. La primera lectura descarga el lector en español y requiere conexión. Para documentos largos, fotografía una sección a la vez.</p>
      {busy && <button type="button" onClick={() => { scan.current?.abort(); setBusy(false); setMessage('Lectura cancelada.'); }}>Cancelar lectura</button>}
      <label>Texto del manifiesto<textarea maxLength={30000} rows={5} value={text} disabled={busy} onChange={event => setText(event.target.value)} placeholder={'Bodega Aurrera Express, calle y número, colonia, ciudad\nOtra dirección o sucursal'}/></label>
      <button type="button" disabled={busy || !text.trim()} onClick={prepare}>Preparar direcciones para revisar</button>
      {message && <p role="status">{message}</p>}
      {!!candidates.length && <><p className="hint">Las direcciones confirmadas se añaden al recorrido; el documento no se guarda. Verifica calle, colonia y acceso de descarga, especialmente si hay varias sucursales con el mismo nombre.</p>
        {candidates.map((candidate, index) => <div className="manifest-candidate" key={candidate.id}><label className="manifest-include"><input type="checkbox" checked={candidate.enabled} onChange={event => setCandidates(rows => rows.map(row => row.id === candidate.id ? { ...row, enabled: event.target.checked } : row))}/> Incluir entrega {index + 1}</label><p>{candidate.value} {candidate.selected && <strong>✓ Confirmada</strong>}</p>{candidate.enabled && <button type="button" className="map-open-button" aria-expanded={activeId === candidate.id} onClick={() => setActiveId(candidate.id)}>{candidate.selected ? 'Revisar punto confirmado' : 'Revisar ubicación'}</button>}{candidate.enabled && activeId === candidate.id && <LocationInput title={`Entrega ${index + 1}`} color="number" apiUrl={apiUrl} value={candidate.value} selected={candidate.selected} mapReference={reference} placeholder="Sucursal, dirección y ciudad" onChange={value => setCandidates(rows => rows.map(row => row.id === candidate.id ? { ...row, value, selected: null } : row))} onConfirm={point => { setCandidates(rows => rows.map(row => row.id === candidate.id ? { ...row, value: point.label, selected: point } : row)); setActiveId(candidates.find(row => row.id !== candidate.id && row.enabled && !row.selected)?.id || candidate.id); }}/>}</div>)}
        <label className="manifest-include"><input type="checkbox" checked={useLast} onChange={event => setUseLast(event.target.checked)}/> Usar la última entrega como destino{hasDestination ? ' (reemplaza el destino actual)' : ''}</label>
        <p role="status">{points.length} de {selected.length} entregas confirmadas. Espacio para {capacity} entregas en este recorrido.</p>
        {selected.length > capacity && <p className="location-search-error">Excluye entregas para respetar el máximo de 8 paradas intermedias y un destino.</p>}
        <button type="button" className="primary-button" disabled={!points.length || points.length !== selected.length || points.length > capacity} onClick={() => { onImport(points, useLast); setCandidates([]); setText(''); setOpen(false); }}>Añadir {points.length} entregas confirmadas</button>
      </>}
    </div>}
  </div>;
}
