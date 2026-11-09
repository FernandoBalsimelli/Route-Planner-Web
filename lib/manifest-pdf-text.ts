type TextItem = { str: string; transform?: number[]; width?: number; hasEOL?: boolean };

// Respect PDF line boundaries; concatenating every item loses delivery addresses.
export function pdfTextLines(items: Array<TextItem | object>): string {
  const lines: string[] = [];
  let line = '', lastY: number | undefined, lastEnd: number | undefined;
  for (const item of items) {
    if (!('str' in item) || typeof item.str !== 'string') continue;
    const textItem = item as TextItem;
    const y = textItem.transform?.[5];
    if (line && lastY !== undefined && y !== undefined && Math.abs(lastY - y) > 3) {
      lines.push(line.trim()); line = ''; lastEnd = undefined;
    }
    const x = textItem.transform?.[4];
    const gap = x !== undefined && lastEnd !== undefined ? x - lastEnd : undefined;
    const separator = line && !/\s$/.test(line) && !/^\s/.test(textItem.str) && (gap === undefined || gap > 1) ? ' ' : '';
    line += separator + textItem.str;
    lastY = y;
    lastEnd = x !== undefined && textItem.width !== undefined ? x + textItem.width : undefined;
    if (textItem.hasEOL) { lines.push(line.trim()); line = ''; lastY = undefined; lastEnd = undefined; }
  }
  if (line.trim()) lines.push(line.trim());
  return lines.filter(Boolean).join('\n');
}

export function pdfPageRange(total: number, first = 1, last = total): number[] {
  if (!Number.isInteger(first) || !Number.isInteger(last) || first < 1 || last < first || last > total) {
    throw new Error(`El PDF tiene ${total} páginas. Elige un rango válido entre 1 y ${total}.`);
  }
  if (last - first + 1 > 10) throw new Error(`El PDF tiene ${total} páginas. Elige hasta 10 páginas por lectura en «Páginas del PDF».`);
  return Array.from({ length: last - first + 1 }, (_, index) => first + index);
}
