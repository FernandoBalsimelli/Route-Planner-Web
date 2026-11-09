// OCR text is a proposal, never a geocoded/confirmed stop.
export function manifestCandidates(text: string): string[] {
  const lines = text.slice(0, 30000).split(/\r?\n/).map(line => line.replace(/[\t|]+/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean);
  const candidates: string[] = [];
  let block = '';
  let hasAddress = false;
  const flush = () => { if (block.length >= 4) candidates.push(block.slice(0, 180)); block = ''; hasAddress = false; };
  for (const line of lines) {
    if (/^manifiesto\b|^(fecha|folio|operador|chofer|placas|total|p[aá]gina|cantidad|producto|peso|firma)\s*[:#\d\-]|^(direcci[oó]n|destinatario|cliente|entregas?)\s*:?$/i.test(line)) continue;
    const isStore = /\b(bodega\s+aurrer[aá]|express|sucursal|tienda)\b/i.test(line);
    const isAddress = /^(calle|c\.|av\.?|avenida|blvd\.?|boulevard|carretera|carr\.?|privada|prolongaci[oó]n|libramiento)\b/i.test(line);
    const isContinuation = /^(col\.?|colonia|fracc\.?|fraccionamiento|c\.?p\.?|c[oó]digo postal)\b/i.test(line);
    if (isStore) { flush(); block = line; hasAddress = line.includes(',') && /\d/.test(line); }
    else if ((isAddress && block && /\b(bodega|express|sucursal|tienda)\b/i.test(block) && !hasAddress) || (isContinuation && block) || (hasAddress && /^[\p{L}\s.]+,[\p{L}\s.,]+$/u.test(line))) { block += ', ' + line; hasAddress = true; }
    else { flush(); block = line; hasAddress = isAddress; }
  }
  flush();
  return [...new Set(candidates)];
}
